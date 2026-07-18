import { prisma } from "./prisma";

export type User = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
};

function toUser(row: {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password_hash: row.passwordHash,
    created_at: row.createdAt.toISOString(),
  };
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  return user ? toUser(user) : undefined;
}

export async function createUser(name: string, email: string, passwordHash: string): Promise<User> {
  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase(), passwordHash },
  });
  return toUser(user);
}
