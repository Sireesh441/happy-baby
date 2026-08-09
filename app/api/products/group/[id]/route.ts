import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "../../../../../lib/cors";
import { getProductGroupWithVariants } from "../../../../../lib/products";

export async function OPTIONS() {
  return corsPreflight();
}

// Returns every color variant within a ProductGroup, for a product-detail
// page's color swatch picker. GET /api/products (the shop grid) only ever
// returns one representative variant per group -- this is how a caller
// fetches the rest.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const groupId = Number(id);

  if (!Number.isInteger(groupId)) {
    return withCors(NextResponse.json({ error: "id must be an integer." }, { status: 400 }));
  }

  const result = await getProductGroupWithVariants(groupId);
  if (!result) {
    return withCors(NextResponse.json({ error: "Product group not found." }, { status: 404 }));
  }

  return withCors(NextResponse.json(result));
}
