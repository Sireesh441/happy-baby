"use strict";

// Local dev-time product catalog import. Run with:
//   node scripts/import-products.js
// (from the project root -- NOT a web-based admin feature, since Vercel's
// serverless filesystem is ephemeral and can't hold /product-import or
// persist writes to public/products).
//
// Reuses this project's actual Prisma schema (via a second, CommonJS-output
// generator -- see the `scriptsClient` block in prisma/schema.prisma; the
// app's own generator emits TypeScript source meant for a bundler, which a
// plain `node` script can't require directly) and the same category/emoji
// /color metadata the admin panel and product API already use
// (app/data/products.ts), so none of that is duplicated here.

const path = require("node:path");
const fs = require("node:fs");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(".env.local") });

const ExcelJS = require("exceljs");
const { v2: cloudinary } = require("cloudinary");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../lib/generated/prisma-cjs");
const { getCategoryMeta } = require("../app/data/products.ts");

const PRODUCT_IMPORT_DIR = path.join(__dirname, "..", "product-import");
const PRODUCT_IMPORT_IMAGES_DIR = path.join(PRODUCT_IMPORT_DIR, "images");
const PRODUCTS_XLSX_PATH = path.join(PRODUCT_IMPORT_DIR, "products.xlsx");

const VALID_VERTICALS = ["kids", "men", "women"];
const VALID_TAGS = ["Bestseller", "New", "Sale"];
const REQUIRED_COLUMNS = ["vertical", "category", "product_name", "description", "price", "sizes_and_quantity"];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (checked .env.local).");
  process.exit(1);
}

const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
const hasCloudinaryParts =
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

if (!hasCloudinaryUrl && !hasCloudinaryParts) {
  console.error(
    "Missing Cloudinary credentials. Set CLOUDINARY_URL, or all three of " +
      "CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET, in .env.local."
  );
  process.exit(1);
}

// If CLOUDINARY_URL is set the SDK already auto-configured itself from it
// when required above; calling .config() again here with the separate
// (unset) vars would stomp that with undefined values.
if (!hasCloudinaryUrl) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function cellString(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("").trim();
    if ("result" in value) return String(value.result ?? "").trim();
    if ("text" in value) return String(value.text ?? "").trim();
  }
  return String(value).trim();
}

function cellNumber(value) {
  const str = cellString(value);
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

// "S:10,M:15,L:5,XL:0" -> [{ size: "S", quantity: 10, available: true }, ...].
// "ONE:QTY" works the same way for non-sized items -- "ONE" is just treated
// as this product's only size, nothing special-cased.
// Returns null (not a throw) on malformed input so the caller can report it
// as a per-row error and keep processing the rest of the sheet.
function parseSizesAndQuantity(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const sizes = [];
  for (const part of trimmed.split(",")) {
    const [sizeRaw, qtyRaw] = part.split(":");
    if (sizeRaw === undefined || qtyRaw === undefined) return null;

    const size = sizeRaw.trim();
    const quantity = Number((qtyRaw || "").trim());
    if (!size || !Number.isInteger(quantity) || quantity < 0) return null;

    sizes.push({ size, quantity, available: quantity > 0 });
  }
  return sizes;
}

// Uploads to Cloudinary rather than a hard error if the file is missing --
// a missing image shouldn't block the rest of a row's product data from
// importing, so this surfaces as a warning instead.
async function uploadImageToCloudinary(filename, vertical) {
  const sourcePath = path.join(PRODUCT_IMPORT_IMAGES_DIR, filename);
  if (!fs.existsSync(sourcePath)) {
    return { url: null, warning: `Image "${filename}" was not found in /product-import/images.` };
  }

  const publicId = path.parse(filename).name;
  const result = await cloudinary.uploader.upload(sourcePath, {
    folder: `happy-baby/products/${vertical}`,
    public_id: publicId,
    overwrite: true,
  });
  return { url: result.secure_url };
}

async function importProducts() {
  const summary = { created: 0, updated: 0, errors: [], warnings: [] };

  if (!fs.existsSync(PRODUCTS_XLSX_PATH)) {
    summary.errors.push({ row: 0, message: "Could not find /product-import/products.xlsx." });
    return summary;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(PRODUCTS_XLSX_PATH);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    summary.errors.push({ row: 0, message: "The workbook has no worksheets." });
    return summary;
  }

  const columnIndex = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const key = cellString(cell.value).toLowerCase().replace(/\s+/g, "_");
    if (key) columnIndex[key] = colNumber;
  });

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !(column in columnIndex));
  if (missingColumns.length > 0) {
    summary.errors.push({ row: 1, message: `Missing required column(s): ${missingColumns.join(", ")}` });
    return summary;
  }

  const get = (row, key) => (columnIndex[key] ? row.getCell(columnIndex[key]).value : null);

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const productName = cellString(get(row, "product_name"));
    if (!productName) continue; // skip blank rows

    try {
      const verticalRaw = cellString(get(row, "vertical")).toLowerCase();
      if (!VALID_VERTICALS.includes(verticalRaw)) {
        summary.errors.push({
          row: rowNumber,
          productName,
          message: `Invalid vertical "${verticalRaw}" -- must be one of ${VALID_VERTICALS.join(", ")}.`,
        });
        continue;
      }
      const vertical = verticalRaw;

      const categoryRaw = cellString(get(row, "category"));
      const categoryMeta = getCategoryMeta(categoryRaw, vertical);
      if (!categoryMeta) {
        summary.errors.push({
          row: rowNumber,
          productName,
          message: `Unknown category "${categoryRaw}" for vertical "${vertical}".`,
        });
        continue;
      }

      const description = cellString(get(row, "description"));
      const price = cellNumber(get(row, "price"));
      if (!description || price === null || price <= 0) {
        summary.errors.push({ row: rowNumber, productName, message: "Missing or invalid description/price." });
        continue;
      }

      const discountPrice = cellNumber(get(row, "discount_price"));
      const hasDiscount = discountPrice !== null && discountPrice > 0 && discountPrice < price;

      const sizesRaw = cellString(get(row, "sizes_and_quantity"));
      const sizes = parseSizesAndQuantity(sizesRaw);
      if (sizes === null) {
        summary.errors.push({
          row: rowNumber,
          productName,
          message: `Invalid sizes_and_quantity "${sizesRaw}" -- expected "SIZE:QTY,SIZE:QTY".`,
        });
        continue;
      }

      const inStock = sizes.length === 0 || sizes.some((entry) => entry.quantity > 0);
      const totalStock = sizes.reduce((sum, entry) => sum + entry.quantity, 0);

      const tagRaw = cellString(get(row, "tag"));
      let tag = null;
      if (tagRaw) {
        if (VALID_TAGS.includes(tagRaw)) {
          tag = tagRaw;
        } else {
          summary.warnings.push({ row: rowNumber, productName, message: `Unknown tag "${tagRaw}" -- ignored.` });
        }
      }

      const imageFilename = cellString(get(row, "image_filename"));
      let image = null;
      if (imageFilename) {
        const uploaded = await uploadImageToCloudinary(imageFilename, vertical);
        image = uploaded.url;
        if (uploaded.warning) {
          summary.warnings.push({ row: rowNumber, productName, message: uploaded.warning });
        }
      }

      const sharedData = {
        description,
        price: hasDiscount ? discountPrice : price,
        originalPrice: hasDiscount ? price : null,
        category: categoryMeta.name,
        emoji: categoryMeta.emoji,
        color: categoryMeta.color,
        stock: totalStock,
        sizes,
        inStock,
        tag,
      };

      const existing = await prisma.product.findFirst({ where: { name: productName, vertical } });

      if (existing) {
        // Only overwrite the image if this row actually resolved one --
        // otherwise leave whatever image the product already has.
        await prisma.product.update({
          where: { id: existing.id },
          data: { ...sharedData, ...(image ? { image } : {}) },
        });
        summary.updated++;
      } else {
        await prisma.product.create({
          data: { ...sharedData, name: productName, vertical, image },
        });
        summary.created++;
      }
    } catch (err) {
      summary.errors.push({
        row: rowNumber,
        productName,
        message: err instanceof Error ? err.message : "Unknown error.",
      });
    }
  }

  return summary;
}

async function main() {
  const summary = await importProducts();

  console.log(`\nCreated: ${summary.created}`);
  console.log(`Updated: ${summary.updated}`);

  if (summary.warnings.length > 0) {
    console.log(`\nWarnings (${summary.warnings.length}):`);
    for (const warning of summary.warnings) {
      console.log(`  Row ${warning.row} (${warning.productName}): ${warning.message}`);
    }
  }

  if (summary.errors.length > 0) {
    console.log(`\nErrors (${summary.errors.length}):`);
    for (const error of summary.errors) {
      console.log(`  Row ${error.row}${error.productName ? ` (${error.productName})` : ""}: ${error.message}`);
    }
  }

  await prisma.$disconnect();
  process.exit(summary.errors.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("Import failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
