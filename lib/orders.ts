import { prisma } from "./prisma";
import type { Prisma } from "./generated/prisma/client";

export type OrderLineItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  emoji: string;
  color: string;
};

export type Order = {
  id: number;
  userId: number | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  total: number;
  items: OrderLineItem[];
  createdAt: string;
};

function toOrder(row: {
  id: number;
  userId: number | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  total: number;
  items: Prisma.JsonValue;
  createdAt: Date;
}): Order {
  return {
    id: row.id,
    userId: row.userId,
    razorpayOrderId: row.razorpayOrderId,
    razorpayPaymentId: row.razorpayPaymentId,
    total: row.total,
    items: row.items as unknown as OrderLineItem[],
    createdAt: row.createdAt.toISOString(),
  };
}

export type CreateOrderInput = {
  userId: number | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  total: number;
  items: OrderLineItem[];
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const row = await prisma.order.create({
    data: {
      userId: input.userId,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      total: input.total,
      items: input.items as unknown as Prisma.InputJsonValue,
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
