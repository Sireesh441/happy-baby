"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { PRODUCTS } from "../data/products";

export default function CartPage() {
  const { items, itemCount, updateQuantity, removeItem, clearCart } = useCart();
  const [checkedOut, setCheckedOut] = useState(false);

  const lines = items
    .map((item) => {
      const product = PRODUCTS.find((p) => p.id === item.id);
      return product ? { product, quantity: item.quantity } : null;
    })
    .filter((line): line is { product: (typeof PRODUCTS)[number]; quantity: number } => line !== null);

  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  function handleCheckout() {
    clearCart();
    setCheckedOut(true);
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="mb-8 text-3xl font-bold text-slate-800">Your Cart</h1>

          {checkedOut ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-white py-20 text-center shadow-sm">
              <span className="text-6xl" aria-hidden="true">
                🎉
              </span>
              <p className="text-lg font-semibold text-slate-700">Order placed!</p>
              <p className="max-w-sm text-slate-500">
                This is a demo checkout — no real order was placed or charged.
              </p>
              <Link
                href="/shop"
                className="mt-3 rounded-full bg-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
              >
                Continue Shopping
              </Link>
            </div>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-white py-20 text-center shadow-sm">
              <span className="text-6xl" aria-hidden="true">
                🛒
              </span>
              <p className="text-lg font-semibold text-slate-700">Your cart is empty</p>
              <p className="text-slate-500">Looks like you haven&apos;t added anything yet.</p>
              <Link
                href="/shop"
                className="mt-3 rounded-full bg-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="flex flex-col gap-4 lg:col-span-2">
                {lines.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <Link
                      href={`/shop/${product.id}`}
                      className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br ${product.color.replace(
                        "bg-",
                        "from-"
                      )} to-white`}
                    >
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-3xl" aria-hidden="true">
                          {product.emoji}
                        </span>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/shop/${product.id}`}
                        className="font-semibold text-slate-800 transition-colors hover:text-pink-500"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-sm text-slate-500">{product.category}</p>
                      <p className="mt-1 text-sm font-bold text-pink-500">
                        ₹{product.price.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border-2 border-pink-200 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        aria-label={`Decrease quantity of ${product.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-pink-500 transition-colors hover:bg-pink-50"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-slate-800">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        aria-label={`Increase quantity of ${product.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-pink-500 transition-colors hover:bg-pink-50"
                      >
                        +
                      </button>
                    </div>

                    <p className="w-20 shrink-0 text-right font-semibold text-slate-800">
                      ₹{(product.price * quantity).toLocaleString("en-IN")}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeItem(product.id)}
                      aria-label={`Remove ${product.name} from cart`}
                      className="shrink-0 text-lg text-slate-400 transition-colors hover:text-pink-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="h-fit rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-800">Order Summary</h2>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="mt-2 flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span className="font-semibold text-emerald-500">Free</span>
                </div>
                <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-lg font-bold text-slate-800">
                  <span>Total</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="mt-6 w-full rounded-full bg-pink-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
