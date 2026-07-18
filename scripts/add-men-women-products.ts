import path from "node:path";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

dotenv.config({ path: path.resolve(".env.local") });

type NewProduct = {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  tag?: "Bestseller" | "New" | "Sale";
  category: string;
  vertical: "men" | "women";
  emoji: string;
  color: string;
  stock: number;
};

const MEN_PRODUCTS: NewProduct[] = [
  { name: "Levi's 511 Slim Fit Jeans", description: "Classic slim-fit denim with a bit of stretch, built for all-day comfort.", price: 2499, originalPrice: 2999, rating: 4.5, reviewCount: 1850, tag: "Bestseller", category: "Clothing", vertical: "men", emoji: "👕", color: "bg-sky-100", stock: 42 },
  { name: "Allen Solly Cotton Formal Shirt", description: "Breathable cotton weave with a tailored fit for a sharp office look.", price: 1299, rating: 4.3, reviewCount: 920, category: "Clothing", vertical: "men", emoji: "👕", color: "bg-sky-100", stock: 55 },
  { name: "U.S. Polo Assn. Crew Neck T-Shirt (3-Pack)", description: "Soft everyday tees in a versatile 3-pack, perfect for layering or wearing solo.", price: 1199, rating: 4.4, reviewCount: 1340, tag: "New", category: "Clothing", vertical: "men", emoji: "👕", color: "bg-sky-100", stock: 60 },
  { name: "Gillette Fusion5 Razor & Blade Kit", description: "Five-blade precision for a close, comfortable shave every time.", price: 899, rating: 4.6, reviewCount: 2760, tag: "Bestseller", category: "Grooming", vertical: "men", emoji: "🪒", color: "bg-slate-100", stock: 75 },
  { name: "The Man Company Beard Growth Oil", description: "A lightweight blend of natural oils that nourishes skin and supports fuller beard growth.", price: 499, originalPrice: 599, rating: 4.2, reviewCount: 610, tag: "Sale", category: "Grooming", vertical: "men", emoji: "🪒", color: "bg-slate-100", stock: 38 },
  { name: "Woodland Leather Casual Boots", description: "Rugged genuine-leather boots built to handle daily wear and rough terrain alike.", price: 3499, rating: 4.5, reviewCount: 1420, category: "Footwear", vertical: "men", emoji: "👞", color: "bg-amber-100", stock: 24 },
  { name: "Puma Velocity Nitro Running Shoes", description: "Responsive Nitro foam cushioning designed for long, comfortable runs.", price: 4999, originalPrice: 5999, rating: 4.7, reviewCount: 2100, tag: "Bestseller", category: "Footwear", vertical: "men", emoji: "👞", color: "bg-amber-100", stock: 30 },
  { name: "Bata Formal Oxford Shoes", description: "Polished leather Oxfords that pair easily with formal and business-casual outfits.", price: 1899, rating: 4.1, reviewCount: 480, tag: "New", category: "Footwear", vertical: "men", emoji: "👞", color: "bg-amber-100", stock: 20 },
  { name: "Fossil Gen 6 Smartwatch", description: "Track workouts, notifications, and heart rate with a week of battery life.", price: 19995, rating: 4.4, reviewCount: 890, category: "Accessories", vertical: "men", emoji: "⌚", color: "bg-emerald-100", stock: 15 },
  { name: "Fastrack Leather Wallet & Belt Combo", description: "A matching leather wallet and belt set for a polished everyday look.", price: 799, rating: 4.3, reviewCount: 560, category: "Accessories", vertical: "men", emoji: "⌚", color: "bg-emerald-100", stock: 48 },
  { name: "Decathlon Adjustable Dumbbell Set (20kg)", description: "Space-saving adjustable dumbbells that scale from light to heavy lifts.", price: 2999, rating: 4.5, reviewCount: 340, tag: "New", category: "Fitness", vertical: "men", emoji: "🏋️", color: "bg-indigo-100", stock: 18 },
  { name: "boAt Rockerz 550 Wireless Headphones", description: "Over-ear wireless headphones with deep bass and up to 20 hours of playback.", price: 1499, originalPrice: 1999, rating: 4.3, reviewCount: 3200, tag: "Sale", category: "Fitness", vertical: "men", emoji: "🏋️", color: "bg-indigo-100", stock: 65 },
];

const WOMEN_PRODUCTS: NewProduct[] = [
  { name: "Zara Floral Wrap Dress", description: "A flowy floral wrap silhouette that transitions easily from day to evening.", price: 3299, rating: 4.6, reviewCount: 1120, tag: "Bestseller", category: "Clothing", vertical: "women", emoji: "👗", color: "bg-rose-100", stock: 28 },
  { name: "H&M High-Waist Skinny Jeans", description: "Stretch denim with a flattering high-rise fit for everyday wear.", price: 1799, originalPrice: 2199, rating: 4.3, reviewCount: 870, tag: "Sale", category: "Clothing", vertical: "women", emoji: "👗", color: "bg-rose-100", stock: 40 },
  { name: "Fabindia Cotton Kurta Set", description: "Handcrafted cotton kurta and bottom set with traditional block-print detailing.", price: 2199, rating: 4.5, reviewCount: 640, tag: "New", category: "Clothing", vertical: "women", emoji: "👗", color: "bg-rose-100", stock: 33 },
  { name: "Lakme 9 to 5 Matte Lipstick", description: "Long-wearing matte finish in a rich shade that stays put through the day.", price: 499, rating: 4.4, reviewCount: 2980, tag: "Bestseller", category: "Beauty", vertical: "women", emoji: "💄", color: "bg-fuchsia-100", stock: 90 },
  { name: "Maybelline Fit Me Foundation", description: "Lightweight, buildable coverage that matches your natural skin tone.", price: 649, rating: 4.3, reviewCount: 1750, category: "Beauty", vertical: "women", emoji: "💄", color: "bg-fuchsia-100", stock: 70 },
  { name: "The Body Shop Vitamin E Moisturizer", description: "A rich, nourishing moisturizer that locks in hydration for up to 24 hours.", price: 1495, originalPrice: 1795, rating: 4.6, reviewCount: 980, tag: "Sale", category: "Beauty", vertical: "women", emoji: "💄", color: "bg-fuchsia-100", stock: 45 },
  { name: "Metro Block Heel Sandals", description: "Comfortable block heels with a cushioned footbed for all-day wear.", price: 2499, rating: 4.2, reviewCount: 410, category: "Footwear", vertical: "women", emoji: "👠", color: "bg-violet-100", stock: 26 },
  { name: "Nike Air Zoom Women's Sneakers", description: "Responsive cushioning and breathable mesh built for everyday movement.", price: 6499, rating: 4.7, reviewCount: 1560, tag: "New", category: "Footwear", vertical: "women", emoji: "👠", color: "bg-violet-100", stock: 22 },
  { name: "Caprese Structured Handbag", description: "A structured handbag with just enough room for daily essentials.", price: 2799, originalPrice: 3499, rating: 4.4, reviewCount: 730, tag: "Sale", category: "Accessories", vertical: "women", emoji: "👜", color: "bg-amber-100", stock: 35 },
  { name: "Tanishq Silver Stud Earrings", description: "Understated sterling silver studs that suit every outfit.", price: 1899, rating: 4.5, reviewCount: 490, category: "Accessories", vertical: "women", emoji: "👜", color: "bg-amber-100", stock: 50 },
  { name: "Mamma's Touch Maternity Nursing Wear Set", description: "Soft, breathable nursing wear designed for comfort through pregnancy and beyond.", price: 1599, rating: 4.6, reviewCount: 380, tag: "New", category: "Maternity", vertical: "women", emoji: "🤰", color: "bg-pink-100", stock: 24 },
  { name: "Wobbly Walk Maternity Support Belt", description: "Adjustable support belt that eases lower back and abdominal strain during pregnancy.", price: 899, rating: 4.3, reviewCount: 260, category: "Maternity", vertical: "women", emoji: "🤰", color: "bg-pink-100", stock: 30 },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingMen = await prisma.product.count({ where: { vertical: "men" } });
    const existingWomen = await prisma.product.count({ where: { vertical: "women" } });

    if (existingMen > 0 || existingWomen > 0) {
      console.error(
        `Men/women products already exist (men: ${existingMen}, women: ${existingWomen}). Refusing to run again to avoid duplicates.`
      );
      process.exitCode = 1;
      return;
    }

    for (const product of [...MEN_PRODUCTS, ...WOMEN_PRODUCTS]) {
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice ?? null,
          rating: product.rating,
          reviewCount: product.reviewCount,
          tag: product.tag ?? null,
          category: product.category,
          vertical: product.vertical,
          emoji: product.emoji,
          color: product.color,
          stock: product.stock,
        },
      });
    }

    console.log(`Added ${MEN_PRODUCTS.length} men's products and ${WOMEN_PRODUCTS.length} women's products.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
