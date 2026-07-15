"use client";

import { useState } from "react";

export default function AddToCartControls() {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
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
        className="flex-1 rounded-full bg-pink-500 px-8 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-pink-600"
      >
        {added ? "Added ✓" : "Add to Cart"}
      </button>
    </div>
  );
}
