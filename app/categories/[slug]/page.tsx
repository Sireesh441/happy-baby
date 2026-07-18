import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProductCard from "../../components/ProductCard";
import { CATEGORY_META, getCategoryBySlug } from "../../data/products";
import type { Product } from "../../data/products";
import { getBaseUrl } from "../../../lib/serverFetch";

export function generateStaticParams() {
  return CATEGORY_META.map((category) => ({ slug: category.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const response = await fetch(
    `${getBaseUrl()}/api/products?vertical=${category.vertical}`,
    { cache: "no-store" }
  );
  const allProducts: Product[] = await response.json();
  const products = allProducts.filter((product) => product.category === category.name);

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h1 className="mb-2 text-center text-3xl font-bold text-slate-800">
            <span aria-hidden="true">{category.emoji}</span> {category.name}
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-center text-slate-600">
            Shop our {category.name.toLowerCase()} essentials.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
