import { NextResponse } from "next/server";
import { removeFromCart, setCartItemQuantity, summarizeCart } from "../../../../lib/cart";
import { getExistingCartId, getOrCreateCartId } from "../../../../lib/cartId";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const { quantity } = await request.json();

  if (!Number.isFinite(quantity)) {
    return NextResponse.json({ error: "Invalid quantity." }, { status: 400 });
  }

  const cartId = await getOrCreateCartId();
  await setCartItemQuantity(cartId, Number(productId), Number(quantity));

  return NextResponse.json(await summarizeCart(cartId));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const cartId = await getExistingCartId();

  if (cartId) {
    await removeFromCart(cartId, Number(productId));
  }

  return NextResponse.json(await summarizeCart(cartId));
}
