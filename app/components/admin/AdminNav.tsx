import Link from "next/link";

export default function AdminNav({ active }: { active: "products" | "returns" }) {
  const linkClass = (isActive: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      isActive ? "bg-pink-500 text-white" : "border-2 border-pink-200 text-pink-500 hover:bg-pink-50"
    }`;

  return (
    <nav className="mb-8 flex gap-2">
      <Link href="/admin" className={linkClass(active === "products")}>
        Products
      </Link>
      <Link href="/admin/returns" className={linkClass(active === "returns")}>
        Returns
      </Link>
    </nav>
  );
}
