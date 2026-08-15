import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type SchemaRow = {
  users: string | null;
  sessions: string | null;
  assets: string | null;
};

export async function GET() {
  try {
    const result = await query<SchemaRow>(
      `SELECT
        to_regclass('public.users')::text AS users,
        to_regclass('public.sessions')::text AS sessions,
        to_regclass('public.assets')::text AS assets`
    );

    const row = result.rows[0];
    const schemaReady = Boolean(row?.users && row?.sessions && row?.assets);

    if (!schemaReady) {
      return Response.json(
        { ok: false, service: "navopass", database: true, schema: false },
        { status: 503 }
      );
    }

    return Response.json({
      ok: true,
      service: "navopass",
      database: true,
      schema: true,
    });
  } catch {
    return Response.json(
      { ok: false, service: "navopass", database: false, schema: false },
      { status: 503 }
    );
  }
}
