import Link from "next/link";
import { CATEGORY_META, type Vertical } from "../data/products";

export default function CategoryTiles({ vertical = "kids" }: { vertical?: Vertical }) {
  const categories = CATEGORY_META.filter((category) => category.vertical === vertical);

  return (
    <section id="categories" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="mb-8 text-center text-3xl font-bold text-slate-800">
        Shop by Category
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/categories/${category.slug}`}
            className={`flex flex-col items-center gap-3 rounded-2xl ${category.color} p-6 text-center shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md`}
          >
            <span className="text-4xl" aria-hidden="true">
              {category.emoji}
            </span>
            <span className="font-semibold text-slate-700">{category.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
