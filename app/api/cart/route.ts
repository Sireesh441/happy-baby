import { NextResponse } from "next/server";
import { addToCart, clearCart, getCart } from "../../../lib/cart";
import { getExistingCartId, getOrCreateCartId } from "../../../lib/cartId";

function summarize(cartId: string | null) {
  const lines = cartId ? getCart(cartId) : [];
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  return { lines, itemCount, subtotal };
}

export async function GET() {
  const cartId = await getExistingCartId();
  return NextResponse.json(summarize(cartId));
}

export async function POST(request: Request) {
  const { productId, quantity } = await request.json();

  if (!Number.isFinite(productId) || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Invalid productId or quantity." }, { status: 400 });
  }

  const cartId = await getOrCreateCartId();
  addToCart(cartId, Number(productId), Number(quantity));

  return NextResponse.json(summarize(cartId), { status: 201 });
}

export async function DELETE() {
  const cartId = await getExistingCartId();
  if (cartId) {
    clearCart(cartId);
  }
  return NextResponse.json(summarize(cartId));
}
