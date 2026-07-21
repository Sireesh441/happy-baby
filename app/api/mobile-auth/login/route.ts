import { NextResponse } from "next/server";
import { verifyCredentials } from "../../../../lib/auth";
import { corsPreflight, withCors } from "../../../../lib/cors";
import { signMobileToken } from "../../../../lib/mobileJwt";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return withCors(NextResponse.json({ error: "Email and password are required." }, { status: 400 }));
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return withCors(NextResponse.json({ error: "Invalid email or password." }, { status: 401 }));
  }

  const token = signMobileToken(user);
  return withCors(NextResponse.json({ token, user }));
}

export async function OPTIONS() {
  return corsPreflight();
}
