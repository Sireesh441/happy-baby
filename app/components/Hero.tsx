import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-pink-100 via-amber-50 to-sky-100">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6 md:flex-row md:text-left">
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight text-slate-800 sm:text-5xl">
            Everything your little one needs,
            <span className="text-pink-500"> delivered with love</span> 💕
          </h1>
          <p className="mx-auto max-w-md text-lg text-slate-600 md:mx-0">
            Diapers, feeding essentials, cozy clothing, toys, and gentle
            skincare — all in one happy, healthy place for you and your baby.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
            <Link
              href="/shop"
              className="rounded-full bg-pink-500 px-8 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-pink-600"
            >
              Shop Now
            </Link>
            <Link
              href="/categories"
              className="rounded-full border-2 border-pink-300 bg-white px-8 py-3 text-base font-semibold text-pink-500 transition-colors hover:bg-pink-50"
            >
              Browse Categories
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="grid h-64 w-64 place-items-center rounded-full bg-white/70 text-8xl shadow-inner sm:h-80 sm:w-80">
            🧸
          </div>
        </div>
      </div>
    </section>
  );
}
