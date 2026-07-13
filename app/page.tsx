import Header from "./components/Header";
import Hero from "./components/Hero";
import CategoryTiles from "./components/CategoryTiles";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <CategoryTiles />
      </main>
      <Footer />
    </>
  );
}
