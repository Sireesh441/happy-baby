import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "../../../lib/cors";
import { getBearerToken, verifyMobileToken } from "../../../lib/mobileJwt";
import { createOrder, getOrdersForUser, type OrderLineItem, type ShippingAddress } from "../../../lib/orders";
import { getProductsByIds } from "../../../lib/products";
import { validateAndPriceBulkPack } from "../../../lib/bulkPack";
import { verifyRazorpaySignature } from "../../../lib/razorpaySignature";

const SHIPPING_FEE = 49;
const FREE_SHIPPING_THRESHOLD = 999;

type RetailOrderItemInput = { productId: number; quantity: number };
// Same shape POST /api/cart's bulk-pack payload uses. `packs` is the number
// of this exact pack mix being ordered (defaults to 1). Note there is no
// `price`/`pricePerUnit` field here at all -- one isn't read even if a
// client sends one; see the bulk branch below.
type BulkOrderItemInput = {
  type: "bulk";
  productGroupId: unknown;
  packSize: unknown;
  breakdown: unknown;
  packs?: unknown;
};
type OrderItemInput = RetailOrderItemInput | BulkOrderItemInput;

function isBulkItemInput(item: unknown): item is BulkOrderItemInput {
  return Boolean(item) && typeof item === "object" && (item as { type?: unknown }).type === "bulk";
}

function isValidShippingAddress(value: unknown): value is ShippingAddress {
  if (!value || typeof value !== "object") return false;
  const address = value as Record<string, unknown>;
  return (
    typeof address.name === "string" && address.name.trim().length > 0 &&
    typeof address.phone === "string" && address.phone.trim().length > 0 &&
    typeof address.line1 === "string" && address.line1.trim().length > 0 &&
    typeof address.city === "string" && address.city.trim().length > 0 &&
    typeof address.state === "string" && address.state.trim().length > 0 &&
    typeof address.pincode === "string" && address.pincode.trim().length > 0
  );
}

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return withCors(NextResponse.json({ error: "Missing bearer token." }, { status: 401 }));
  }
  const user = verifyMobileToken(token);
  if (!user) {
    return withCors(NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }));
  }

  const orders = await getOrdersForUser(Number(user.id));
  return withCors(NextResponse.json(orders));
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return withCors(NextResponse.json({ error: "Missing bearer token." }, { status: 401 }));
  }
  const user = verifyMobileToken(token);
  if (!user) {
    return withCors(NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }));
  }

  const body = await request.json().catch(() => null);
  const razorpay_order_id: string | undefined = body?.razorpay_order_id;
  const razorpay_payment_id: string | undefined = body?.razorpay_payment_id;
  const razorpay_signature: string | undefined = body?.razorpay_signature;
  const items: OrderItemInput[] | undefined = body?.items;
  const shippingAddress: unknown = body?.shippingAddress;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return withCors(NextResponse.json({ error: "Missing payment details." }, { status: 400 }));
  }
  if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return withCors(NextResponse.json({ error: "Payment verification failed." }, { status: 400 }));
  }
  if (!Array.isArray(items) || items.length === 0) {
    return withCors(NextResponse.json({ error: "Cart is empty." }, { status: 400 }));
  }
  if (!isValidShippingAddress(shippingAddress)) {
    return withCors(NextResponse.json({ error: "Missing shipping address." }, { status: 400 }));
  }

  // Batch-fetch retail products up front (unchanged from before bulk packs
  // existed); bulk items are validated/priced individually below via the
  // same shared validator POST /api/cart's bulk path uses.
  const retailProductIds = items.filter((item): item is RetailOrderItemInput => !isBulkItemInput(item)).map((item) => item.productId);
  const retailProducts = retailProductIds.length > 0 ? await getProductsByIds(retailProductIds) : [];
  const retailProductById = new Map(retailProducts.map((product) => [product.id, product]));

  const orderItems: OrderLineItem[] = [];

  for (const item of items) {
    if (isBulkItemInput(item)) {
      const result = await validateAndPriceBulkPack({
        productGroupId: item.productGroupId,
        packSize: item.packSize,
        breakdown: item.breakdown,
      });
      if (!result.ok) {
        return withCors(NextResponse.json({ error: result.error }, { status: 400 }));
      }

      const packs = item.packs == null ? 1 : Number(item.packs);
      if (!Number.isInteger(packs) || packs < 1) {
        return withCors(NextResponse.json({ error: "packs must be a positive integer." }, { status: 400 }));
      }

      const { pack } = result;
      // pricePerUnit is whatever validateAndPriceBulkPack just resolved
      // from the ProductGroup's *current* bulkPricing -- never anything the
      // client sent, even if a `price`/`pricePerUnit` field was included.
      orderItems.push({
        type: "bulk",
        productGroupId: pack.productGroupId,
        productGroupName: pack.productGroupName,
        packSize: pack.packSize,
        quantity: packs,
        pricePerUnit: pack.pricePerUnit,
        breakdownDisplay: pack.breakdownDisplay,
      });
      continue;
    }

    const product = retailProductById.get(item.productId);
    const quantity = Math.max(1, Math.floor(item.quantity));
    if (!product || quantity < 1) {
      return withCors(NextResponse.json({ error: "One or more items are no longer available." }, { status: 400 }));
    }
    orderItems.push({
      type: "retail",
      id: product.id,
      name: product.name,
      quantity,
      // Always the current retail price looked up from the database just
      // now -- never anything the client sent.
      price: product.price,
      image: product.image,
      emoji: product.emoji,
      color: product.color,
    });
  }

  const subtotal = orderItems.reduce(
    (sum, item) => sum + (item.type === "bulk" ? item.pricePerUnit * item.packSize * item.quantity : item.price * item.quantity),
    0
  );
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingFee;

  const order = await createOrder({
    userId: Number(user.id),
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    total,
    items: orderItems,
    shippingAddress,
  });

  return withCors(NextResponse.json(order, { status: 201 }));
}
