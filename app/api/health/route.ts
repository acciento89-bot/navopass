import { stat } from "node:fs/promises";
import { join } from "node:path";
import { query } from "@/lib/db";
import { isMailConfigured } from "@/lib/mailer";
import { isStripeBillingConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function backupStatus() {
  const root = process.env.BACKUP_DIR || "/app/backups";
  try {
    const metadata = await stat(join(root, "latest", "metadata.txt"));
    const ageHours = Math.max(0, (Date.now() - metadata.mtimeMs) / 3_600_000);
    return { available: true, fresh: ageHours <= 36, ageHours: Number(ageHours.toFixed(1)) };
  } catch {
    return { available: false, fresh: false, ageHours: null as number | null };
  }
}

export async function GET() {
  const mailConfigured = isMailConfigured();
  const billingConfigured = isStripeBillingConfigured();
  const backup = await backupStatus();
  try {
    const result = await query<{
      workspaces: boolean;
      workspace_members: boolean;
      workspace_invites: boolean;
      password_reset_tokens: boolean;
      email_verification_tokens: boolean;
      action_rate_limits: boolean;
      stripe_events: boolean;
      billing_consents: boolean;
      cancellation_requests: boolean;
      withdrawal_requests: boolean;
      asset_workspace_column: boolean;
      reminder_column: boolean;
      terms_accepted_column: boolean;
      terms_version_column: boolean;
      privacy_acknowledged_column: boolean;
      plan_column: boolean;
      email_verified_column: boolean;
      stripe_customer_column: boolean;
      stripe_subscription_column: boolean;
      subscription_status_column: boolean;
      document_size_column: boolean;
    }>(`
      SELECT
        to_regclass('public.workspaces') IS NOT NULL AS workspaces,
        to_regclass('public.workspace_members') IS NOT NULL AS workspace_members,
        to_regclass('public.workspace_invites') IS NOT NULL AS workspace_invites,
        to_regclass('public.password_reset_tokens') IS NOT NULL AS password_reset_tokens,
        to_regclass('public.email_verification_tokens') IS NOT NULL AS email_verification_tokens,
        to_regclass('public.action_rate_limits') IS NOT NULL AS action_rate_limits,
        to_regclass('public.stripe_events') IS NOT NULL AS stripe_events,
        to_regclass('public.billing_consents') IS NOT NULL AS billing_consents,
        to_regclass('public.cancellation_requests') IS NOT NULL AS cancellation_requests,
        to_regclass('public.withdrawal_requests') IS NOT NULL AS withdrawal_requests,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assets' AND column_name='workspace_id') AS asset_workspace_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='reminder_days') AS reminder_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='terms_accepted_at') AS terms_accepted_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='terms_version') AS terms_version_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='privacy_acknowledged_at') AS privacy_acknowledged_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='plan') AS plan_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email_verified_at') AS email_verified_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='stripe_customer_id') AS stripe_customer_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='stripe_subscription_id') AS stripe_subscription_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='subscription_status') AS subscription_status_column,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='asset_documents' AND column_name='size_bytes') AS document_size_column
    `);
    const schema = result.rows[0];
    const ok = Boolean(
      schema?.workspaces &&
      schema.workspace_members &&
      schema.workspace_invites &&
      schema.password_reset_tokens &&
      schema.email_verification_tokens &&
      schema.action_rate_limits &&
      schema.stripe_events &&
      schema.billing_consents &&
      schema.cancellation_requests &&
      schema.withdrawal_requests &&
      schema.asset_workspace_column &&
      schema.reminder_column &&
      schema.terms_accepted_column &&
      schema.terms_version_column &&
      schema.privacy_acknowledged_column &&
      schema.plan_column &&
      schema.email_verified_column &&
      schema.stripe_customer_column &&
      schema.stripe_subscription_column &&
      schema.subscription_status_column &&
      schema.document_size_column
    );
    const productionReady = Boolean(ok && mailConfigured && billingConfigured && backup.fresh);
    return Response.json({ ok, productionReady, service: "navopass", version: "1.0.0", database: true, mailConfigured, billingConfigured, backup, schema }, { status: ok ? 200 : 503 });
  } catch (error) {
    console.error("NavoPass health check failed", error);
    return Response.json({ ok: false, productionReady: false, service: "navopass", version: "1.0.0", database: false, mailConfigured, billingConfigured, backup, schema: null }, { status: 503 });
  }
}
