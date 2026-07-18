import { prisma } from "./prisma";
import type { Category, Product, Tag } from "../app/data/products";

export function toProduct(row: {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviewCount: number;
  tag: string | null;
  category: string;
  emoji: string;
  color: string;
  image: string | null;
  stock: number;
}): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    originalPrice: row.originalPrice ?? undefined,
    rating: row.rating,
    reviewCount: row.reviewCount,
    tag: (row.tag as Tag | null) ?? undefined,
    category: row.category as Category,
    emoji: row.emoji,
    color: row.color,
    image: row.image ?? undefined,
    stock: row.stock,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({ orderBy: { id: "asc" } });
  return rows.map(toProduct);
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const row = await prisma.product.findUnique({ where: { id } });
  return row ? toProduct(row) : undefined;
}

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { category },
    orderBy: { id: "asc" },
  });
  return rows.map(toProduct);
}

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: Category;
  emoji: string;
  color: string;
  image?: string;
  stock: number;
};

export async function createProduct(input: ProductInput): Promise<Product> {
  const row = await prisma.product.create({
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      originalPrice: input.originalPrice ?? null,
      category: input.category,
      emoji: input.emoji,
      color: input.color,
      image: input.image ?? null,
      stock: input.stock,
    },
  });
  return toProduct(row);
}

export async function updateProduct(id: number, input: ProductInput): Promise<Product | undefined> {
  const row = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      originalPrice: input.originalPrice ?? null,
      category: input.category,
      emoji: input.emoji,
      color: input.color,
      image: input.image ?? null,
      stock: input.stock,
    },
  });
  return toProduct(row);
}

export async function deleteProduct(id: number): Promise<void> {
  await prisma.product.delete({ where: { id } });
}
