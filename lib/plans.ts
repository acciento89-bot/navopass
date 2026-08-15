import { stat } from "node:fs/promises";
import { join } from "node:path";
import { query } from "@/lib/db";
import { PLAN_CONFIG, normalizePlan, type Plan } from "@/lib/plan-config";

export { PLAN_CONFIG, formatEuro, formatStorage, getPlanDefinition, normalizePlan, type Plan, type PlanDefinition } from "@/lib/plan-config";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/app/uploads";

export type PlanUsage = { assets:number; storageBytes:number; seats:number; sharedWorkspaces:number };

export async function getUserPlan(userId: string): Promise<Plan> {
  const result = await query<{ plan: string | null }>("SELECT plan FROM users WHERE id=$1 LIMIT 1", [userId]);
  return normalizePlan(result.rows[0]?.plan);
}

async function backfillLegacyUploadSizes(ownerId: string) {
  const result = await query<{ id:string }>(
    `SELECT d.id FROM asset_documents d JOIN assets a ON a.id=d.asset_id
     WHERE a.owner_id=$1 AND d.size_bytes=0 AND d.url LIKE '/api/files/%' LIMIT 250`,
    [ownerId]
  );
  if (!result.rows.length) return;
  await Promise.all(result.rows.map(async ({ id }) => {
    try {
      const info = await stat(join(UPLOAD_ROOT, id));
      if (info.size > 0) await query("UPDATE asset_documents SET size_bytes=$1 WHERE id=$2 AND size_bytes=0", [info.size, id]);
    } catch {
      // A missing legacy file should not break account access or quota calculations.
    }
  }));
}

export async function getPlanUsage(ownerId: string): Promise<PlanUsage> {
  await backfillLegacyUploadSizes(ownerId);
  const [assets, storage, seats, workspaces] = await Promise.all([
    query<{ count: number }>("SELECT count(*)::int AS count FROM assets WHERE owner_id=$1", [ownerId]),
    query<{ bytes: string }>(`SELECT COALESCE(sum(COALESCE(d.size_bytes,0)),0)::text AS bytes FROM asset_documents d JOIN assets a ON a.id=d.asset_id WHERE a.owner_id=$1`, [ownerId]),
    query<{ count: number }>(`SELECT count(DISTINCT wm.user_id)::int AS count FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id WHERE w.owner_id=$1`, [ownerId]),
    query<{ count: number }>("SELECT count(*)::int AS count FROM workspaces WHERE owner_id=$1 AND kind<>'PERSONAL'", [ownerId]),
  ]);
  return { assets:assets.rows[0]?.count??0, storageBytes:Number(storage.rows[0]?.bytes??0), seats:Math.max(1,seats.rows[0]?.count??0), sharedWorkspaces:workspaces.rows[0]?.count??0 };
}

export async function getReservedSeatCount(ownerId: string) {
  const result = await query<{ count:number }>(`WITH emails AS (
    SELECT lower(u.email) AS email FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id JOIN users u ON u.id=wm.user_id WHERE w.owner_id=$1
    UNION
    SELECT lower(i.email) AS email FROM workspace_invites i JOIN workspaces w ON w.id=i.workspace_id WHERE w.owner_id=$1 AND i.accepted_at IS NULL AND i.expires_at>now()
  ) SELECT count(DISTINCT email)::int AS count FROM emails`, [ownerId]);
  return Math.max(1,result.rows[0]?.count??0);
}

export async function getAccountPlanState(ownerId: string) { const plan=await getUserPlan(ownerId); const definition=PLAN_CONFIG[plan]; const usage=await getPlanUsage(ownerId); return {plan,definition,usage}; }
export async function canCreateAsset(ownerId: string) { const {definition,usage}=await getAccountPlanState(ownerId); return {allowed:usage.assets<definition.maxAssets,definition,usage}; }
export async function canUploadBytes(ownerId: string, additionalBytes: number) { const {definition,usage}=await getAccountPlanState(ownerId); return {allowed:usage.storageBytes+Math.max(0,additionalBytes)<=definition.maxStorageBytes,definition,usage}; }
export async function canCreateSharedWorkspace(ownerId: string) { const {definition,usage}=await getAccountPlanState(ownerId); const limit=definition.maxSharedWorkspaces; return {allowed:limit===null||usage.sharedWorkspaces<limit,definition,usage}; }

export async function canReserveSeat(ownerId: string, email?: string) {
  const plan=await getUserPlan(ownerId); const definition=PLAN_CONFIG[plan];
  if(email){
    const existing=await query<{exists:boolean}>(`SELECT EXISTS (
      SELECT 1 FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id JOIN users u ON u.id=wm.user_id WHERE w.owner_id=$1 AND lower(u.email)=lower($2)
      UNION ALL
      SELECT 1 FROM workspace_invites i JOIN workspaces w ON w.id=i.workspace_id WHERE w.owner_id=$1 AND lower(i.email)=lower($2) AND i.accepted_at IS NULL AND i.expires_at>now()
    ) AS exists`,[ownerId,email]);
    if(existing.rows[0]?.exists)return {allowed:true,definition,reserved:await getReservedSeatCount(ownerId)};
  }
  const reserved=await getReservedSeatCount(ownerId); return {allowed:reserved<definition.maxSeats,definition,reserved};
}
