"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, Vertical } from "../../data/products";
import { VERTICALS, getCategoriesForVertical } from "../../data/products";

type FormMode = { type: "closed" } | { type: "add" } | { type: "edit"; product: Product };

type FormState = {
  name: string;
  vertical: Vertical;
  category: string;
  price: string;
  discountPrice: string;
  description: string;
  emoji: string;
  stock: string;
};

function emptyForm(): FormState {
  const defaultVertical: Vertical = "kids";
  return {
    name: "",
    vertical: defaultVertical,
    category: getCategoriesForVertical(defaultVertical)[0].name,
    price: "",
    discountPrice: "",
    description: "",
    emoji: "",
    stock: "",
  };
}

function productToForm(product: Product): FormState {
  const hasDiscount = product.originalPrice !== undefined;
  return {
    name: product.name,
    vertical: product.vertical,
    category: product.category,
    price: String(hasDiscount ? product.originalPrice : product.price),
    discountPrice: hasDiscount ? String(product.price) : "",
    description: product.description,
    emoji: product.emoji,
    stock: String(product.stock),
  };
}

function stockStatus(stock: number) {
  if (stock <= 0) {
    return { label: "Out of Stock", className: "bg-red-100 text-red-600" };
  }
  if (stock <= 5) {
    return { label: "Low Stock", className: "bg-amber-100 text-amber-700" };
  }
  return { label: "In Stock", className: "bg-emerald-100 text-emerald-700" };
}

export default function AdminPanel({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [formMode, setFormMode] = useState<FormMode>({ type: "closed" });
  const [form, setForm] = useState<FormState>(emptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const categoryOptions = getCategoriesForVertical(form.vertical);

  function openAddForm() {
    setForm(emptyForm());
    setImageFile(null);
    setError(null);
    setFormMode({ type: "add" });
  }

  function openEditForm(product: Product) {
    setForm(productToForm(product));
    setImageFile(null);
    setError(null);
    setFormMode({ type: "edit", product });
  }

  function closeForm() {
    setFormMode({ type: "closed" });
  }

  function handleVerticalChange(vertical: Vertical) {
    setForm((f) => ({
      ...f,
      vertical,
      category: getCategoriesForVertical(vertical)[0].name,
    }));
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(product.id);
    const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (response.ok) {
      setProducts((current) => current.filter((p) => p.id !== product.id));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.name.trim() || !form.description.trim() || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
      setError("Please fill in all required fields with valid values.");
      return;
    }

    setSubmitting(true);

    const body = new FormData();
    body.set("name", form.name.trim());
    body.set("description", form.description.trim());
    body.set("vertical", form.vertical);
    body.set("category", form.category);
    body.set("price", form.price);
    body.set("discountPrice", form.discountPrice);
    body.set("stock", form.stock);
    body.set("emoji", form.emoji.trim());
    if (imageFile) {
      body.set("image", imageFile);
    }

    const isEdit = formMode.type === "edit";
    const url = isEdit ? `/api/products/${formMode.product.id}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, { method, body });
    setSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    const saved: Product = await response.json();
    setProducts((current) =>
      isEdit ? current.map((p) => (p.id === saved.id ? saved : p)) : [...current, saved]
    );
    closeForm();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-600">{products.length} products</p>
        <button
          type="button"
          onClick={openAddForm}
          className="rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
        >
          + Add Product
        </button>
      </div>

      {formMode.type !== "closed" && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-slate-800">
            {formMode.type === "edit" ? "Edit Product" : "Add Product"}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-full border-2 border-pink-200 px-4 py-2 text-sm text-slate-800 outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Vertical</label>
              <select
                value={form.vertical}
                onChange={(e) => handleVerticalChange(e.target.value as Vertical)}
                className="w-full rounded-full border-2 border-pink-200 px-4 py-2 text-sm text-slate-800 outline-none focus:border-pink-400"
              >
                {VERTICALS.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-full border-2 border-pink-200 px-4 py-2 text-sm text-slate-800 outline-none focus:border-pink-400"
              >
                {categoryOptions.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Price (₹)</label>
              <input
                type="number"
                min="1"
                required
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full rounded-full border-2 border-pink-200 px-4 py-2 text-sm text-slate-800 outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Discount Price (₹, optional)
              </label>
              <input
                type="number"
                min="1"
                value={form.discountPrice}
                onChange={(e) => setForm((f) => ({ ...f, discountPrice: e.target.value }))}
                className="w-full rounded-full border-2 border-pink-200 px-4 py-2 text-sm text-slate-800 outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                required
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                className="w-full rounded-full border-2 border-pink-200 px-4 py-2 text-sm text-slate-800 outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Emoji (used if no image)
              </label>
              <input
                type="text"
                placeholder="🧸"
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                className="w-full rounded-full border-2 border-pink-200 px-4 py-2 text-sm text-slate-800 outline-none focus:border-pink-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-2xl border-2 border-pink-200 px-4 py-2 text-sm text-slate-800 outline-none focus:border-pink-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Image Upload (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-600"
            />
          </div>

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600 disabled:opacity-60"
            >
              {submitting ? "Saving..." : formMode.type === "edit" ? "Save Changes" : "Add Product"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border-2 border-pink-200 px-6 py-2.5 text-sm font-semibold text-pink-500 transition-colors hover:bg-pink-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Vertical</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const status = stockStatus(product.stock);
              return (
                <tr key={product.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-linear-to-br ${product.color.replace(
                          "bg-",
                          "from-"
                        )} to-white`}
                      >
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-lg" aria-hidden="true">
                            {product.emoji}
                          </span>
                        )}
                      </div>
                      <span className="max-w-xs truncate font-medium text-slate-800">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{product.vertical}</td>
                  <td className="px-4 py-3 text-slate-600">{product.category}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-pink-500">
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                    {product.originalPrice && (
                      <span className="ml-2 text-slate-400 line-through">
                        ₹{product.originalPrice.toLocaleString("en-IN")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                      {status.label} ({product.stock})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(product)}
                        className="rounded-full border-2 border-pink-200 px-3 py-1 text-xs font-semibold text-pink-500 transition-colors hover:bg-pink-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        disabled={deletingId === product.id}
                        className="rounded-full border-2 border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-60"
                      >
                        {deletingId === product.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
