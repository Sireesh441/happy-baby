"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "../context/CartContext";
import { isAdminEmail } from "../../lib/admin";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/categories" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold text-pink-500">
          <span aria-hidden="true">🍼</span>
          <span>
            Happy<span className="text-sky-500">Baby</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-pink-500">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/cart"
            className="relative flex items-center gap-1 text-sm font-semibold text-slate-600 transition-colors hover:text-pink-500"
          >
            <span aria-hidden="true">🛒</span> Cart
            {itemCount > 0 && (
              <span className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          {status === "authenticated" ? (
            <div className="flex items-center gap-3">
              {isAdminEmail(session.user?.email) && (
                <Link
                  href="/admin"
                  className="text-sm font-semibold text-slate-600 transition-colors hover:text-pink-500"
                >
                  Admin
                </Link>
              )}
              <span className="text-sm font-semibold text-slate-700">
                Hi, {session.user?.name?.split(" ")[0]}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border-2 border-pink-200 px-5 py-2 text-sm font-semibold text-pink-500 transition-colors hover:bg-pink-50"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
            >
              Login
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-600 md:hidden"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-slate-100 bg-white px-4 pb-4 text-sm font-semibold text-slate-600 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-2 py-3 transition-colors hover:bg-pink-50 hover:text-pink-500"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/cart"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-pink-50 hover:text-pink-500"
          >
            <span>🛒 Cart</span>
            {itemCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          {status === "authenticated" ? (
            <>
              {isAdminEmail(session.user?.email) && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-2 py-3 transition-colors hover:bg-pink-50 hover:text-pink-500"
                >
                  Admin
                </Link>
              )}
              <span className="px-2 py-2 text-slate-700">
                Hi, {session.user?.name?.split(" ")[0]}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="mt-2 rounded-full border-2 border-pink-200 px-5 py-3 text-center text-pink-500 transition-colors hover:bg-pink-50"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="mt-2 rounded-full bg-pink-500 px-5 py-3 text-center text-white shadow-sm transition-colors hover:bg-pink-600"
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
