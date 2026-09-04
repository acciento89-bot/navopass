import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { findUserByEmail, verifyPassword, type CurrentUser } from "@/lib/auth";
import { getBillingState } from "@/lib/billing";
import { query } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/app/uploads";

export type AccountDeletionFailure =
  | "INVALID_PASSWORD"
  | "SHARED_WORKSPACES_EXIST"
  | "SUBSCRIPTION_CANCEL_FAILED";

export function isAccountDeletionConfirmation(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  return normalized === "DELETE" || normalized === "LÖSCHEN" || normalized === "LOESCHEN";
}

export async function deleteAccountForUser(
  user: CurrentUser,
  password: string,
): Promise<{ ok: true } | { ok: false; error: AccountDeletionFailure }> {
  const row = await findUserByEmail(user.email);
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return { ok: false, error: "INVALID_PASSWORD" };
  }

  const ownedShared = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM workspaces w
     WHERE w.owner_id=$1 AND w.kind<>'PERSONAL'
       AND EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=w.id AND wm.user_id<>$1)`,
    [user.id],
  );
  if ((ownedShared.rows[0]?.count ?? 0) > 0) {
    return { ok: false, error: "SHARED_WORKSPACES_EXIST" };
  }

  const billing = await getBillingState(user.id);
  if (
    billing.stripe_subscription_id &&
    billing.subscription_status !== "canceled" &&
    billing.subscription_status !== "incomplete_expired"
  ) {
    try {
      await getStripe().subscriptions.cancel(billing.stripe_subscription_id);
    } catch (error) {
      console.error("NavoPass subscription cancellation before account deletion failed", error);
      return { ok: false, error: "SUBSCRIPTION_CANCEL_FAILED" };
    }
  }

  await query(
    `UPDATE assets a SET owner_id=w.owner_id
     FROM workspaces w
     WHERE a.owner_id=$1 AND a.workspace_id=w.id AND w.owner_id<>$1`,
    [user.id],
  );

  const documents = await query<{ id: string; url: string }>(
    `SELECT d.id,d.url FROM asset_documents d
     JOIN assets a ON a.id=d.asset_id
     WHERE a.owner_id=$1`,
    [user.id],
  );

  await query("DELETE FROM users WHERE id=$1", [user.id]);
  await Promise.all(
    documents.rows.map(async (document) => {
      if (document.url.startsWith(`/api/files/${document.id}/`)) {
        await unlink(join(UPLOAD_ROOT, document.id)).catch(() => undefined);
      }
    }),
  );

  return { ok: true };
}
