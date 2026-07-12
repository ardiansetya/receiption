import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/* Placeholder agar build (tanpa env) tidak gagal; koneksi baru dibuat saat query pertama. */
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@placeholder.local/placeholder";

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL belum di-set. Query database akan gagal.");
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
