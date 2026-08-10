"use strict";

// Local dev-time product catalog import. Run with:
//   node scripts/import-products.js
//   node scripts/import-products.js path/to/other-workbook.xlsx   (optional override, mainly for testing)
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
//
// Expected worksheet columns (header row, case-insensitive, spaces or
// underscores both fine):
//   Required on every row:
//     vertical, category, product_name, description, price, sizes_and_quantity
//   Optional, per row:
//     discount_price, tag, image_filename
//     parent_sku  -- shared across rows that are color variants of the same
//                    item. Rows sharing a parent_sku are grouped into one
//                    ProductGroup (Amazon-style color swatches); a blank
//                    parent_sku imports as a standalone ungrouped product,
//                    same as before this column existed.
//     color       -- this row's own variant color (e.g. "Blue Stripes"),
//                    stored on the product as `variantColor`. Meaningful for
//                    any row, grouped or not.
//     subcategory -- only meaningful when category is "Clothing"; must be
//                    one of CLOTHING_SUBCATEGORIES[vertical] from
//                    app/data/products.ts (e.g. kids: Onesies, T-shirts,
//                    Bottoms, Sleepwear, Outerwear). An unknown value on a
//                    Clothing row is a hard error (same treatment as an
//                    unknown category); a non-blank value on a non-Clothing
//                    row is ignored with a warning rather than an error,
//                    since subcategory simply doesn't apply there. Blank is
//                    always fine (subcategory is optional even for
//                    Clothing).
//   Optional, group-level (only read from the FIRST row of a given
//   parent_sku -- see "Variant grouping" below for why):
//     bulk_pack5_price, bulk_pack10_price
//                    -- explicit wholesale per-unit price override for that
//                       group's 5-pack / 10-pack. Either or both may be left
//                       blank, in which case that pack size keeps the
//                       computed default (~15%/20% off retail -- see
//                       lib/bulkPricing.ts). These only apply to grouped
//                       rows; a parent_sku is required for them to do
//                       anything.
//
// Variant grouping: the group's shared info (name/vertical/category/
// description, and any bulk_pack5_price/bulk_pack10_price) is taken from
// whichever row is the FIRST one carrying a given parent_sku, in top-to-
// bottom sheet order -- later rows for the same parent_sku only contribute
// their own product data (name, color, price, sizes, image), not group
// data. A ProductGroup is matched across separate runs of this script by
// parent_sku (stored as ProductGroup.sku) -- re-running the import against
// an unchanged sheet updates the same group and its variants rather than
// creating duplicates.

const path = require("node:path");
const fs = require("node:fs");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(".env.local") });

const ExcelJS = require("exceljs");
const { v2: cloudinary } = require("cloudinary");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../lib/generated/prisma-cjs");
const { getCategoryMeta, isValidClothingSubcategory } = require("../app/data/products.ts");

const PRODUCT_IMPORT_DIR = path.join(__dirname, "..", "product-import");
const PRODUCT_IMPORT_IMAGES_DIR = path.join(PRODUCT_IMPORT_DIR, "images");
// Optional CLI override (`node scripts/import-products.js path/to.xlsx`) --
// mainly so this script can be tested against a throwaway workbook without
// ever touching the real, gitignored product-import/products.xlsx.
const PRODUCTS_XLSX_PATH = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(PRODUCT_IMPORT_DIR, "products.xlsx");

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
  const summary = { created: 0, updated: 0, groupsCreated: 0, groupsUpdated: 0, errors: [], warnings: [] };

  if (!fs.existsSync(PRODUCTS_XLSX_PATH)) {
    summary.errors.push({ row: 0, message: `Could not find ${PRODUCTS_XLSX_PATH}.` });
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

  // parent_sku -> ProductGroup id, populated the first time each parent_sku
  // is seen in this run. Rows sharing a parent_sku after that just look
  // their group id up here instead of touching the group again.
  const groupCache = new Map();
  // parent_sku -> the { vertical, bulk5, bulk10 } that its first row
  // established, purely so later rows for the same group can warn if they
  // disagree (their own values are otherwise ignored, per the "first row
  // wins" rule for group-level data).
  const groupFirstRowInfo = new Map();

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

      const subcategoryRaw = cellString(get(row, "subcategory"));
      let subcategory = null;
      if (subcategoryRaw) {
        if (categoryMeta.name === "Clothing") {
          if (isValidClothingSubcategory(vertical, subcategoryRaw)) {
            subcategory = subcategoryRaw;
          } else {
            summary.errors.push({
              row: rowNumber,
              productName,
              message: `Unknown subcategory "${subcategoryRaw}" for vertical "${vertical}" Clothing.`,
            });
            continue;
          }
        } else {
          summary.warnings.push({
            row: rowNumber,
            productName,
            message: `subcategory "${subcategoryRaw}" ignored -- only applies to category "Clothing".`,
          });
        }
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

      // --- Variant grouping ---
      const parentSku = cellString(get(row, "parent_sku"));
      const colorRaw = cellString(get(row, "color"));
      let productGroupId = null;

      if (parentSku) {
        if (groupCache.has(parentSku)) {
          productGroupId = groupCache.get(parentSku);

          const firstRowInfo = groupFirstRowInfo.get(parentSku);
          if (firstRowInfo && firstRowInfo.vertical !== vertical) {
            summary.warnings.push({
              row: rowNumber,
              productName,
              message: `parent_sku "${parentSku}" was first seen with vertical "${firstRowInfo.vertical}" (row ${firstRowInfo.row}) -- this row's vertical "${vertical}" is ignored for the group, but still used for this product.`,
            });
          }
          const pack5Conflict = cellNumber(get(row, "bulk_pack5_price"));
          const pack10Conflict = cellNumber(get(row, "bulk_pack10_price"));
          if (
            (pack5Conflict !== null || pack10Conflict !== null) &&
            (pack5Conflict !== firstRowInfo?.pack5 || pack10Conflict !== firstRowInfo?.pack10)
          ) {
            summary.warnings.push({
              row: rowNumber,
              productName,
              message: `bulk_pack5_price/bulk_pack10_price on this row are ignored -- only the group's first row (row ${firstRowInfo?.row}) sets them.`,
            });
          }
        } else {
          // This is the first row seen for this parent_sku -- it defines
          // the group's shared info.
          const pack5 = cellNumber(get(row, "bulk_pack5_price"));
          const pack10 = cellNumber(get(row, "bulk_pack10_price"));
          let bulkPricing = null;
          if (pack5 !== null || pack10 !== null) {
            bulkPricing = {};
            if (pack5 !== null) bulkPricing.pack5 = pack5;
            if (pack10 !== null) bulkPricing.pack10 = pack10;
          }

          const groupData = {
            name: productName,
            vertical,
            category: categoryMeta.name,
            description,
            bulkPricing,
          };

          const existingGroup = await prisma.productGroup.findUnique({ where: { sku: parentSku } });
          let group;
          if (existingGroup) {
            group = await prisma.productGroup.update({ where: { id: existingGroup.id }, data: groupData });
            summary.groupsUpdated++;
          } else {
            group = await prisma.productGroup.create({ data: { ...groupData, sku: parentSku } });
            summary.groupsCreated++;
          }

          productGroupId = group.id;
          groupCache.set(parentSku, productGroupId);
          groupFirstRowInfo.set(parentSku, { row: rowNumber, vertical, pack5, pack10 });
        }
      }

      const sharedData = {
        description,
        price: hasDiscount ? discountPrice : price,
        originalPrice: hasDiscount ? price : null,
        category: categoryMeta.name,
        subcategory,
        emoji: categoryMeta.emoji,
        color: categoryMeta.color,
        stock: totalStock,
        sizes,
        inStock,
        tag,
        productGroupId,
        variantColor: colorRaw || null,
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
  console.log(`Groups created: ${summary.groupsCreated}`);
  console.log(`Groups updated: ${summary.groupsUpdated}`);

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
