import path from "node:path";
import dotenv from "dotenv";
import { DatabaseSync } from "node:sqlite";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

dotenv.config({ path: path.resolve(".env.local") });

function toIsoDate(sqliteDate: string): Date {
  return new Date(sqliteDate.replace(" ", "T") + "Z");
}

type SqliteUserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
};

type SqliteProductRow = {
  id: number;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  rating: number;
  review_count: number;
  tag: string | null;
  category: string;
  emoji: string;
  color: string;
  image: string | null;
  stock: number;
  created_at: string;
};

type SqliteOrderRow = {
  id: number;
  user_id: number | null;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  total: number;
  items_json: string;
  created_at: string;
};

async function main() {
  const sqlitePath = path.join(process.cwd(), "data", "app.db");
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingUsers = await prisma.user.count();
    const existingProducts = await prisma.product.count();
    const existingOrders = await prisma.order.count();

    if (existingUsers > 0 || existingProducts > 0 || existingOrders > 0) {
      console.error(
        `Postgres already has data (users: ${existingUsers}, products: ${existingProducts}, orders: ${existingOrders}). ` +
          "Refusing to run to avoid duplicating or clobbering data. Truncate the tables first if you want to re-run this migration."
      );
      process.exitCode = 1;
      return;
    }

    // --- Users ---
    const users = sqlite.prepare("SELECT * FROM users ORDER BY id").all() as unknown as SqliteUserRow[];
    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.password_hash,
          createdAt: toIsoDate(user.created_at),
        },
      });
    }
    console.log(`Migrated ${users.length} users.`);

    // --- Products ---
    const products = sqlite
      .prepare("SELECT * FROM products ORDER BY id")
      .all() as unknown as SqliteProductRow[];
    for (const product of products) {
      await prisma.product.create({
        data: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.original_price,
          rating: product.rating,
          reviewCount: product.review_count,
          tag: product.tag,
          category: product.category,
          emoji: product.emoji,
          color: product.color,
          image: product.image,
          stock: product.stock,
          createdAt: toIsoDate(product.created_at),
        },
      });
    }
    console.log(`Migrated ${products.length} products.`);

    // --- Orders ---
    const orders = sqlite.prepare("SELECT * FROM orders ORDER BY id").all() as unknown as SqliteOrderRow[];
    for (const order of orders) {
      await prisma.order.create({
        data: {
          id: order.id,
          userId: order.user_id,
          razorpayOrderId: order.razorpay_order_id,
          razorpayPaymentId: order.razorpay_payment_id,
          total: order.total,
          items: JSON.parse(order.items_json),
          createdAt: toIsoDate(order.created_at),
        },
      });
    }
    console.log(`Migrated ${orders.length} orders.`);

    // Reset Postgres auto-increment sequences so future inserts don't collide
    // with the explicit IDs we just inserted.
    for (const table of ["users", "products", "orders"]) {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`
      );
    }

    console.log("Done. Sequences reset for users, products, and orders.");
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
