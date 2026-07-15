import { db } from "./db";
import { SEED_PRODUCTS, type Category, type Product, type Tag } from "../app/data/products";

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    original_price INTEGER,
    rating REAL NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    tag TEXT,
    category TEXT NOT NULL,
    emoji TEXT NOT NULL,
    color TEXT NOT NULL,
    image TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

type ProductRow = {
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
};

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    rating: row.rating,
    reviewCount: row.review_count,
    tag: (row.tag as Tag | null) ?? undefined,
    category: row.category as Category,
    emoji: row.emoji,
    color: row.color,
    image: row.image ?? undefined,
    stock: row.stock,
  };
}

function seedProductsIfEmpty() {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM products").get() as {
    count: number;
  };
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO products
      (name, description, price, original_price, rating, review_count, tag, category, emoji, color, image, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const product of SEED_PRODUCTS) {
    insert.run(
      product.name,
      product.description,
      product.price,
      product.originalPrice ?? null,
      product.rating,
      product.reviewCount,
      product.tag ?? null,
      product.category,
      product.emoji,
      product.color,
      product.image ?? null,
      product.stock
    );
  }
}

seedProductsIfEmpty();

export function getAllProducts(): Product[] {
  const rows = db.prepare("SELECT * FROM products ORDER BY id").all() as ProductRow[];
  return rows.map(rowToProduct);
}

export function getProductById(id: number): Product | undefined {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as
    | ProductRow
    | undefined;
  return row ? rowToProduct(row) : undefined;
}

export function getProductsByCategory(category: Category): Product[] {
  const rows = db
    .prepare("SELECT * FROM products WHERE category = ? ORDER BY id")
    .all(category) as ProductRow[];
  return rows.map(rowToProduct);
}

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: Category;
  emoji: string;
  color: string;
  image?: string;
  stock: number;
};

export function createProduct(input: ProductInput): Product {
  const result = db
    .prepare(
      `INSERT INTO products
        (name, description, price, original_price, rating, review_count, tag, category, emoji, color, image, stock)
      VALUES (?, ?, ?, ?, 0, 0, NULL, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.description,
      input.price,
      input.originalPrice ?? null,
      input.category,
      input.emoji,
      input.color,
      input.image ?? null,
      input.stock
    );

  return getProductById(Number(result.lastInsertRowid))!;
}

export function updateProduct(id: number, input: ProductInput): Product | undefined {
  db.prepare(
    `UPDATE products SET
      name = ?, description = ?, price = ?, original_price = ?,
      category = ?, emoji = ?, color = ?, image = ?, stock = ?
    WHERE id = ?`
  ).run(
    input.name,
    input.description,
    input.price,
    input.originalPrice ?? null,
    input.category,
    input.emoji,
    input.color,
    input.image ?? null,
    input.stock,
    id
  );

  return getProductById(id);
}

export function deleteProduct(id: number): void {
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
}
