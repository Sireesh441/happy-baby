"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import type { Product } from "../data/products";
import { saveLastOrder } from "../lib/orderStorage";
import type { RazorpayPaymentResponse } from "../../types/razorpay";

export default function CartPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, itemCount, updateQuantity, removeItem, clearCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const lines = items
    .map((item) => {
      const product = products.find((p) => p.id === item.id);
      return product ? { product, quantity: item.quantity } : null;
    })
    .filter((line): line is { product: Product; quantity: number } => line !== null);

  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  async function handleCheckout() {
    setCheckoutError(null);
    setPlacingOrder(true);

    try {
      const orderResponse = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: subtotal }),
      });

      if (!orderResponse.ok) {
        const data = await orderResponse.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not start checkout.");
      }

      const order = await orderResponse.json();

      if (typeof window.Razorpay !== "function") {
        throw new Error("Payment gateway failed to load. Please try again.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "HappyBaby",
        description: `Order for ${itemCount} item${itemCount > 1 ? "s" : ""}`,
        prefill: {
          name: session?.user?.name ?? undefined,
          email: session?.user?.email ?? undefined,
        },
        theme: { color: "#ec4899" },
        handler: async (response: RazorpayPaymentResponse) => {
          const verifyResponse = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });

          if (!verifyResponse.ok) {
            setCheckoutError("Payment verification failed. Please contact support.");
            setPlacingOrder(false);
            return;
          }

          saveLastOrder({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            items: lines.map(({ product, quantity }) => ({
              id: product.id,
              name: product.name,
              quantity,
              price: product.price,
              image: product.image,
              emoji: product.emoji,
              color: product.color,
            })),
            total: subtotal,
            createdAt: new Date().toISOString(),
          });

          clearCart();
          router.push("/order-confirmation");
        },
        modal: {
          ondismiss: () => setPlacingOrder(false),
        },
      });

      checkout.on("payment.failed", () => {
        setCheckoutError("Payment failed. Please try again.");
        setPlacingOrder(false);
      });

      checkout.open();
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Something went wrong.");
      setPlacingOrder(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="mb-8 text-3xl font-bold text-slate-800">Your Cart</h1>

          {lines.length === 0 ? (
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

                {checkoutError && (
                  <p className="mt-4 text-sm font-medium text-red-500">{checkoutError}</p>
                )}

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={placingOrder}
                  className="mt-6 w-full rounded-full bg-pink-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600 disabled:opacity-60"
                >
                  {placingOrder ? "Processing..." : "Proceed to Checkout"}
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
