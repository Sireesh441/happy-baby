import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "../../../../lib/db";
import { corsPreflight, withCors } from "../../../../lib/cors";
import { signMobileToken } from "../../../../lib/mobileJwt";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name.trim() || !email.trim() || password.length < 6) {
    return withCors(
      NextResponse.json(
        { error: "Please provide a name, a valid email, and a password of at least 6 characters." },
        { status: 400 }
      )
    );
  }

  if (await getUserByEmail(email)) {
    return withCors(NextResponse.json({ error: "An account with this email already exists." }, { status: 409 }));
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await createUser(name.trim(), email.trim(), passwordHash);
  const user = { id: String(created.id), name: created.name, email: created.email };

  const token = signMobileToken(user);
  return withCors(NextResponse.json({ token, user }, { status: 201 }));
}

export async function OPTIONS() {
  return corsPreflight();
}
