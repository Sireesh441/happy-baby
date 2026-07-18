import Link from "next/link";
import type { Vertical } from "../data/products";

type HeroContent = {
  headingLead: string;
  headingAccent: string;
  headingSuffix: string;
  tagline: string;
  emoji: string;
  gradient: string;
  accentText: string;
  ctaBg: string;
  ctaBorder: string;
};

const HERO_CONTENT: Record<Vertical, HeroContent> = {
  kids: {
    headingLead: "Everything your little one needs,",
    headingAccent: "delivered with love",
    headingSuffix: "💕",
    tagline:
      "Diapers, feeding essentials, cozy clothing, toys, and gentle skincare — all in one happy, healthy place for you and your baby.",
    emoji: "🧸",
    gradient: "from-pink-100 via-amber-50 to-sky-100",
    accentText: "text-pink-500",
    ctaBg: "bg-pink-500 hover:bg-pink-600",
    ctaBorder: "border-pink-300 text-pink-500 hover:bg-pink-50",
  },
  men: {
    headingLead: "Everyday essentials, styled",
    headingAccent: "your way",
    headingSuffix: "💪",
    tagline:
      "Clothing, grooming, footwear, accessories, and fitness gear — everything a man needs, all in one happy place.",
    emoji: "👔",
    gradient: "from-sky-100 via-slate-50 to-indigo-100",
    accentText: "text-sky-600",
    ctaBg: "bg-sky-600 hover:bg-sky-700",
    ctaBorder: "border-sky-300 text-sky-600 hover:bg-sky-50",
  },
  women: {
    headingLead: "Fashion and essentials",
    headingAccent: "for every day",
    headingSuffix: "💫",
    tagline:
      "Clothing, beauty, footwear, accessories, and maternity wear — curated with care, all in one happy place.",
    emoji: "👗",
    gradient: "from-violet-100 via-rose-50 to-fuchsia-100",
    accentText: "text-violet-600",
    ctaBg: "bg-violet-600 hover:bg-violet-700",
    ctaBorder: "border-violet-300 text-violet-600 hover:bg-violet-50",
  },
};

export default function Hero({ vertical = "kids" }: { vertical?: Vertical }) {
  const content = HERO_CONTENT[vertical];

  return (
    <section className={`bg-linear-to-br ${content.gradient}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6 md:flex-row md:text-left">
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight text-slate-800 sm:text-5xl">
            {content.headingLead}
            <span className={content.accentText}> {content.headingAccent}</span> {content.headingSuffix}
          </h1>
          <p className="mx-auto max-w-md text-lg text-slate-600 md:mx-0">{content.tagline}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
            <Link
              href={`/shop?vertical=${vertical}`}
              className={`rounded-full px-8 py-3 text-base font-semibold text-white shadow-md transition-colors ${content.ctaBg}`}
            >
              Shop Now
            </Link>
            <Link
              href="#categories"
              className={`rounded-full border-2 bg-white px-8 py-3 text-base font-semibold transition-colors ${content.ctaBorder}`}
            >
              Browse Categories
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="grid h-64 w-64 place-items-center rounded-full bg-white/70 text-8xl shadow-inner sm:h-80 sm:w-80">
            {content.emoji}
          </div>
        </div>
      </div>
    </section>
  );
}
