import Header from "../components/Header";
import Footer from "../components/Footer";
import CategoryTiles from "../components/CategoryTiles";

export default function CategoriesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <CategoryTiles />
      </main>
      <Footer />
    </>
  );
}
