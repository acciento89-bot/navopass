import { query } from "@/lib/db";

export type Plan = "FREE" | "PLUS" | "FAMILY" | "BUSINESS";

export type PlanDefinition = {
  id: Plan;
  name: string;
  monthlyCents: number;
  yearlyCents: number;
  maxAssets: number;
  maxStorageBytes: number;
  maxSeats: number;
  maxSharedWorkspaces: number | null;
  description: string;
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export const PLAN_CONFIG: Record<Plan, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    monthlyCents: 0,
    yearlyCents: 0,
    maxAssets: 5,
    maxStorageBytes: 250 * MB,
    maxSeats: 1,
    maxSharedWorkspaces: 0,
    description: "Zum Kennenlernen und für die wichtigsten persönlichen Dinge.",
  },
  PLUS: {
    id: "PLUS",
    name: "Plus",
    monthlyCents: 799,
    yearlyCents: 7900,
    maxAssets: 75,
    maxStorageBytes: 5 * GB,
    maxSeats: 1,
    maxSharedWorkspaces: 0,
    description: "Für private Nutzer mit vielen Geräten, Fahrzeugen und Dokumenten.",
  },
  FAMILY: {
    id: "FAMILY",
    name: "Family",
    monthlyCents: 1299,
    yearlyCents: 12900,
    maxAssets: 250,
    maxStorageBytes: 20 * GB,
    maxSeats: 6,
    maxSharedWorkspaces: 3,
    description: "Für Familien und Haushalte, die Dinge gemeinsam verwalten.",
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    monthlyCents: 3999,
    yearlyCents: 39900,
    maxAssets: 1000,
    maxStorageBytes: 50 * GB,
    maxSeats: 10,
    maxSharedWorkspaces: null,
    description: "Für Teams und kleinere Unternehmen mit Betriebsmitteln und Wartungen.",
  },
};

export function normalizePlan(value: unknown): Plan {
  return value === "PLUS" || value === "FAMILY" || value === "BUSINESS" ? value : "FREE";
}

export function getPlanDefinition(plan: unknown) {
  return PLAN_CONFIG[normalizePlan(plan)];
}

export function formatStorage(bytes: number) {
  if (bytes >= GB) return `${(bytes / GB).toLocaleString("de-DE", { maximumFractionDigits: 1 })} GB`;
  return `${Math.max(0, Math.round(bytes / MB)).toLocaleString("de-DE")} MB`;
}

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export type PlanUsage = {
  assets: number;
  storageBytes: number;
  seats: number;
  sharedWorkspaces: number;
};

export async function getUserPlan(userId: string): Promise<Plan> {
  const result = await query<{ plan: string | null }>("SELECT plan FROM users WHERE id=$1 LIMIT 1", [userId]);
  return normalizePlan(result.rows[0]?.plan);
}

export async function getPlanUsage(ownerId: string): Promise<PlanUsage> {
  const [assets, storage, seats, workspaces] = await Promise.all([
    query<{ count: number }>("SELECT count(*)::int AS count FROM assets WHERE owner_id=$1", [ownerId]),
    query<{ bytes: string }>(
      `SELECT COALESCE(sum(COALESCE(d.size_bytes,0)),0)::text AS bytes
       FROM asset_documents d JOIN assets a ON a.id=d.asset_id
       WHERE a.owner_id=$1`,
      [ownerId]
    ),
    query<{ count: number }>(
      `SELECT count(DISTINCT wm.user_id)::int AS count
       FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id
       WHERE w.owner_id=$1`,
      [ownerId]
    ),
    query<{ count: number }>(
      "SELECT count(*)::int AS count FROM workspaces WHERE owner_id=$1 AND kind<>'PERSONAL'",
      [ownerId]
    ),
  ]);

  return {
    assets: assets.rows[0]?.count ?? 0,
    storageBytes: Number(storage.rows[0]?.bytes ?? 0),
    seats: Math.max(1, seats.rows[0]?.count ?? 0),
    sharedWorkspaces: workspaces.rows[0]?.count ?? 0,
  };
}

export async function getReservedSeatCount(ownerId: string) {
  const result = await query<{ count: number }>(
    `WITH emails AS (
       SELECT lower(u.email) AS email
       FROM workspace_members wm
       JOIN workspaces w ON w.id=wm.workspace_id
       JOIN users u ON u.id=wm.user_id
       WHERE w.owner_id=$1
       UNION
       SELECT lower(i.email) AS email
       FROM workspace_invites i
       JOIN workspaces w ON w.id=i.workspace_id
       WHERE w.owner_id=$1 AND i.accepted_at IS NULL AND i.expires_at>now()
     )
     SELECT count(DISTINCT email)::int AS count FROM emails`,
    [ownerId]
  );
  return Math.max(1, result.rows[0]?.count ?? 0);
}

export async function getAccountPlanState(ownerId: string) {
  const plan = await getUserPlan(ownerId);
  const definition = PLAN_CONFIG[plan];
  const usage = await getPlanUsage(ownerId);
  return { plan, definition, usage };
}

export async function canCreateAsset(ownerId: string) {
  const { definition, usage } = await getAccountPlanState(ownerId);
  return { allowed: usage.assets < definition.maxAssets, definition, usage };
}

export async function canUploadBytes(ownerId: string, additionalBytes: number) {
  const { definition, usage } = await getAccountPlanState(ownerId);
  return { allowed: usage.storageBytes + Math.max(0, additionalBytes) <= definition.maxStorageBytes, definition, usage };
}

export async function canCreateSharedWorkspace(ownerId: string) {
  const { definition, usage } = await getAccountPlanState(ownerId);
  const limit = definition.maxSharedWorkspaces;
  return { allowed: limit === null || usage.sharedWorkspaces < limit, definition, usage };
}

export async function canReserveSeat(ownerId: string, email?: string) {
  const plan = await getUserPlan(ownerId);
  const definition = PLAN_CONFIG[plan];
  if (email) {
    const existing = await query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM workspace_members wm
         JOIN workspaces w ON w.id=wm.workspace_id
         JOIN users u ON u.id=wm.user_id
         WHERE w.owner_id=$1 AND lower(u.email)=lower($2)
         UNION ALL
         SELECT 1 FROM workspace_invites i
         JOIN workspaces w ON w.id=i.workspace_id
         WHERE w.owner_id=$1 AND lower(i.email)=lower($2) AND i.accepted_at IS NULL AND i.expires_at>now()
       ) AS exists`,
      [ownerId, email]
    );
    if (existing.rows[0]?.exists) return { allowed: true, definition, reserved: await getReservedSeatCount(ownerId) };
  }
  const reserved = await getReservedSeatCount(ownerId);
  return { allowed: reserved < definition.maxSeats, definition, reserved };
}
