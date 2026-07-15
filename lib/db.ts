import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = path.join(process.cwd(), "data", "app.db");

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export type User = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export function getUserByEmail(email: string): User | undefined {
  const statement = db.prepare("SELECT * FROM users WHERE email = ?");
  return statement.get(email.toLowerCase()) as User | undefined;
}

export function createUser(name: string, email: string, passwordHash: string): User {
  const statement = db.prepare(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
  );
  const result = statement.run(name, email.toLowerCase(), passwordHash);
  return getUserByEmail(email) ?? {
    id: Number(result.lastInsertRowid),
    name,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };
}
