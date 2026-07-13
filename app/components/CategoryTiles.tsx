import Link from "next/link";

const CATEGORIES = [
  { label: "Diapers", emoji: "🧷", href: "/categories/diapers", color: "bg-sky-100" },
  { label: "Feeding", emoji: "🍼", href: "/categories/feeding", color: "bg-amber-100" },
  { label: "Clothing", emoji: "👶", href: "/categories/clothing", color: "bg-pink-100" },
  { label: "Toys", emoji: "🧸", href: "/categories/toys", color: "bg-emerald-100" },
  { label: "Skincare", emoji: "🧴", href: "/categories/skincare", color: "bg-violet-100" },
];

export default function CategoryTiles() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="mb-8 text-center text-3xl font-bold text-slate-800">
        Shop by Category
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {CATEGORIES.map((category) => (
          <Link
            key={category.label}
            href={category.href}
            className={`flex flex-col items-center gap-3 rounded-2xl ${category.color} p-6 text-center shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md`}
          >
            <span className="text-4xl" aria-hidden="true">
              {category.emoji}
            </span>
            <span className="font-semibold text-slate-700">{category.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
