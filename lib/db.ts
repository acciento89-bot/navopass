import { Pool, type PoolConfig, type QueryResultRow } from "pg";
import { SCHEMA_STATEMENTS } from "@/lib/schema";

const globalForDb = globalThis as unknown as {
  navopassPool?: Pool;
  navopassSchemaReady?: Promise<void>;
};

function poolConfig(): PoolConfig {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

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

async function ensureSchema() {
  if (!globalForDb.navopassSchemaReady) {
    globalForDb.navopassSchemaReady = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await pool.query(statement);
      }
    })().catch((error) => {
      globalForDb.navopassSchemaReady = undefined;
      throw error;
    });
  }

  await globalForDb.navopassSchemaReady;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  await ensureSchema();
  return pool.query<T>(text, values);
}
