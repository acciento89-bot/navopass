import { getCurrentUser } from "@/lib/auth";
import { listAssets, newPublicId } from "@/lib/assets";
import { query } from "@/lib/db";
import { canCreateAsset } from "@/lib/plans";
import { canEdit, listUserWorkspaces } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISIBILITIES = new Set(["PRIVATE", "LINK", "PUBLIC"]);
function value(input: unknown, max: number) { const result = typeof input === "string" ? input.trim().slice(0, max) : ""; return result || null; }
function date(input: unknown) { const result = value(input, 10); return result && /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null; }
function response(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return response({ error: "UNAUTHENTICATED" }, 401);
  return response({ assets: await listAssets(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return response({ error: "UNAUTHENTICATED" }, 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return response({ error: "INVALID_CONTENT_TYPE" }, 415);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = value(body?.name, 160);
  if (!name) return response({ error: "NAME_REQUIRED" }, 422);

  const workspaces = (await listUserWorkspaces(user.id)).filter((item) => canEdit(item.role));
  const requestedWorkspaceId = value(body?.workspaceId, 80);
  const workspace = workspaces.find((item) => item.id === requestedWorkspaceId) ?? workspaces.find((item) => item.kind === "PERSONAL");
  if (!workspace) return response({ error: "NO_WRITABLE_WORKSPACE" }, 403);
  const capacity = await canCreateAsset(workspace.owner_id);
  if (!capacity.allowed) return response({ error: "ASSET_LIMIT_REACHED", plan: capacity.definition.name, maxAssets: capacity.definition.maxAssets }, 409);

  const visibilityInput = value(body?.visibility, 20) ?? "LINK";
  const visibility = VISIBILITIES.has(visibilityInput) ? visibilityInput : "LINK";
  const intervalInput = typeof body?.serviceIntervalMonths === "number" ? body.serviceIntervalMonths : Number(body?.serviceIntervalMonths);
  const interval = Number.isFinite(intervalInput) ? Math.max(1, Math.min(120, Math.round(intervalInput))) : 12;
  const result = await query<{ id: string }>(
    `INSERT INTO assets (owner_id,workspace_id,public_id,name,category,manufacturer,model,serial_number,purchase_date,warranty_until,next_service_date,service_interval_months,location,notes,visibility)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [workspace.owner_id, workspace.id, newPublicId(), name, value(body?.category, 80) ?? "Other", value(body?.manufacturer, 160), value(body?.model, 160), value(body?.serialNumber, 160), date(body?.purchaseDate), date(body?.warrantyUntil), date(body?.nextServiceDate), interval, value(body?.location, 200), value(body?.notes, 5000), visibility]
  );
  return response({ asset: (await listAssets(user.id)).find((item) => item.id === result.rows[0].id) }, 201);
}

