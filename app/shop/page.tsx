import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductGrid from "../components/ProductGrid";

export default function ShopPage() {
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
          <ProductGrid />
        </section>
      </main>
      <Footer />
    </>
  );
}
