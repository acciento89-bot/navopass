import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.APP_URL || "https://navopass.de"));

  const [assets, events, documents] = await Promise.all([
    query("SELECT * FROM assets WHERE owner_id=$1 ORDER BY created_at", [user.id]),
    query(`SELECT e.* FROM asset_events e JOIN assets a ON a.id=e.asset_id WHERE a.owner_id=$1 ORDER BY e.created_at`, [user.id]),
    query(`SELECT d.* FROM asset_documents d JOIN assets a ON a.id=d.asset_id WHERE a.owner_id=$1 ORDER BY d.created_at`, [user.id]),
  ]);

  return NextResponse.json(
    {
      exported_at: new Date().toISOString(),
      account: { id: user.id, name: user.name, email: user.email },
      assets: assets.rows,
      events: events.rows,
      documents: documents.rows,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="navopass-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    }
  );
}
