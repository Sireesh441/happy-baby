import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "../../../../lib/cors";
import { razorpay } from "../../../../lib/razorpay";

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: Request) {
  const { amount } = await request.json();

  if (typeof amount !== "number" || amount <= 0) {
    return withCors(NextResponse.json({ error: "Invalid order amount." }, { status: 400 }));
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `order_rcpt_${Date.now()}`,
    });

    return withCors(
      NextResponse.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      })
    );
  } catch {
    return withCors(NextResponse.json({ error: "Failed to create Razorpay order." }, { status: 502 }));
  }
}
