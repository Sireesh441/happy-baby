import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import { isAdminEmail } from "../../lib/admin";
import { getBaseUrl } from "../../lib/serverFetch";
import type { Product } from "../data/products";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdminPanel from "../components/admin/AdminPanel";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (!isAdminEmail(session.user?.email)) {
    redirect("/");
  }

  const response = await fetch(`${getBaseUrl()}/api/products`, { cache: "no-store" });
  const products: Product[] = await response.json();

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="mb-8 text-3xl font-bold text-slate-800">Admin — Products</h1>
          <AdminPanel initialProducts={products} />
        </section>
      </main>
      <Footer />
    </>
  );
}
