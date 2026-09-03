import { getCurrentUser } from "@/lib/auth";
import { getDocuments, getEvents, getOwnedAsset, roleCanEdit } from "@/lib/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return response({ error: "UNAUTHENTICATED" }, 401);
  const { id } = await params;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset) return response({ error: "NOT_FOUND" }, 404);
  const [events, documents] = await Promise.all([getEvents(asset.id), getDocuments(asset.id)]);
  return response({ asset, events, documents, permissions: { canEdit: roleCanEdit(asset, user.id) } });
}

