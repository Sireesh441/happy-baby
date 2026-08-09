import { prisma } from "./prisma";
import { resolveBulkPricing, type BulkPricingOverride } from "./bulkPricing";
import type { BulkBreakdownDisplayEntry, BulkBreakdownEntry } from "../app/data/products";

export type ValidatedBulkPack = {
  productGroupId: number;
  productGroupName: string;
  packSize: 5 | 10;
  breakdown: BulkBreakdownEntry[];
  breakdownDisplay: BulkBreakdownDisplayEntry[];
  // Resolved server-side from the ProductGroup's current bulkPricing --
  // never taken from caller input. This is the number that gets charged.
  pricePerUnit: number;
};

export type ValidateBulkPackInput = {
  productGroupId: unknown;
  packSize: unknown;
  breakdown: unknown;
};

export type ValidateBulkPackResult = { ok: true; pack: ValidatedBulkPack } | { ok: false; error: string };

/**
 * The single, authoritative place a wholesale bulk-pack request gets
 * validated and priced -- used by both POST /api/cart's bulk-pack path and
 * order creation (POST /api/orders), so there is exactly one server-side
 * source of truth for "is this breakdown legit and what does it cost."
 * Nothing here ever reads a client-submitted price; `pricePerUnit` is
 * always resolved fresh from the ProductGroup's current `bulkPricing` (or
 * its computed default) at call time. Every input is `unknown` on purpose
 * -- this is the boundary that validates a raw JSON request body.
 */
export async function validateAndPriceBulkPack(input: ValidateBulkPackInput): Promise<ValidateBulkPackResult> {
  const productGroupId = Number(input.productGroupId);
  if (!Number.isInteger(productGroupId) || productGroupId <= 0) {
    return { ok: false, error: "productGroupId is required." };
  }

  if (input.packSize !== 5 && input.packSize !== 10) {
    return { ok: false, error: "packSize must be 5 or 10." };
  }
  const packSize = input.packSize;

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

  const breakdownDisplay: BulkBreakdownDisplayEntry[] = [];
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
    breakdownDisplay.push({
      productId: entry.productId,
      size: entry.size,
      quantity: entry.quantity,
      name: product.name,
      image: product.image ?? undefined,
      emoji: product.emoji,
    });
  }

  // Same representative-variant convention as getProductGroupWithVariants
  // (lowest id in the group), so this always prices identically to what
  // GET /api/products/group/:id showed the buyer before they committed.
  const representative = await prisma.product.findFirst({
    where: { productGroupId },
    orderBy: { id: "asc" },
  });
  if (!representative) {
    return { ok: false, error: "Product group has no variants to price a bulk pack from." };
  }

  const resolved = resolveBulkPricing(representative.price, group.bulkPricing as BulkPricingOverride | null);
  const pricePerUnit = packSize === 5 ? resolved.pack5 : resolved.pack10;

  return {
    ok: true,
    pack: {
      productGroupId,
      productGroupName: group.name,
      packSize,
      breakdown,
      breakdownDisplay,
      pricePerUnit,
    },
  };
}
