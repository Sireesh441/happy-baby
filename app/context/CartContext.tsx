"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { BulkBreakdownEntry, Product } from "../data/products";

export type SingleCartLine = {
  type: "single";
  id: number;
  productId: number;
  quantity: number;
  product: Product;
};

// A wholesale bulk pack -- see lib/cart.ts's BulkCartLine (server-side
// counterpart) for the full shape/reasoning. Only ever created via a
// direct POST /api/cart bulk-pack call today; this context has no UI path
// that adds one, only rendering/removing whatever GET /api/cart returns.
export type BulkCartLine = {
  type: "bulk";
  id: number;
  productGroupId: number;
  productGroupName: string;
  packSize: number;
  quantity: number;
  pricePerUnit: number;
  breakdown: BulkBreakdownEntry[];
};

export type CartLine = SingleCartLine | BulkCartLine;

type CartSummary = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
};

type CartContextValue = CartSummary & {
  loading: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeBulkLine: (id: number) => void;
  clearCart: () => void;
};

const EMPTY_SUMMARY: CartSummary = { lines: [], itemCount: 0, subtotal: 0 };

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<CartSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cart")
      .then((response) => response.json())
      .then((data: CartSummary) => setSummary(data))
      .catch(() => setSummary(EMPTY_SUMMARY))
      .finally(() => setLoading(false));
  }, []);

  function addItem(product: Product, quantity = 1) {
    setSummary((current) => {
      const existing = current.lines.find((line) => line.type === "single" && line.productId === product.id);
      const lines: CartLine[] = existing
        ? current.lines.map((line) =>
            line.type === "single" && line.productId === product.id
              ? { ...line, quantity: line.quantity + quantity }
              : line
          )
        : [...current.lines, { type: "single", id: -product.id, productId: product.id, quantity, product }];
      return recompute(lines);
    });

    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity }),
    })
      .then((response) => response.json())
      .then((data: CartSummary) => setSummary(data))
      .catch(() => {});
  }

  function removeItem(productId: number) {
    setSummary((current) =>
      recompute(current.lines.filter((line) => !(line.type === "single" && line.productId === productId)))
    );

    fetch(`/api/cart/${productId}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((data: CartSummary) => setSummary(data))
      .catch(() => {});
  }

  function updateQuantity(productId: number, quantity: number) {
    setSummary((current) =>
      recompute(
        quantity <= 0
          ? current.lines.filter((line) => !(line.type === "single" && line.productId === productId))
          : current.lines.map((line) =>
              line.type === "single" && line.productId === productId ? { ...line, quantity } : line
            )
      )
    );

    fetch(`/api/cart/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    })
      .then((response) => response.json())
      .then((data: CartSummary) => setSummary(data))
      .catch(() => {});
  }

  // Bulk-pack lines have no single productId to key off of -- removed by
  // their own cart-line id instead (see /api/cart/item/[id]).
  function removeBulkLine(id: number) {
    setSummary((current) => recompute(current.lines.filter((line) => !(line.type === "bulk" && line.id === id))));

    fetch(`/api/cart/item/${id}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((data: CartSummary) => setSummary(data))
      .catch(() => {});
  }

  function clearCart() {
    setSummary(EMPTY_SUMMARY);
    fetch("/api/cart", { method: "DELETE" }).catch(() => {});
  }

  return (
    <CartContext.Provider
      value={{ ...summary, loading, addItem, removeItem, updateQuantity, removeBulkLine, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

function recompute(lines: CartLine[]): CartSummary {
  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + (line.type === "bulk" ? line.packSize * line.quantity : line.quantity), 0),
    subtotal: lines.reduce(
      (sum, line) =>
        sum + (line.type === "bulk" ? line.pricePerUnit * line.packSize * line.quantity : line.product.price * line.quantity),
      0
    ),
  };
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
