import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";

const VERTICALS = [
  {
    name: "Happy Baby",
    tagline: "Everything your little one needs, from diapers to first toys.",
    href: "/kids",
    emoji: "🍼",
    gradient: "from-pink-200 via-pink-100 to-white",
  },
  {
    name: "Happy Men",
    tagline: "Everyday essentials and style, made simple.",
    href: "/men",
    emoji: "👔",
    gradient: "from-sky-200 via-sky-100 to-white",
  },
  {
    name: "Happy Women",
    tagline: "Curated fashion and essentials for every day.",
    href: "/women",
    emoji: "👗",
    gradient: "from-violet-200 via-violet-100 to-white",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-4xl font-extrabold text-slate-800 sm:text-5xl">
            Welcome to <span className="text-pink-500">Happy</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            One family of stores, three happy places. Pick where you&apos;d like to shop.
          </p>
        </div>

        <div className="mx-auto mt-12 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {VERTICALS.map((vertical) => (
            <Link
              key={vertical.href}
              href={vertical.href}
              className={`group flex h-80 flex-col items-center justify-center gap-4 rounded-3xl bg-linear-to-br ${vertical.gradient} p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
            >
              <span
                className="text-7xl transition-transform duration-300 group-hover:scale-110"
                aria-hidden="true"
              >
                {vertical.emoji}
              </span>
              <h2 className="text-2xl font-bold text-slate-800">{vertical.name}</h2>
              <p className="text-sm text-slate-600">{vertical.tagline}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
