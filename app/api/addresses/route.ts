import { NextResponse } from "next/server";
import { createAddress, getAddressesForUser } from "../../../lib/addresses";
import { corsPreflight, withCors } from "../../../lib/cors";
import { getBearerToken, verifyMobileToken } from "../../../lib/mobileJwt";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return withCors(NextResponse.json({ error: "Missing bearer token." }, { status: 401 }));
  }
  const user = verifyMobileToken(token);
  if (!user) {
    return withCors(NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }));
  }

  const addresses = await getAddressesForUser(Number(user.id));
  return withCors(NextResponse.json(addresses));
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return withCors(NextResponse.json({ error: "Missing bearer token." }, { status: 401 }));
  }
  const user = verifyMobileToken(token);
  if (!user) {
    return withCors(NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }));
  }

  const body = await request.json().catch(() => null);
  const { name, phone, line1, city, state, pincode } = body ?? {};
  if (
    typeof name !== "string" || !name.trim() ||
    typeof phone !== "string" || !phone.trim() ||
    typeof line1 !== "string" || !line1.trim() ||
    typeof city !== "string" || !city.trim() ||
    typeof state !== "string" || !state.trim() ||
    typeof pincode !== "string" || !pincode.trim()
  ) {
    return withCors(NextResponse.json({ error: "Missing address fields." }, { status: 400 }));
  }

  const address = await createAddress({
    userId: Number(user.id),
    name: name.trim(),
    phone: phone.trim(),
    line1: line1.trim(),
    city: city.trim(),
    state: state.trim(),
    pincode: pincode.trim(),
  });
  return withCors(NextResponse.json(address, { status: 201 }));
}
