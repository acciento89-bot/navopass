import type { CurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export type BusinessUser = Pick<CurrentUser, "id" | "plan" | "account_type">;

export function hasBusinessService(user: BusinessUser) {
  return user.account_type === "PROFESSIONAL" && user.plan === "BUSINESS";
}

export async function canExecuteBusinessServiceJob(userId: string, jobId: string, assetId?: string | null) {
  const result = await query<{ id: string }>(
    `SELECT j.id
       FROM service_jobs j
       JOIN users owner ON owner.id=j.user_id
      WHERE j.id=$1
        AND owner.plan='BUSINESS'
        AND (j.user_id=$2 OR j.assigned_user_id=$2)
        AND ($3::uuid IS NULL OR j.asset_id=$3::uuid)
        AND j.status IN ('OPEN','IN_PROGRESS')
      LIMIT 1`,
    [jobId, userId, assetId || null]
  );
  return Boolean(result.rows[0]);
}

export async function hasBusinessOwnedJob(userId: string, jobId: string) {
  const result = await query<{ id: string }>(
    `SELECT id FROM service_jobs WHERE id=$1 AND user_id=$2 AND status IN ('OPEN','IN_PROGRESS') LIMIT 1`,
    [jobId, userId]
  );
  return Boolean(result.rows[0]);
}
