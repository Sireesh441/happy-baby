import { NextResponse } from "next/server";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { requireAdminSession } from "../../../lib/apiAuth";
import { corsPreflight, withCors } from "../../../lib/cors";
import { createProduct, getGroupedProducts } from "../../../lib/products";
import { getCategoryMeta, type Vertical } from "../../../app/data/products";

async function saveUploadedImage(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || ".jpg";
  const filename = `product-${Date.now()}${extension}`;
  await writeFile(path.join(process.cwd(), "public", "products", filename), bytes);
  return `/products/${filename}`;
}

// Shop-grid listing: one entry per ProductGroup (a representative variant,
// annotated with `variantCount`) plus one entry per ungrouped product --
// not one row per color. Callers that need every color variant within a
// group should use GET /api/products/group/:id. Admin product management
// doesn't go through this route at all (it queries Prisma directly via
// lib/products.ts's getAllProducts, which still returns every row
// individually -- grouping only changes the public shop-grid contract).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const verticalParam = url.searchParams.get("vertical") as Vertical | null;
  return withCors(NextResponse.json(await getGroupedProducts(verticalParam ?? undefined)));
}

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const vertical = String(formData.get("vertical") ?? "") as Vertical;
  const price = Number(formData.get("price"));
  const discountPriceRaw = formData.get("discountPrice");
  const discountPrice = discountPriceRaw ? Number(discountPriceRaw) : null;
  const stock = Number(formData.get("stock"));
  const emoji = String(formData.get("emoji") ?? "").trim();
  const imageFile = formData.get("image");

  const categoryMeta = getCategoryMeta(category, vertical);

  if (
    !name ||
    !description ||
    !categoryMeta ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(stock) ||
    stock < 0
  ) {
    return NextResponse.json({ error: "Please fill in all fields with valid values." }, { status: 400 });
  }

  let image: string | undefined;
  if (imageFile instanceof File && imageFile.size > 0) {
    image = await saveUploadedImage(imageFile);
  }

  const hasDiscount = discountPrice !== null && Number.isFinite(discountPrice) && discountPrice > 0 && discountPrice < price;

  const product = await createProduct({
    name,
    description,
    price: hasDiscount ? discountPrice! : price,
    originalPrice: hasDiscount ? price : undefined,
    category: categoryMeta.name,
    vertical: categoryMeta.vertical,
    emoji: emoji || categoryMeta.emoji,
    color: categoryMeta.color,
    image,
    stock,
  });

  return NextResponse.json(product, { status: 201 });
}
