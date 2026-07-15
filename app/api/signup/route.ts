import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "../../../lib/db";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    password.length < 6
  ) {
    return NextResponse.json(
      { error: "Please provide a name, a valid email, and a password of at least 6 characters." },
      { status: 400 }
    );
  }

  if (getUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser(name.trim(), email.trim(), passwordHash);

  return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
}
