import { NextResponse } from "next/server";
import { razorpay } from "../../../../lib/razorpay";

export async function POST(request: Request) {
  const { amount } = await request.json();

  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid order amount." }, { status: 400 });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `order_rcpt_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create Razorpay order." }, { status: 502 });
  }
}
