import { NextResponse } from "next/server";
import { removeCartItemById, summarizeCart } from "../../../../../lib/cart";
import { getExistingCartId } from "../../../../../lib/cartId";

// Removes a cart line by its own row id -- the only way to remove a
// bulk-pack line, which (unlike a normal line) has no single productId to
// key off of. Works for normal lines too, but /api/cart/:productId is the
// existing, unchanged path for those.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cartId = await getExistingCartId();

  if (cartId) {
    await removeCartItemById(cartId, Number(id));
  }

  return NextResponse.json(await summarizeCart(cartId));
}
