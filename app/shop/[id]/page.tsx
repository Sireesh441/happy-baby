import { notFound } from "next/navigation";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProductCard from "../../components/ProductCard";
import AddToCartControls from "../../components/AddToCartControls";
import { getAllProducts, getProductById } from "../../../lib/products";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await getProductById(Number(id));

  if (!product) {
    notFound();
  }

  const allProducts = await getAllProducts(product.vertical);
  const relatedProducts = allProducts
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);

  const discountPercent = product.originalPrice
    ? Math.round(100 - (product.price / product.originalPrice) * 100)
    : null;

  const filledStars = Math.round(product.rating);

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 md:grid-cols-2">
            <div
              className={`relative flex h-80 items-center justify-center overflow-hidden rounded-3xl bg-linear-to-br sm:h-112 ${product.color.replace(
                "bg-",
                "from-"
              )} to-white`}
            >
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <span aria-hidden="true" className="text-9xl">
                  {product.emoji}
                </span>
              )}
              {product.tag && (
                <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-amber-950">
                  {product.tag}
                </span>
              )}
              {discountPercent !== null && (
                <span className="absolute right-4 top-4 rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-white">
                  -{discountPercent}%
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <p className="text-sm font-semibold uppercase tracking-wide text-pink-500">
                {product.category}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-800">{product.name}</h1>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex text-amber-400" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < filledStars ? "★" : "☆"}</span>
                  ))}
                </div>
                <span className="text-sm text-slate-500">
                  {product.rating.toFixed(1)} ({product.reviewCount.toLocaleString("en-IN")} reviews)
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-pink-500">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-slate-400 line-through">
                    ₹{product.originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              <p className="mt-4 text-slate-600">{product.description}</p>

              <div className="mt-8">
                <AddToCartControls product={product} />
              </div>
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="mb-8 text-center text-2xl font-bold text-slate-800">
              You might also like
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
