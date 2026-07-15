"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product, Tag } from "../data/products";
import { useCart } from "../context/CartContext";

const TAG_STYLES: Record<Tag, string> = {
  Bestseller: "bg-amber-400 text-amber-950",
  New: "bg-emerald-400 text-emerald-950",
  Sale: "bg-pink-500 text-white",
};

export default function ProductCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  function handleAddToCart(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    addItem(product.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const discountPercent = product.originalPrice
    ? Math.round(100 - (product.price / product.originalPrice) * 100)
    : null;

  const filledStars = Math.round(product.rating);

  return (
    <Link
      href={`/shop/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div
        className={`relative flex h-44 items-center justify-center overflow-hidden bg-linear-to-br ${product.color.replace(
          "bg-",
          "from-"
        )} to-white`}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden="true"
            className="text-7xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
          >
            {product.emoji}
          </span>
        )}
        {product.tag && (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${TAG_STYLES[product.tag]}`}
          >
            {product.tag}
          </span>
        )}
        {discountPercent !== null && (
          <span className="absolute right-3 top-3 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-white">
            -{discountPercent}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {product.category}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-10 font-semibold text-slate-800">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex text-amber-400" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i}>{i < filledStars ? "★" : "☆"}</span>
            ))}
          </div>
          <span className="text-xs text-slate-400">
            ({product.reviewCount.toLocaleString("en-IN")})
          </span>
        </div>

        <div className="mt-3 flex flex-1 items-end justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-pink-500">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-slate-400 line-through">
                ₹{product.originalPrice.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className="mt-4 w-full rounded-full bg-pink-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
        >
          {added ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
    </Link>
  );
}
