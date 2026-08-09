import { prisma } from "./prisma";
import type {
  Category,
  GarmentRegion,
  Product,
  ProductGroup,
  ProductListItem,
  SizeEntry,
  Tag,
  Vertical,
} from "../app/data/products";

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
  vertical: string;
  emoji: string;
  color: string;
  image: string | null;
  stock: number;
  sizes: unknown;
  inStock: boolean;
  garmentRegion: string | null;
  productGroupId?: number | null;
  variantColor?: string | null;
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
    vertical: row.vertical as Vertical,
    emoji: row.emoji,
    color: row.color,
    image: row.image ?? undefined,
    stock: row.stock,
    sizes: (row.sizes as SizeEntry[] | null) ?? undefined,
    inStock: row.inStock,
    garmentRegion: (row.garmentRegion as GarmentRegion | null) ?? undefined,
    productGroupId: row.productGroupId ?? undefined,
    variantColor: row.variantColor ?? undefined,
  };
}

function toProductGroup(row: {
  id: number;
  name: string;
  vertical: string;
  category: string;
  description: string | null;
}): ProductGroup {
  return {
    id: row.id,
    name: row.name,
    vertical: row.vertical as Vertical,
    category: row.category as Category,
    description: row.description ?? undefined,
  };
}

export async function getAllProducts(vertical?: Vertical): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: vertical ? { vertical } : undefined,
    orderBy: { id: "asc" },
  });
  return rows.map(toProduct);
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const row = await prisma.product.findUnique({ where: { id } });
  return row ? toProduct(row) : undefined;
}

export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  const rows = await prisma.product.findMany({ where: { id: { in: ids } } });
  return rows.map(toProduct);
}

export async function getProductsByCategory(
  category: Category,
  vertical: Vertical
): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { category, vertical },
    orderBy: { id: "asc" },
  });
  return rows.map(toProduct);
}

// Shop-grid listing: one entry per ProductGroup (the group's lowest-id
// product stands in as the default/representative variant, matching how a
// shop grid picks a "default" thumbnail for a multi-color listing) plus one
// entry per ungrouped product. `variantCount` tells the grid how many color
// options exist so it can show a swatch/count indicator.
export async function getGroupedProducts(vertical?: Vertical): Promise<ProductListItem[]> {
  const rows = await prisma.product.findMany({
    where: vertical ? { vertical } : undefined,
    orderBy: { id: "asc" },
  });

  const ungrouped: ProductListItem[] = [];
  const groupedByGroupId = new Map<number, typeof rows>();

  for (const row of rows) {
    if (row.productGroupId == null) {
      ungrouped.push({ ...toProduct(row), variantCount: 1 });
      continue;
    }
    const existing = groupedByGroupId.get(row.productGroupId);
    if (existing) {
      existing.push(row);
    } else {
      groupedByGroupId.set(row.productGroupId, [row]);
    }
  }

  const grouped: ProductListItem[] = [];
  for (const variants of groupedByGroupId.values()) {
    // Lowest id = the variant that existed first / was created first within
    // the group, used as a stable, deterministic "default" pick.
    const representative = variants.reduce((a, b) => (a.id < b.id ? a : b));
    grouped.push({ ...toProduct(representative), variantCount: variants.length });
  }

  // Keep overall listing order stable (matches getAllProducts' `id asc`)
  // by merging on the representative/only product's id rather than
  // grouped-then-ungrouped.
  return [...grouped, ...ungrouped].sort((a, b) => a.id - b.id);
}

export type ProductGroupWithVariants = {
  group: ProductGroup;
  variants: Product[];
};

export async function getProductGroupWithVariants(
  groupId: number
): Promise<ProductGroupWithVariants | undefined> {
  const group = await prisma.productGroup.findUnique({ where: { id: groupId } });
  if (!group) {
    return undefined;
  }
  const rows = await prisma.product.findMany({
    where: { productGroupId: groupId },
    orderBy: { id: "asc" },
  });
  return { group: toProductGroup(group), variants: rows.map(toProduct) };
}

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: Category;
  vertical: Vertical;
  emoji: string;
  color: string;
  image?: string;
  stock: number;
  garmentRegion?: GarmentRegion;
};

export async function createProduct(input: ProductInput): Promise<Product> {
  const row = await prisma.product.create({
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      originalPrice: input.originalPrice ?? null,
      category: input.category,
      vertical: input.vertical,
      emoji: input.emoji,
      color: input.color,
      image: input.image ?? null,
      stock: input.stock,
      garmentRegion: input.garmentRegion ?? null,
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
      vertical: input.vertical,
      emoji: input.emoji,
      color: input.color,
      image: input.image ?? null,
      stock: input.stock,
      garmentRegion: input.garmentRegion ?? null,
    },
  });
  return toProduct(row);
}

export async function deleteProduct(id: number): Promise<void> {
  await prisma.product.delete({ where: { id } });
}
