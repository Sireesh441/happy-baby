import { redirect } from "next/navigation";
import { requireAdminSession } from "../../../lib/apiAuth";
import { getOrderById, type Order } from "../../../lib/orders";
import { fetchAllReturnCases, type ReturnCase } from "../../../lib/returnsService";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import AdminNav from "../../components/admin/AdminNav";
import ReturnsPanel from "../../components/admin/ReturnsPanel";

export default async function AdminReturnsPage() {
  const session = await requireAdminSession();
  if (!session?.user?.email) {
    redirect("/");
  }

  let cases: ReturnCase[] = [];
  let loadError: string | null = null;
  try {
    cases = await fetchAllReturnCases({
      id: session.user.id,
      name: session.user.name ?? "Admin",
      email: session.user.email,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load return cases.";
  }

  // Enrich each case with the order it belongs to (product name/image,
  // customer) purely for display -- returns-protection only knows raw
  // orderId/itemId numbers, since it has no visibility into this app's own
  // Orders table. Deduped so an order with multiple returned items is only
  // fetched once.
  const orderIds = [...new Set(cases.map((c) => c.orderId))];
  const orders = await Promise.all(orderIds.map((id) => getOrderById(id)));
  const ordersById = new Map<number, Order>();
  orders.forEach((order, i) => {
    if (order) ordersById.set(orderIds[i], order);
  });

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="mb-4 text-3xl font-bold text-slate-800">Admin — Returns</h1>
          <AdminNav active="returns" />
          {loadError ? (
            <p className="mt-8 text-sm font-medium text-red-500">{loadError}</p>
          ) : (
            <ReturnsPanel initialCases={cases} ordersById={Object.fromEntries(ordersById)} />
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
