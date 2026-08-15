import { Pool, types, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";
import { SCHEMA_STATEMENTS } from "@/lib/schema";

// PostgreSQL DATE (OID 1082) is a calendar day, not a timestamp.
// Keep it as YYYY-MM-DD to avoid timezone shifts and Date-object crashes.
types.setTypeParser(1082, (value) => value);

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
      const client = await pool.connect();
      try {
        // Next.js can start more than one worker. Serialize DDL across workers.
        await client.query("SELECT pg_advisory_lock($1,$2)", [71842, 90411]);
        for (let index = 0; index < SCHEMA_STATEMENTS.length; index += 1) {
          try {
            await client.query(SCHEMA_STATEMENTS[index]);
          } catch (error) {
            console.error("NavoPass schema migration failed", {
              statement: index + 1,
              preview: SCHEMA_STATEMENTS[index].replace(/\s+/g, " ").slice(0, 120),
              error,
            });
            throw error;
          }
        }
      } finally {
        await client.query("SELECT pg_advisory_unlock($1,$2)", [71842, 90411]).catch(() => undefined);
        client.release();
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

export async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
