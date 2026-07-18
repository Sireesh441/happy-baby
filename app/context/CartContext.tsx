"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "../data/products";

export type CartLine = {
  productId: number;
  quantity: number;
  product: Product;
};

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
      const existing = current.lines.find((line) => line.productId === product.id);
      const lines = existing
        ? current.lines.map((line) =>
            line.productId === product.id
              ? { ...line, quantity: line.quantity + quantity }
              : line
          )
        : [...current.lines, { productId: product.id, quantity, product }];
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
    setSummary((current) => recompute(current.lines.filter((line) => line.productId !== productId)));

    fetch(`/api/cart/${productId}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((data: CartSummary) => setSummary(data))
      .catch(() => {});
  }

  function updateQuantity(productId: number, quantity: number) {
    setSummary((current) =>
      recompute(
        quantity <= 0
          ? current.lines.filter((line) => line.productId !== productId)
          : current.lines.map((line) =>
              line.productId === productId ? { ...line, quantity } : line
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

  function clearCart() {
    setSummary(EMPTY_SUMMARY);
    fetch("/api/cart", { method: "DELETE" }).catch(() => {});
  }

  return (
    <CartContext.Provider
      value={{ ...summary, loading, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

function recompute(lines: CartLine[]): CartSummary {
  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
  };
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
