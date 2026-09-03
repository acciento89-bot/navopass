import { getCurrentUser } from "@/lib/auth";
import { getAccessibleAssetByPublicId, getDocuments, getEvents, getShareableAsset } from "@/lib/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const user = await getCurrentUser();
  const asset = user
    ? await getAccessibleAssetByPublicId(user.id, publicId) ?? await getShareableAsset(publicId)
    : await getShareableAsset(publicId);
  if (!asset || asset.archived_at) return response({ error: "NOT_FOUND" }, 404);
  const privateAccess = Boolean(user && await getAccessibleAssetByPublicId(user.id, publicId));
  const [events, documents] = await Promise.all([
    getEvents(asset.id, !privateAccess),
    getDocuments(asset.id, !privateAccess),
  ]);
  return response({ asset, events, documents });
}
