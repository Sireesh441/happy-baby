import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { authOptions } from "../../../../lib/auth";
import { isAdminEmail } from "../../../../lib/admin";
import { createProduct, getAllProducts } from "../../../../lib/products";
import { CATEGORY_META, type Category } from "../../../../app/data/products";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email) ? session : null;
}

async function saveUploadedImage(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || ".jpg";
  const filename = `product-${Date.now()}${extension}`;
  await writeFile(path.join(process.cwd(), "public", "products", filename), bytes);
  return `/products/${filename}`;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  return NextResponse.json(getAllProducts());
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "") as Category;
  const price = Number(formData.get("price"));
  const discountPriceRaw = formData.get("discountPrice");
  const discountPrice = discountPriceRaw ? Number(discountPriceRaw) : null;
  const stock = Number(formData.get("stock"));
  const emoji = String(formData.get("emoji") ?? "").trim();
  const imageFile = formData.get("image");

  const categoryMeta = CATEGORY_META.find((c) => c.name === category);

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

  const product = createProduct({
    name,
    description,
    price: hasDiscount ? discountPrice! : price,
    originalPrice: hasDiscount ? price : undefined,
    category: categoryMeta.name,
    emoji: emoji || categoryMeta.emoji,
    color: categoryMeta.color,
    image,
    stock,
  });

  return NextResponse.json(product, { status: 201 });
}
