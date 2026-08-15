import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.APP_URL || "https://navopass.de"));

  const [assets, events, documents, memberships, invites] = await Promise.all([
    query("SELECT * FROM assets WHERE owner_id=$1 ORDER BY created_at", [user.id]),
    query(`SELECT e.* FROM asset_events e JOIN assets a ON a.id=e.asset_id WHERE a.owner_id=$1 ORDER BY e.created_at`, [user.id]),
    query(`SELECT d.* FROM asset_documents d JOIN assets a ON a.id=d.asset_id WHERE a.owner_id=$1 ORDER BY d.created_at`, [user.id]),
    query(`SELECT w.id,w.name,w.kind,wm.role,wm.created_at FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id WHERE wm.user_id=$1 ORDER BY wm.created_at`, [user.id]),
    query(`SELECT i.id,i.email,i.role,i.expires_at,i.accepted_at,i.created_at,w.name AS workspace_name FROM workspace_invites i JOIN workspaces w ON w.id=i.workspace_id WHERE i.created_by=$1 ORDER BY i.created_at`, [user.id]),
  ]);

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    account: { id: user.id, name: user.name, email: user.email, reminder_days: user.reminder_days ?? 30, plan: user.plan ?? "FREE" },
    workspace_memberships: memberships.rows,
    invitations_created_by_me: invites.rows,
    owned_assets: assets.rows,
    events_on_owned_assets: events.rows,
    documents_on_owned_assets: documents.rows,
  }, { headers: { "Content-Disposition": `attachment; filename="navopass-export-${new Date().toISOString().slice(0,10)}.json"`, "Cache-Control": "private, no-store" } });
}
