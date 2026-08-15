import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await query<{
      workspaces: boolean;
      workspace_members: boolean;
      workspace_invites: boolean;
      asset_workspace_column: boolean;
      reminder_column: boolean;
      terms_accepted_column: boolean;
      terms_version_column: boolean;
      privacy_acknowledged_column: boolean;
      plan_column: boolean;
      document_size_column: boolean;
    }>(`
      SELECT
        to_regclass('public.workspaces') IS NOT NULL AS workspaces,
        to_regclass('public.workspace_members') IS NOT NULL AS workspace_members,
        to_regclass('public.workspace_invites') IS NOT NULL AS workspace_invites,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assets' AND column_name='workspace_id') AS asset_workspace_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='reminder_days') AS reminder_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='terms_accepted_at') AS terms_accepted_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='terms_version') AS terms_version_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='privacy_acknowledged_at') AS privacy_acknowledged_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='plan') AS plan_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='asset_documents' AND column_name='size_bytes') AS document_size_column
    `);
    const schema = result.rows[0];
    const ok = Boolean(
      schema?.workspaces &&
      schema.workspace_members &&
      schema.workspace_invites &&
      schema.asset_workspace_column &&
      schema.reminder_column &&
      schema.terms_accepted_column &&
      schema.terms_version_column &&
      schema.privacy_acknowledged_column &&
      schema.plan_column &&
      schema.document_size_column
    );
    return Response.json({ ok, service: "navopass", version: "0.5.0", database: true, schema }, { status: ok ? 200 : 503 });
  } catch (error) {
    console.error("NavoPass health check failed", error);
    return Response.json({ ok: false, service: "navopass", version: "0.5.0", database: false, schema: null }, { status: 503 });
  }
}
