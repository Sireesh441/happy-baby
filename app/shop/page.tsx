import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductGrid from "../components/ProductGrid";
import type { Vertical } from "../data/products";
import { getAllProducts } from "../../lib/products";

const SHOP_HEADING: Record<Vertical, string> = {
  kids: "Shop All Products",
  men: "Shop Men's Essentials",
  women: "Shop Women's Essentials",
};

const SHOP_TAGLINE: Record<Vertical, string> = {
  kids: "Everything you need for your little one, in one happy place.",
  men: "Clothing, grooming, footwear, accessories, and fitness gear, all in one place.",
  women: "Clothing, beauty, footwear, accessories, and maternity wear, all in one place.",
};

function isVertical(value: string | undefined): value is Vertical {
  return value === "kids" || value === "men" || value === "women";
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string }>;
}) {
  const { vertical: verticalParam } = await searchParams;
  const vertical: Vertical = isVertical(verticalParam) ? verticalParam : "kids";

  const products = await getAllProducts(vertical);

  return (
    <>
      <Header vertical={vertical} />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h1 className="mb-2 text-center text-3xl font-bold text-slate-800">
            {SHOP_HEADING[vertical]}
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-center text-slate-600">
            {SHOP_TAGLINE[vertical]}
          </p>
          <ProductGrid products={products} />
        </section>
      </main>
      <Footer />
    </>
  );
}
