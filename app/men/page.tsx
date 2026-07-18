import Header from "../components/Header";
import Hero from "../components/Hero";
import CategoryTiles from "../components/CategoryTiles";
import Footer from "../components/Footer";

export default function MenPage() {
  return (
    <>
      <Header vertical="men" />
      <main className="flex-1">
        <Hero vertical="men" />
        <CategoryTiles vertical="men" />
      </main>
      <Footer />
    </>
  );
}
