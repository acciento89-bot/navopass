import { getCurrentUser } from "@/lib/auth";
import { getDocuments, getEvents, getOwnedAsset, roleCanEdit, roleCanManage } from "@/lib/assets";
import { listPendingServiceInvites, listServiceGrants } from "@/lib/service-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return response({ error: "UNAUTHENTICATED" }, 401);
  const { id } = await params;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset) return response({ error: "NOT_FOUND" }, 404);
  const canManage = roleCanManage(asset, user.id);
  const [events, documents, grants, invites] = await Promise.all([
    getEvents(asset.id),
    getDocuments(asset.id),
    canManage ? listServiceGrants(asset.id) : Promise.resolve([]),
    canManage ? listPendingServiceInvites(asset.id) : Promise.resolve([]),
  ]);
  return response({ asset, events, documents, serviceAccess: { grants, invites }, permissions: { canEdit: roleCanEdit(asset, user.id), canManage } });
}
