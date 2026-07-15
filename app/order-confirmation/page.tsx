"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getLastOrder, type OrderRecord } from "../lib/orderStorage";

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<OrderRecord | null | undefined>(undefined);

  useEffect(() => {
    setOrder(getLastOrder());
  }, []);

  if (order === undefined) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          {!order ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-100 bg-white py-20 text-center shadow-sm">
              <span className="text-6xl" aria-hidden="true">
                🔍
              </span>
              <p className="text-lg font-semibold text-slate-700">No recent order found</p>
              <Link
                href="/shop"
                className="mt-3 rounded-full bg-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-6xl" aria-hidden="true">
                  🎉
                </span>
                <h1 className="text-2xl font-bold text-slate-800">Order confirmed!</h1>
                <p className="max-w-sm text-slate-500">
                  Thank you for your purchase. A confirmation has been recorded for your order.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-slate-400">Order ID</p>
                  <p className="font-semibold text-slate-700">{order.orderId}</p>
                </div>
                <div>
                  <p className="text-slate-400">Payment ID</p>
                  <p className="font-semibold text-slate-700">{order.paymentId}</p>
                </div>
                <div>
                  <p className="text-slate-400">Date</p>
                  <p className="font-semibold text-slate-700">
                    {new Date(order.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Total Paid</p>
                  <p className="font-semibold text-pink-500">
                    ₹{order.total.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="mb-4 text-lg font-bold text-slate-800">Items</h2>
                <div className="flex flex-col gap-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 rounded-2xl border border-slate-100 p-3"
                    >
                      <div
                        className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br ${item.color.replace(
                          "bg-",
                          "from-"
                        )} to-white`}
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-2xl" aria-hidden="true">
                            {item.emoji}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">{item.name}</p>
                        <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-slate-800">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Link
                  href="/shop"
                  className="rounded-full bg-pink-500 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
