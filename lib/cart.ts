import { prisma } from "./prisma";
import { toProduct } from "./products";
import { validateAndPriceBulkPack } from "./bulkPack";
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
 * 5 or 10 units, priced at the group's resolved bulk per-unit rate. All the
 * actual validation/pricing lives in lib/bulkPack.ts's
 * validateAndPriceBulkPack -- shared with order creation so there's one
 * authoritative place that resolves a bulk price, not two that could drift.
 */
export async function addBulkPackToCart(input: AddBulkPackInput): Promise<AddBulkPackResult> {
  const { cartId } = input;

  const packs = input.packs == null ? 1 : Number(input.packs);
  if (!Number.isInteger(packs) || packs < 1) {
    return { ok: false, error: "packs must be a positive integer." };
  }

  const result = await validateAndPriceBulkPack({
    productGroupId: input.productGroupId,
    packSize: input.packSize,
    breakdown: input.breakdown,
  });
  if (!result.ok) {
    return result;
  }
  const { pack } = result;

  await prisma.cartItem.create({
    data: {
      cartId,
      quantity: packs,
      productGroupId: pack.productGroupId,
      packSize: pack.packSize,
      bulkBreakdown: pack.breakdown as unknown as Prisma.InputJsonValue,
      bulkPricePerUnit: pack.pricePerUnit,
    },
  });

  return { ok: true };
}
