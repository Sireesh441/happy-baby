import { prisma } from "./prisma";
import type { Prisma } from "./generated/prisma/client";
import type { BulkBreakdownDisplayEntry } from "../app/data/products";

// `type` is optional on the retail variant so existing stored orders (which
// predate bulk packs and have no `type` field at all) still satisfy this
// type without a data migration -- Order.items is stored as raw JSON and
// was never runtime-validated against this type anyway, only cast.
export type RetailOrderLineItem = {
  type?: "retail";
  id: number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  emoji: string;
  color: string;
};

// A wholesale bulk pack placed as one order line. `pricePerUnit` and
// `breakdown`/`breakdownDisplay` are resolved and snapshotted server-side
// at order-creation time (see lib/bulkPack.ts) -- never taken from the
// client, same as `RetailOrderLineItem.price` never is.
export type BulkOrderLineItem = {
  type: "bulk";
  productGroupId: number;
  productGroupName: string;
  packSize: number;
  // Number of packs purchased (each pack itself contains `packSize` units).
  quantity: number;
  pricePerUnit: number;
  breakdownDisplay: BulkBreakdownDisplayEntry[];
};

export type OrderLineItem = RetailOrderLineItem | BulkOrderLineItem;

export type ShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

export type Order = {
  id: number;
  userId: number | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  total: number;
  items: OrderLineItem[];
  shippingAddress: ShippingAddress;
  createdAt: string;
};

function toOrder(row: {
  id: number;
  userId: number | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  total: number;
  items: Prisma.JsonValue;
  shippingAddress: Prisma.JsonValue;
  createdAt: Date;
}): Order {
  return {
    id: row.id,
    userId: row.userId,
    razorpayOrderId: row.razorpayOrderId,
    razorpayPaymentId: row.razorpayPaymentId,
    total: row.total,
    items: row.items as unknown as OrderLineItem[],
    shippingAddress: row.shippingAddress as unknown as ShippingAddress,
    createdAt: row.createdAt.toISOString(),
  };
}

export type CreateOrderInput = {
  userId: number | null;
  addressId?: number | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  total: number;
  items: OrderLineItem[];
  shippingAddress: ShippingAddress;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const row = await prisma.order.create({
    data: {
      userId: input.userId,
      addressId: input.addressId ?? null,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      total: input.total,
      items: input.items as unknown as Prisma.InputJsonValue,
      shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
    },
  });
  return toOrder(row);
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  const row = await prisma.order.findUnique({ where: { id } });
  return row ? toOrder(row) : undefined;
}

export async function getOrdersForUser(userId: number): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { userId },
    orderBy: { id: "desc" },
  });
  return rows.map(toOrder);
}
