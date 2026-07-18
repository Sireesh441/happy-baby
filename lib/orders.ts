import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT NOT NULL UNIQUE,
    total INTEGER NOT NULL,
    items_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

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

type OrderRow = {
  id: number;
  user_id: number | null;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  total: number;
  items_json: string;
  created_at: string;
};

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    total: row.total,
    items: JSON.parse(row.items_json),
    createdAt: row.created_at,
  };
}

export type CreateOrderInput = {
  userId: number | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  total: number;
  items: OrderLineItem[];
};

export function createOrder(input: CreateOrderInput): Order {
  const result = db
    .prepare(
      `INSERT INTO orders (user_id, razorpay_order_id, razorpay_payment_id, total, items_json)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.userId,
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.total,
      JSON.stringify(input.items)
    );

  return getOrderById(Number(result.lastInsertRowid))!;
}

export function getOrderById(id: number): Order | undefined {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
  return row ? rowToOrder(row) : undefined;
}

export function getOrdersForUser(userId: number): Order[] {
  const rows = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC")
    .all(userId) as OrderRow[];
  return rows.map(rowToOrder);
}
