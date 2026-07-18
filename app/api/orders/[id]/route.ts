import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/apiAuth";
import { isAdminEmail } from "../../../../lib/admin";
import { getOrderById } from "../../../../lib/orders";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(Number(id));

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const session = await getSession();
  const url = new URL(request.url);
  const paymentIdParam = url.searchParams.get("paymentId");

  const isOwner = Boolean(session?.user?.id) && Number(session?.user?.id) === order.userId;
  const isAdmin = isAdminEmail(session?.user?.email);
  const hasPaymentToken = paymentIdParam !== null && paymentIdParam === order.razorpayPaymentId;

  if (!isOwner && !isAdmin && !hasPaymentToken) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  return NextResponse.json(order);
}
