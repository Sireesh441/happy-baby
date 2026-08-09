import { NextResponse } from "next/server";
import { addBulkPackToCart, addToCart, clearCart, summarizeCart } from "../../../lib/cart";
import { getExistingCartId, getOrCreateCartId } from "../../../lib/cartId";

export async function GET() {
  const cartId = await getExistingCartId();
  return NextResponse.json(await summarizeCart(cartId));
}

// Accepts two payload shapes:
//   - legacy single item: { productId, quantity }
//   - wholesale bulk pack: { type: "bulk", productGroupId, packSize, breakdown, packs? }
//     where breakdown is [{ productId, size?, quantity }] summing to exactly packSize.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const cartId = await getOrCreateCartId();

  if (body && typeof body === "object" && (body as { type?: unknown }).type === "bulk") {
    const result = await addBulkPackToCart({
      cartId,
      productGroupId: Number((body as Record<string, unknown>).productGroupId),
      packSize: (body as Record<string, unknown>).packSize,
      breakdown: (body as Record<string, unknown>).breakdown,
      packs: (body as Record<string, unknown>).packs,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(await summarizeCart(cartId), { status: 201 });
  }

  const productId = (body as { productId?: unknown } | null)?.productId;
  const quantity = (body as { quantity?: unknown } | null)?.quantity;

  if (!Number.isFinite(productId) || !Number.isFinite(quantity) || Number(quantity) <= 0) {
    return NextResponse.json({ error: "Invalid productId or quantity." }, { status: 400 });
  }

  await addToCart(cartId, Number(productId), Number(quantity));

  return NextResponse.json(await summarizeCart(cartId), { status: 201 });
}

export async function DELETE() {
  const cartId = await getExistingCartId();
  if (cartId) {
    await clearCart(cartId);
  }
  return NextResponse.json(await summarizeCart(cartId));
}
