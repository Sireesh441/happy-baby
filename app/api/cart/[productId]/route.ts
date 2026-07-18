import { NextResponse } from "next/server";
import { getCart, removeFromCart, setCartItemQuantity } from "../../../../lib/cart";
import { getExistingCartId, getOrCreateCartId } from "../../../../lib/cartId";

function summarize(cartId: string | null) {
  const lines = cartId ? getCart(cartId) : [];
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  return { lines, itemCount, subtotal };
}

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
  setCartItemQuantity(cartId, Number(productId), Number(quantity));

  return NextResponse.json(summarize(cartId));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const cartId = await getExistingCartId();

  if (cartId) {
    removeFromCart(cartId, Number(productId));
  }

  return NextResponse.json(summarize(cartId));
}
