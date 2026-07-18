import { cookies } from "next/headers";
import crypto from "node:crypto";

const CART_COOKIE_NAME = "happybaby_cart_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getExistingCartId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE_NAME)?.value ?? null;
}

export async function getOrCreateCartId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CART_COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }

  const cartId = crypto.randomUUID();
  cookieStore.set(CART_COOKIE_NAME, cartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return cartId;
}
