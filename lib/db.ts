import { Pool, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { navopassPool?: Pool };

export const pool = globalForDb.navopassPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

if (process.env.NODE_ENV !== "production") globalForDb.navopassPool = pool;

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return pool.query<T>(text, values);
}
