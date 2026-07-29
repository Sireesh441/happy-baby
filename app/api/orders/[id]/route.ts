import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/apiAuth";
import { isAdminEmail } from "../../../../lib/admin";
import { corsPreflight, withCors } from "../../../../lib/cors";
import { getBearerToken, verifyMobileToken } from "../../../../lib/mobileJwt";
import { getOrderById } from "../../../../lib/orders";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(Number(id));

  if (!order) {
    return withCors(NextResponse.json({ error: "Order not found." }, { status: 404 }));
  }

  const session = await getSession();
  const url = new URL(request.url);
  const paymentIdParam = url.searchParams.get("paymentId");

  const mobileUser = verifyMobileToken(getBearerToken(request) ?? "");

  const isOwner = Boolean(session?.user?.id) && Number(session?.user?.id) === order.userId;
  const isMobileOwner = Boolean(mobileUser) && Number(mobileUser?.id) === order.userId;
  const isAdmin = isAdminEmail(session?.user?.email);
  const hasPaymentToken = paymentIdParam !== null && paymentIdParam === order.razorpayPaymentId;

  if (!isOwner && !isMobileOwner && !isAdmin && !hasPaymentToken) {
    return withCors(NextResponse.json({ error: "Not authorized." }, { status: 403 }));
  }

  return withCors(NextResponse.json(order));
}
