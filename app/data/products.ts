export type Category = "Diapers" | "Feeding" | "Clothing" | "Toys" | "Skincare";

export type Tag = "Bestseller" | "New" | "Sale";

export type Product = {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  tag?: Tag;
  category: Category;
  emoji: string;
  color: string;
  image?: string;
};

export type CategoryMeta = {
  name: Category;
  slug: string;
  emoji: string;
  color: string;
};

export const CATEGORY_META: CategoryMeta[] = [
  { name: "Diapers", slug: "diapers", emoji: "🧷", color: "bg-sky-100" },
  { name: "Feeding", slug: "feeding", emoji: "🍼", color: "bg-amber-100" },
  { name: "Clothing", slug: "clothing", emoji: "👶", color: "bg-pink-100" },
  { name: "Toys", slug: "toys", emoji: "🧸", color: "bg-emerald-100" },
  { name: "Skincare", slug: "skincare", emoji: "🧴", color: "bg-violet-100" },
];

export const CATEGORIES: Category[] = CATEGORY_META.map((category) => category.name);

export function getCategoryBySlug(slug: string): CategoryMeta | undefined {
  return CATEGORY_META.find((category) => category.slug === slug);
}

export const PRODUCTS: Product[] = [
  { id: 1, name: "Pampers Premium Care Pants, Size M (78pcs)", price: 799, originalPrice: 899, rating: 4.5, reviewCount: 2340, tag: "Bestseller", category: "Diapers", emoji: "🧷", color: "bg-sky-100", image: "/products/pampers-premium-care-pants.jpg" },
  { id: 2, name: "Huggies Wonder Pants, Size L (46pcs)", price: 649, rating: 4.3, reviewCount: 1876, category: "Diapers", emoji: "🧷", color: "bg-sky-100" },
  { id: 3, name: "Mamaearth Bamboo Diaper Pants, Size S (72pcs)", price: 699, rating: 4.6, reviewCount: 980, tag: "New", category: "Diapers", emoji: "🧷", color: "bg-sky-100" },
  { id: 4, name: "Sirona Reusable Swim Diaper", price: 399, rating: 4.1, reviewCount: 320, category: "Diapers", emoji: "🧷", color: "bg-sky-100" },
  { id: 5, name: "Philips Avent Anti-Colic Bottle Set (3-pack)", price: 1299, originalPrice: 1499, rating: 4.7, reviewCount: 3200, tag: "Bestseller", category: "Feeding", emoji: "🍼", color: "bg-amber-100" },
  { id: 6, name: "Chicco Silicone Bibs, Waterproof (2-pack)", price: 499, rating: 4.4, reviewCount: 540, category: "Feeding", emoji: "🍼", color: "bg-amber-100" },
  { id: 7, name: "LuvLap Bamboo Feeding Spoon Set", price: 349, rating: 4.2, reviewCount: 210, tag: "New", category: "Feeding", emoji: "🍼", color: "bg-amber-100" },
  { id: 8, name: "Born Free Breast Pump Bottle Combo", price: 1599, originalPrice: 1799, rating: 4.0, reviewCount: 150, tag: "Sale", category: "Feeding", emoji: "🍼", color: "bg-amber-100" },
  { id: 9, name: "Mothercare Organic Cotton Onesies (5-pack)", price: 999, rating: 4.5, reviewCount: 1650, tag: "Bestseller", category: "Clothing", emoji: "👶", color: "bg-pink-100" },
  { id: 10, name: "Carter's Fleece Sleep Sack", price: 1199, rating: 4.6, reviewCount: 890, category: "Clothing", emoji: "👶", color: "bg-pink-100" },
  { id: 11, name: "FirstCry Sun Hat & Booties Set", price: 549, rating: 4.3, reviewCount: 430, category: "Clothing", emoji: "👶", color: "bg-pink-100" },
  { id: 12, name: "H&M Baby Rompers Combo Pack (3-pack)", price: 899, originalPrice: 1099, rating: 4.2, reviewCount: 610, tag: "Sale", category: "Clothing", emoji: "👶", color: "bg-pink-100" },
  { id: 13, name: "Fisher-Price Wooden Stacking Rings", price: 699, rating: 4.8, reviewCount: 1200, tag: "Bestseller", category: "Toys", emoji: "🧸", color: "bg-emerald-100" },
  { id: 14, name: "Hamleys Plush Elephant Buddy", price: 799, rating: 4.7, reviewCount: 980, category: "Toys", emoji: "🧸", color: "bg-emerald-100" },
  { id: 15, name: "Chicco Teething Rattle Set (3-pack)", price: 449, rating: 4.4, reviewCount: 560, tag: "New", category: "Toys", emoji: "🧸", color: "bg-emerald-100" },
  { id: 16, name: "LEGO Duplo My First Building Set", price: 1499, originalPrice: 1799, rating: 4.9, reviewCount: 2100, tag: "Bestseller", category: "Toys", emoji: "🧸", color: "bg-emerald-100" },
  { id: 17, name: "Mamaearth Gentle Baby Lotion, 400ml", price: 349, originalPrice: 399, rating: 4.5, reviewCount: 3400, tag: "Bestseller", category: "Skincare", emoji: "🧴", color: "bg-violet-100" },
  { id: 18, name: "Sebamed Baby Tear-Free Shampoo & Wash", price: 425, rating: 4.3, reviewCount: 1230, category: "Skincare", emoji: "🧴", color: "bg-violet-100" },
  { id: 19, name: "Himalaya Diaper Rash Cream, 100g", price: 165, rating: 4.4, reviewCount: 2870, category: "Skincare", emoji: "🧴", color: "bg-violet-100" },
  { id: 20, name: "Aveeno Baby Daily Moisture Lotion", price: 599, rating: 4.6, reviewCount: 780, tag: "New", category: "Skincare", emoji: "🧴", color: "bg-violet-100" },
];
