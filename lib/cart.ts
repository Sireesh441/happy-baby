import { prisma } from "./prisma";
import { toProduct } from "./products";
import { resolveBulkPricing, type BulkPricingOverride } from "./bulkPricing";
import type { BulkBreakdownEntry, Product } from "../app/data/products";
import type { Prisma } from "./generated/prisma/client";

export type SingleCartLine = {
  type: "single";
  id: number;
  productId: number;
  quantity: number;
  product: Product;
};

export type BulkCartLine = {
  type: "bulk";
  id: number;
  productGroupId: number;
  productGroupName: string;
  // 5 or 10.
  packSize: number;
  // Number of packs (each pack itself contains `packSize` units).
  quantity: number;
  // Resolved per-unit bulk price, snapshotted at add-time.
  pricePerUnit: number;
  breakdown: BulkBreakdownEntry[];
};

export type CartLine = SingleCartLine | BulkCartLine;

export type CartSummary = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
};

export async function getCart(cartId: string): Promise<CartLine[]> {
  const rows = await prisma.cartItem.findMany({
    where: { cartId },
    include: { product: true, productGroup: true },
    orderBy: { id: "asc" },
  });

  return rows.map((row): CartLine => {
    if (row.productId != null && row.product) {
      return {
        type: "single",
        id: row.id,
        productId: row.productId,
        quantity: row.quantity,
        product: toProduct(row.product),
      };
    }

    return {
      type: "bulk",
      id: row.id,
      productGroupId: row.productGroupId ?? 0,
      productGroupName: row.productGroup?.name ?? "Bulk Pack",
      packSize: row.packSize ?? 0,
      quantity: row.quantity,
      pricePerUnit: row.bulkPricePerUnit ?? 0,
      breakdown: (row.bulkBreakdown as BulkBreakdownEntry[] | null) ?? [],
    };
  });
}

/** Shared subtotal/itemCount math for a cart, used by every cart route. */
export async function summarizeCart(cartId: string | null): Promise<CartSummary> {
  const lines = cartId ? await getCart(cartId) : [];

  const itemCount = lines.reduce(
    (sum, line) => sum + (line.type === "bulk" ? line.packSize * line.quantity : line.quantity),
    0
  );
  const subtotal = lines.reduce(
    (sum, line) =>
      sum + (line.type === "bulk" ? line.pricePerUnit * line.packSize * line.quantity : line.product.price * line.quantity),
    0
  );

  return { lines, itemCount, subtotal };
}

export async function addToCart(cartId: string, productId: number, quantity: number): Promise<void> {
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity },
    update: { quantity: { increment: quantity } },
  });
}

export async function setCartItemQuantity(
  cartId: string,
  productId: number,
  quantity: number
): Promise<void> {
  if (quantity <= 0) {
    await removeFromCart(cartId, productId);
    return;
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity },
    update: { quantity },
  });
}

export async function removeFromCart(cartId: string, productId: number): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId, productId } });
}

/** Removes any cart line (single or bulk) by its own row id -- the only way to remove a bulk-pack line, which has no productId. */
export async function removeCartItemById(cartId: string, id: number): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId, id } });
}

export async function clearCart(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}

export type AddBulkPackInput = {
  cartId: string;
  productGroupId: number;
  packSize: unknown;
  breakdown: unknown;
  /** How many of this exact pack mix to add. Defaults to 1. */
  packs?: unknown;
};

export type AddBulkPackResult = { ok: true } | { ok: false; error: string };

/**
 * Validates and adds a wholesale bulk-pack line to the cart: a mix of
 * sizes/colors picked from one ProductGroup's variants, summing to exactly
 * 5 or 10 units, priced at the group's resolved bulk per-unit rate. Every
 * input is `unknown` on purpose -- this is the boundary that validates a
 * raw JSON request body, not a typed internal call.
 */
export async function addBulkPackToCart(input: AddBulkPackInput): Promise<AddBulkPackResult> {
  const { cartId, productGroupId } = input;

  if (!Number.isInteger(productGroupId) || productGroupId <= 0) {
    return { ok: false, error: "productGroupId is required." };
  }
  if (input.packSize !== 5 && input.packSize !== 10) {
    return { ok: false, error: "packSize must be 5 or 10." };
  }
  const packSize = input.packSize;

  const packs = input.packs == null ? 1 : Number(input.packs);
  if (!Number.isInteger(packs) || packs < 1) {
    return { ok: false, error: "packs must be a positive integer." };
  }

  if (!Array.isArray(input.breakdown) || input.breakdown.length === 0) {
    return { ok: false, error: "breakdown must be a non-empty array of { productId, size, quantity }." };
  }

  const breakdown: BulkBreakdownEntry[] = [];
  let totalUnits = 0;
  for (const raw of input.breakdown) {
    const entry = raw as Record<string, unknown>;
    const entryProductId = Number(entry.productId);
    const entryQuantity = Number(entry.quantity);
    const entrySize = typeof entry.size === "string" ? entry.size : undefined;

    if (!Number.isInteger(entryProductId) || entryProductId <= 0) {
      return { ok: false, error: "Each breakdown entry needs a valid productId." };
    }
    if (!Number.isInteger(entryQuantity) || entryQuantity < 1) {
      return { ok: false, error: "Each breakdown entry needs a positive integer quantity." };
    }
    breakdown.push({ productId: entryProductId, size: entrySize, quantity: entryQuantity });
    totalUnits += entryQuantity;
  }

  if (totalUnits !== packSize) {
    return {
      ok: false,
      error: `Breakdown quantities sum to ${totalUnits}, but must sum to exactly ${packSize} for a ${packSize}-pack.`,
    };
  }

  const group = await prisma.productGroup.findUnique({ where: { id: productGroupId } });
  if (!group) {
    return { ok: false, error: "Product group not found." };
  }

  const productIds = [...new Set(breakdown.map((entry) => entry.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((product) => [product.id, product]));

  for (const entry of breakdown) {
    const product = productById.get(entry.productId);
    if (!product) {
      return { ok: false, error: `Product ${entry.productId} not found.` };
    }
    if (product.productGroupId !== productGroupId) {
      return {
        ok: false,
        error: `Product ${entry.productId} ("${product.name}") is not a variant of product group ${productGroupId}.`,
      };
    }
    if (entry.size) {
      const sizes = product.sizes as { size: string; available: boolean }[] | null;
      if (sizes && sizes.length > 0) {
        const sizeEntry = sizes.find((s) => s.size === entry.size);
        if (!sizeEntry) {
          return { ok: false, error: `"${entry.size}" is not a valid size for "${product.name}".` };
        }
        if (!sizeEntry.available) {
          return { ok: false, error: `"${entry.size}" for "${product.name}" is out of stock.` };
        }
      }
    }
  }

  // Same representative-variant convention as getProductGroupWithVariants
  // (lowest id in the group), so this always prices identically to what
  // GET /api/products/group/:id showed the buyer before they added it.
  const representative = await prisma.product.findFirst({
    where: { productGroupId },
    orderBy: { id: "asc" },
  });
  if (!representative) {
    return { ok: false, error: "Product group has no variants to price a bulk pack from." };
  }

  const resolved = resolveBulkPricing(representative.price, group.bulkPricing as BulkPricingOverride | null);
  const pricePerUnit = packSize === 5 ? resolved.pack5 : resolved.pack10;

  await prisma.cartItem.create({
    data: {
      cartId,
      quantity: packs,
      productGroupId,
      packSize,
      bulkBreakdown: breakdown as unknown as Prisma.InputJsonValue,
      bulkPricePerUnit: pricePerUnit,
    },
  });

  return { ok: true };
}
