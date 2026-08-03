"use client";

import { useState } from "react";
import { useCart } from "../context/CartContext";
import type { Product } from "../data/products";

const LOW_STOCK_THRESHOLD = 5;

export default function AddToCartControls({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const sizes = product.sizes ?? [];
  const hasSizes = sizes.length > 0;
  const firstAvailableSize = sizes.find((entry) => entry.available)?.size;
  const [selectedSize, setSelectedSize] = useState<string | undefined>(firstAvailableSize);

  const outOfStock = product.inStock === false;
  const canAddToCart = !outOfStock && (!hasSizes || Boolean(selectedSize));

  function handleAddToCart() {
    if (!canAddToCart) return;
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex flex-col gap-4">
      {hasSizes && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((entry) => {
              const isSelected = selectedSize === entry.size;
              const isLowStock = entry.available && entry.quantity <= LOW_STOCK_THRESHOLD;

              return (
                <button
                  key={entry.size}
                  type="button"
                  disabled={!entry.available}
                  onClick={() => setSelectedSize(entry.size)}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-center rounded-2xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                    !entry.available
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : isSelected
                        ? "border-pink-500 bg-pink-50 text-pink-600"
                        : "border-pink-200 text-slate-700 hover:border-pink-400"
                  }`}
                >
                  <span>{entry.size}</span>
                  {!entry.available && <span className="text-xs font-medium">Out of Stock</span>}
                  {isLowStock && <span className="text-xs font-medium text-amber-600">Only {entry.quantity} left!</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 rounded-full border-2 border-pink-200 px-2 py-1">
          <button
            type="button"
            onClick={() => setQuantity((qty) => Math.max(1, qty - 1))}
            aria-label="Decrease quantity"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold text-pink-500 transition-colors hover:bg-pink-50"
          >
            −
          </button>
          <span className="w-6 text-center font-semibold text-slate-800">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((qty) => qty + 1)}
            aria-label="Increase quantity"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold text-pink-500 transition-colors hover:bg-pink-50"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="flex-1 rounded-full bg-pink-500 px-8 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
        >
          {outOfStock ? "Out of Stock" : added ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
