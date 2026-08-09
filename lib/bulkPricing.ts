// Wholesale/bulk pricing resolution shared by GET /api/products/group/:id
// (which needs to *show* the effective price) and POST /api/cart's bulk-pack
// path (which needs to *charge* the same number). Both call resolveBulkPricing
// with the same representative-variant price so the two never disagree.

export type BulkPricingOverride = { pack5?: number; pack10?: number };
export type ResolvedBulkPricing = { pack5: number; pack10: number };

const PACK5_DISCOUNT = 0.15; // roughly 15% off retail
const PACK10_DISCOUNT = 0.2; // roughly 20% off retail

/**
 * Resolves a ProductGroup's effective bulk per-unit price for each pack
 * size. An explicit override (ProductGroup.bulkPricing) wins per pack size;
 * whichever key isn't set falls back to a computed default off
 * `representativePrice` (the group's representative variant's retail price
 * -- same "lowest id in the group" convention used elsewhere for picking a
 * representative). Rounded to the nearest whole rupee, matching
 * Product.price's Int (not paise) convention throughout this codebase.
 */
export function resolveBulkPricing(
  representativePrice: number,
  override?: BulkPricingOverride | null
): ResolvedBulkPricing {
  return {
    pack5: override?.pack5 ?? Math.round(representativePrice * (1 - PACK5_DISCOUNT)),
    pack10: override?.pack10 ?? Math.round(representativePrice * (1 - PACK10_DISCOUNT)),
  };
}

export function pricePerUnitForPackSize(pricing: ResolvedBulkPricing, packSize: 5 | 10): number {
  return packSize === 5 ? pricing.pack5 : pricing.pack10;
}

export function isValidPackSize(value: unknown): value is 5 | 10 {
  return value === 5 || value === 10;
}
