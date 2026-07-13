import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/categories" },
  { label: "Cart", href: "/cart" },
  { label: "Login", href: "/login" },
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-slate-800 text-slate-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div>
          <p className="flex items-center justify-center gap-2 text-xl font-extrabold text-white md:justify-start">
            <span aria-hidden="true">🍼</span> HappyBaby
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Happy babies, happy families.
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-pink-400">
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-sm text-slate-400">
          © {new Date().getFullYear()} HappyBaby. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
