import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "../../../../lib/cors";
import { getBearerToken, verifyMobileToken } from "../../../../lib/mobileJwt";

export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return withCors(NextResponse.json({ error: "Missing bearer token." }, { status: 401 }));
  }

  const user = verifyMobileToken(token);
  if (!user) {
    return withCors(NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }));
  }

  return withCors(NextResponse.json({ user }));
}

export async function OPTIONS() {
  return corsPreflight();
}
