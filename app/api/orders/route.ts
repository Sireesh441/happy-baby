import { NextResponse } from "next/server";
import { getSession } from "../../../lib/apiAuth";
import { createOrder, getOrdersForUser } from "../../../lib/orders";
import { verifyRazorpaySignature } from "../../../lib/razorpaySignature";
import { clearCart, getCart } from "../../../lib/cart";
import { getExistingCartId } from "../../../lib/cartId";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const orders = await getOrdersForUser(Number(session.user.id));
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const cartId = await getExistingCartId();
  const lines = cartId ? await getCart(cartId) : [];

  if (lines.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const session = await getSession();

  const order = await createOrder({
    userId: session?.user?.id ? Number(session.user.id) : null,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    total,
    items: lines.map((line) => ({
      id: line.product.id,
      name: line.product.name,
      quantity: line.quantity,
      price: line.product.price,
      image: line.product.image,
      emoji: line.product.emoji,
      color: line.product.color,
    })),
  });

  if (cartId) {
    await clearCart(cartId);
  }

  return NextResponse.json(order, { status: 201 });
}
