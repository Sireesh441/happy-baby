import jwt from "jsonwebtoken";
import type { AuthenticatedUser } from "./auth";

const TOKEN_EXPIRY = "30d";

function requireSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  return secret;
}

export function signMobileToken(user: AuthenticatedUser): string {
  const { id, name, email } = user;
  return jwt.sign({ name, email }, requireSecret(), { subject: id, expiresIn: TOKEN_EXPIRY });
}

export function verifyMobileToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(token, requireSecret());
    if (typeof decoded === "string" || !decoded.sub || !decoded.email || !decoded.name) {
      return null;
    }
    return { id: decoded.sub, name: decoded.name, email: decoded.email };
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}
