import { db } from "./db";
import { getProductById } from "./products";
import type { Product } from "../app/data/products";

db.exec(`
  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(cart_id, product_id)
  )
`);

export type CartLine = {
  productId: number;
  quantity: number;
  product: Product;
};

type CartItemRow = {
  id: number;
  cart_id: string;
  product_id: number;
  quantity: number;
};

export function getCart(cartId: string): CartLine[] {
  const rows = db
    .prepare("SELECT * FROM cart_items WHERE cart_id = ? ORDER BY id")
    .all(cartId) as CartItemRow[];

  const lines: CartLine[] = [];
  for (const row of rows) {
    const product = getProductById(row.product_id);
    if (product) {
      lines.push({ productId: row.product_id, quantity: row.quantity, product });
    }
  }
  return lines;
}

export function addToCart(cartId: string, productId: number, quantity: number): void {
  const existing = db
    .prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?")
    .get(cartId, productId) as { id: number; quantity: number } | undefined;

  if (existing) {
    db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(
      existing.quantity + quantity,
      existing.id
    );
  } else {
    db.prepare(
      "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)"
    ).run(cartId, productId, quantity);
  }
}

export function setCartItemQuantity(cartId: string, productId: number, quantity: number): void {
  if (quantity <= 0) {
    removeFromCart(cartId, productId);
    return;
  }

  const existing = db
    .prepare("SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?")
    .get(cartId, productId) as { id: number } | undefined;

  if (existing) {
    db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(quantity, existing.id);
  } else {
    db.prepare(
      "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)"
    ).run(cartId, productId, quantity);
  }
}

export function removeFromCart(cartId: string, productId: number): void {
  db.prepare("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?").run(cartId, productId);
}

export function clearCart(cartId: string): void {
  db.prepare("DELETE FROM cart_items WHERE cart_id = ?").run(cartId);
}
