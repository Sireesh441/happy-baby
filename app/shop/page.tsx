import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductGrid from "../components/ProductGrid";
import type { Product } from "../data/products";
import { getBaseUrl } from "../../lib/serverFetch";

export default async function ShopPage() {
  const response = await fetch(`${getBaseUrl()}/api/products`, { cache: "no-store" });
  const products: Product[] = await response.json();

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h1 className="mb-2 text-center text-3xl font-bold text-slate-800">
            Shop All Products
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-center text-slate-600">
            Everything you need for your little one, in one happy place.
          </p>
          <ProductGrid products={products} />
        </section>
      </main>
      <Footer />
    </>
  );
}
