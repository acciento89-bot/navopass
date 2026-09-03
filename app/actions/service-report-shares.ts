"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { query } from "@/lib/db";

function text(formData: FormData, key: string, max = 100) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function revokeServiceReportShareAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  const eventId = text(formData, "eventId", 80);
  const shareId = text(formData, "shareId", 80);
  if (!assetId || !eventId || !shareId) redirect("/app");

  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) redirect("/app?error=Keine%20Berechtigung");
  const share = (await query<{ id:string; created_by:string }>(
    "SELECT id,created_by FROM service_report_shares WHERE id=$1 AND asset_id=$2 AND event_id=$3 LIMIT 1",
    [shareId, asset.id, eventId]
  )).rows[0];
  if (!share || (share.created_by !== user.id && !roleCanManage(asset, user.id))) {
    redirect(`/app/assets/${asset.id}/service/${eventId}/bericht?error=${encodeURIComponent("Freigabe konnte nicht widerrufen werden.")}`);
  }

  await query("UPDATE service_report_shares SET revoked_at=COALESCE(revoked_at,now()),expires_at=LEAST(expires_at,now()) WHERE id=$1", [share.id]);
  revalidatePath(`/app/assets/${asset.id}/service/${eventId}/bericht`);
  redirect(`/app/assets/${asset.id}/service/${eventId}/bericht?revoked=1`);
}
