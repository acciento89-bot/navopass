import { Pool, type PoolConfig, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { navopassPool?: Pool };

function poolConfig(): PoolConfig {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  // In production we pass the PostgreSQL credentials as separate values.
  // This deliberately avoids constructing a database URL from a password:
  // characters such as @, :, / or # are valid in passwords but have special
  // meaning inside URLs and can otherwise break authentication/parsing.
  if (host && user && password && database) {
    return {
      host,
      port: Number(process.env.DB_PORT || 5432),
      user,
      password,
      database,
      max: 10,
    };
  }

  return {
    connectionString: process.env.DATABASE_URL,
    max: 10,
  };
}

export const pool = globalForDb.navopassPool ?? new Pool(poolConfig());

if (process.env.NODE_ENV !== "production") globalForDb.navopassPool = pool;

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return pool.query<T>(text, values);
}
