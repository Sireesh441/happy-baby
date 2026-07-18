"use client";

import { useState } from "react";
import type { Product } from "../data/products";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: Product[] }) {
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const categories = Array.from(new Set(products.map((product) => product.category)));
  const filters = ["All", ...categories];

  const filteredProducts =
    activeFilter === "All"
      ? products
      : products.filter((product) => product.category === activeFilter);

  return (
    <div>
      <div className="mb-10 flex flex-wrap justify-center gap-3">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              activeFilter === filter
                ? "bg-pink-500 text-white shadow-sm"
                : "border-2 border-pink-200 bg-white text-slate-600 hover:bg-pink-50"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <p className="mt-12 text-center text-slate-500">
          No products found in this category.
        </p>
      )}
    </div>
  );
}
