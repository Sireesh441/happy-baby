import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "../../../lib/cors";
import {
  getCategoriesForVertical,
  getClothingSubcategories,
  type Vertical,
} from "../../../app/data/products";

const VALID_VERTICALS: Vertical[] = ["kids", "men", "women"];

function isVertical(value: string | null): value is Vertical {
  return value !== null && (VALID_VERTICALS as string[]).includes(value);
}

// Public, cross-origin category listing for a vertical -- primarily so the
// mobile app's shop screen can render the same category rail structure the
// web app derives from CATEGORY_META, without duplicating that config in a
// second repo. Each entry carries `subcategories` only for "Clothing" (the
// only category with them -- see CLOTHING_SUBCATEGORIES), so callers can
// tell at a glance which categories are expandable.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const verticalParam = url.searchParams.get("vertical");

  if (!isVertical(verticalParam)) {
    return withCors(
      NextResponse.json(
        { error: `vertical query param is required and must be one of ${VALID_VERTICALS.join(", ")}.` },
        { status: 400 }
      )
    );
  }

  const categories = getCategoriesForVertical(verticalParam).map((category) => ({
    name: category.name,
    slug: category.slug,
    emoji: category.emoji,
    ...(category.name === "Clothing"
      ? { subcategories: getClothingSubcategories(verticalParam) }
      : {}),
  }));

  return withCors(NextResponse.json(categories));
}

export async function OPTIONS() {
  return corsPreflight();
}
