"use strict";

// One-time backfill: assigns Product.subcategory to existing Clothing
// products, inferred from a case-insensitive keyword match against each
// product's name + description. Only touches products where category is
// "Clothing" and subcategory is currently null -- never overwrites a value
// someone already set (via the admin panel or a re-import).
//
// Run with (from the project root):
//   node scripts/backfill-subcategories.js            (dry run, default -- read-only, prints the plan)
//   node scripts/backfill-subcategories.js --apply     (writes subcategory for every unambiguous match)
//
// NOTE: this project's local .env.local DATABASE_URL points at the same
// Supabase instance used in production (there is no separate local dev
// database) -- --apply writes directly to production data. Always review
// the dry-run output (both the assignments AND the needs-review list)
// before ever passing --apply.
//
// Matching rule, per product: build lowercase `name + " " + description`,
// then test it against every subcategory's keyword list for that product's
// vertical. A subcategory "matches" if any of its keywords is found AND
// (for the two subcategories that have one) none of its exclude-keywords
// are found -- see CLOTHING_SUBCATEGORY_KEYWORDS below. If exactly one
// subcategory matches, it's assigned. If zero or more than one match, the
// product is left untouched and reported on the needs-review list instead
// of guessing.

const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(".env.local") });

const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../lib/generated/prisma-cjs");
const { isValidClothingSubcategory } = require("../app/data/products.ts");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (checked .env.local).");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Mirrors CLOTHING_SUBCATEGORIES in app/data/products.ts -- every name used
// here is asserted against isValidClothingSubcategory below at startup, so a
// typo here fails loudly instead of silently never matching.
const CLOTHING_SUBCATEGORY_KEYWORDS = {
  kids: [
    { name: "Onesies", keywords: ["onesie", "romper"] },
    { name: "T-shirts", keywords: ["t-shirt", "tee"] },
    { name: "Bottoms", keywords: ["pants", "shorts", "leggings"] },
    { name: "Sleepwear", keywords: ["sleepsuit", "pajama", "nightwear", "sleep sack"] },
    { name: "Outerwear", keywords: ["jacket", "coat", "sweater", "hoodie"] },
  ],
  women: [
    { name: "Tops", keywords: ["top", "blouse", "shirt"], exclude: ["dress"] },
    { name: "Dresses", keywords: ["dress", "gown"] },
    { name: "Jeans", keywords: ["jeans", "denim"] },
    { name: "Ethnic Wear", keywords: ["kurta", "saree", "ethnic", "salwar"] },
    // "set" was deliberately dropped as a keyword here -- it's too generic
    // (matches any "Combo Set"/"Kurta Set" product regardless of vertical
    // fit, e.g. it collided with Ethnic Wear's "kurta" on a real product
    // during the initial dry run) and "co-ord"/"coord" alone already covers
    // the intended "coordinated set" meaning without the false positives.
    { name: "Skirts & Co-ords", keywords: ["skirt", "co-ord", "coord"] },
  ],
  men: [
    { name: "T-shirts", keywords: ["t-shirt", "tee"] },
    { name: "Shirts", keywords: ["shirt"], exclude: ["t-shirt", "tee"] },
    { name: "Jeans", keywords: ["jeans", "denim"] },
    { name: "Trousers", keywords: ["trouser", "pant", "chino"] },
    { name: "Jackets", keywords: ["jacket", "coat"] },
    { name: "Shorts", keywords: ["shorts"] },
    { name: "Sweatshirts & Hoodies", keywords: ["sweatshirt", "hoodie"] },
    { name: "Ethnic Wear", keywords: ["kurta", "ethnic"] },
  ],
};

for (const [vertical, entries] of Object.entries(CLOTHING_SUBCATEGORY_KEYWORDS)) {
  for (const entry of entries) {
    if (!isValidClothingSubcategory(vertical, entry.name)) {
      console.error(
        `Config error: "${entry.name}" is not a valid Clothing subcategory for vertical "${vertical}" ` +
          `(check CLOTHING_SUBCATEGORY_KEYWORDS against CLOTHING_SUBCATEGORIES in app/data/products.ts).`
      );
      process.exit(1);
    }
  }
}

// Returns { matches: string[] } -- the list of subcategory names whose
// keywords hit (after applying that subcategory's excludes, if any). Zero
// entries means no match; more than one means ambiguous. Both cases are
// left for manual review rather than guessed.
function matchSubcategories(text, vertical) {
  const entries = CLOTHING_SUBCATEGORY_KEYWORDS[vertical] ?? [];
  const matches = [];

  for (const entry of entries) {
    const hasKeyword = entry.keywords.some((keyword) => text.includes(keyword));
    if (!hasKeyword) continue;

    const isExcluded = (entry.exclude ?? []).some((keyword) => text.includes(keyword));
    if (isExcluded) continue;

    matches.push(entry.name);
  }

  return matches;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const products = await prisma.product.findMany({
    where: { category: "Clothing", subcategory: null },
    select: { id: true, name: true, description: true, vertical: true },
    orderBy: { id: "asc" },
  });

  const assignments = []; // { id, name, vertical, subcategory }
  const needsReview = []; // { id, name, vertical, reason, candidates? }

  for (const product of products) {
    const text = `${product.name} ${product.description}`.toLowerCase();
    const matches = matchSubcategories(text, product.vertical);

    if (matches.length === 1) {
      assignments.push({ id: product.id, name: product.name, vertical: product.vertical, subcategory: matches[0] });
    } else if (matches.length === 0) {
      needsReview.push({ id: product.id, name: product.name, vertical: product.vertical, reason: "no keyword match" });
    } else {
      needsReview.push({
        id: product.id,
        name: product.name,
        vertical: product.vertical,
        reason: `ambiguous -- matched ${matches.length} subcategories`,
        candidates: matches,
      });
    }
  }

  console.log(`Mode: ${apply ? "APPLY (writing to the database)" : "DRY RUN (read-only, no writes)"}`);
  console.log(`Clothing products with no subcategory yet: ${products.length}`);

  console.log(`\n=== Would assign (${assignments.length}) ===`);
  for (const a of assignments) {
    console.log(`  #${a.id} [${a.vertical}] "${a.name}" -> ${a.subcategory}`);
  }

  console.log(`\n=== Needs review (${needsReview.length}) -- left null, not guessed ===`);
  for (const r of needsReview) {
    const candidateNote = r.candidates ? ` (candidates: ${r.candidates.join(", ")})` : "";
    console.log(`  #${r.id} [${r.vertical}] "${r.name}" -- ${r.reason}${candidateNote}`);
  }

  console.log(`\nSummary: ${assignments.length} would be assigned, ${needsReview.length} need manual review.`);

  if (apply) {
    console.log("\nApplying assignments...");
    for (const a of assignments) {
      await prisma.product.update({ where: { id: a.id }, data: { subcategory: a.subcategory } });
    }
    console.log(`Applied ${assignments.length} subcategory assignment(s).`);
  } else {
    console.log("\nDry run only -- nothing was written. Re-run with --apply to write these assignments.");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
