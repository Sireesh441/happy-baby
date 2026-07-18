import Header from "../components/Header";
import Hero from "../components/Hero";
import CategoryTiles from "../components/CategoryTiles";
import Footer from "../components/Footer";

export default function WomenPage() {
  return (
    <>
      <Header vertical="women" />
      <main className="flex-1">
        <Hero vertical="women" />
        <CategoryTiles vertical="women" />
      </main>
      <Footer />
    </>
  );
}
