import Header from "../components/Header";
import Hero from "../components/Hero";
import CategoryTiles from "../components/CategoryTiles";
import Footer from "../components/Footer";

export default function KidsPage() {
  return (
    <>
      <Header vertical="kids" />
      <main className="flex-1">
        <Hero vertical="kids" />
        <CategoryTiles vertical="kids" />
      </main>
      <Footer />
    </>
  );
}
