import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "./auth";
import { isAdminEmail } from "./admin";

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export async function requireAdminSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email) ? session : null;
}
