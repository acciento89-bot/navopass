import { query } from "@/lib/db";
import { isMailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function GET() {
  const mailConfigured = isMailConfigured();
  try {
    const result = await query<{
      workspaces: boolean;
      workspace_members: boolean;
      workspace_invites: boolean;
      password_reset_tokens: boolean;
      email_verification_tokens: boolean;
      asset_workspace_column: boolean;
      reminder_column: boolean;
      terms_accepted_column: boolean;
      terms_version_column: boolean;
      privacy_acknowledged_column: boolean;
      plan_column: boolean;
      email_verified_column: boolean;
      document_size_column: boolean;
    }>(`
      SELECT
        to_regclass('public.workspaces') IS NOT NULL AS workspaces,
        to_regclass('public.workspace_members') IS NOT NULL AS workspace_members,
        to_regclass('public.workspace_invites') IS NOT NULL AS workspace_invites,
        to_regclass('public.password_reset_tokens') IS NOT NULL AS password_reset_tokens,
        to_regclass('public.email_verification_tokens') IS NOT NULL AS email_verification_tokens,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assets' AND column_name='workspace_id') AS asset_workspace_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='reminder_days') AS reminder_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='terms_accepted_at') AS terms_accepted_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='terms_version') AS terms_version_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='privacy_acknowledged_at') AS privacy_acknowledged_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='plan') AS plan_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email_verified_at') AS email_verified_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='asset_documents' AND column_name='size_bytes') AS document_size_column
    `);
    const schema = result.rows[0];
    const ok = Boolean(
      schema?.workspaces &&
      schema.workspace_members &&
      schema.workspace_invites &&
      schema.password_reset_tokens &&
      schema.email_verification_tokens &&
      schema.asset_workspace_column &&
      schema.reminder_column &&
      schema.terms_accepted_column &&
      schema.terms_version_column &&
      schema.privacy_acknowledged_column &&
      schema.plan_column &&
      schema.email_verified_column &&
      schema.document_size_column
    );
    return Response.json({ ok, service: "navopass", version: "0.5.0", database: true, mailConfigured, schema }, { status: ok ? 200 : 503 });
  } catch (error) {
    console.error("NavoPass health check failed", error);
    return Response.json({ ok: false, service: "navopass", version: "0.5.0", database: false, mailConfigured, schema: null }, { status: 503 });
  }
}
