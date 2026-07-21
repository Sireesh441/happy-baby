import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "./db";

export type AuthenticatedUser = { id: string; name: string; email: string };

/**
 * Shared by NextAuth's Credentials provider (web, cookie session) and the
 * mobile-auth endpoints (JWT) so both surfaces authenticate identically.
 */
export async function verifyCredentials(email: string, password: string): Promise<AuthenticatedUser | null> {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return null;
  }

  return { id: String(user.id), name: user.name, email: user.email };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        return verifyCredentials(credentials.email, credentials.password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
