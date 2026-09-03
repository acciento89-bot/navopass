"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { query } from "@/lib/db";
import { brandedMail, isMailConfigured, sendMail } from "@/lib/mailer";

function text(formData: FormData, key: string, max = 100) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

export async function sendTrackedServiceReportAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  const eventId = text(formData, "eventId", 80);
  const recipient = text(formData, "recipientEmail", 220).toLowerCase();
  const reportPath = `/app/assets/${assetId}/service/${eventId}/bericht`;
  if (!validEmail(recipient)) redirect(`${reportPath}?error=${encodeURIComponent("Bitte eine gültige E-Mail-Adresse angeben.")}`);
  if (!isMailConfigured()) redirect(`${reportPath}?error=${encodeURIComponent("E-Mail-Versand ist derzeit nicht konfiguriert.")}`);

  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) redirect("/app?error=Keine%20Berechtigung");
  const event = (await query<{id:string;title:string;event_date:string;created_by_user_id:string|null;report_asset_name:string|null}>(
    "SELECT id,title,event_date,created_by_user_id,report_asset_name FROM asset_events WHERE id=$1 AND asset_id=$2 AND event_type IN ('SERVICE','REPAIR','INSPECTION') LIMIT 1",
    [eventId, asset.id]
  )).rows[0];
  if (!event) redirect(`/app/assets/${asset.id}?error=Bericht%20nicht%20gefunden`);
  if (event.created_by_user_id !== user.id && !roleCanManage(asset, user.id)) {
    redirect(`${reportPath}?error=${encodeURIComponent("Du darfst diesen Bericht nicht an Dritte freigeben.")}`);
  }

  const recentCount = (await query<{ count: string }>(
    "SELECT count(*)::text AS count FROM service_report_shares WHERE created_by=$1 AND created_at>now()-interval '1 hour'",
    [user.id]
  )).rows[0];
  if (Number(recentCount?.count || 0) >= 20) {
    redirect(`${reportPath}?error=${encodeURIComponent("Zu viele Bericht-Freigaben in kurzer Zeit. Bitte später erneut versuchen.")}`);
  }
  const duplicate = (await query<{ id: string }>(
    "SELECT id FROM service_report_shares WHERE created_by=$1 AND event_id=$2 AND lower(recipient_email)=lower($3) AND created_at>now()-interval '5 minutes' AND revoked_at IS NULL LIMIT 1",
    [user.id,event.id,recipient]
  )).rows[0];
  if (duplicate) {
    redirect(`${reportPath}?error=${encodeURIComponent("Dieser Bericht wurde vor weniger als fünf Minuten bereits an diese Adresse freigegeben.")}`);
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const share = (await query<{ id: string }>(
    "INSERT INTO service_report_shares (asset_id,event_id,created_by,recipient_email,token_hash,expires_at) VALUES ($1,$2,$3,$4,$5,now()+interval '30 days') RETURNING id",
    [asset.id,event.id,user.id,recipient,tokenHash]
  )).rows[0];

  const appUrl = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
  const reportUrl = `${appUrl}/bericht/${rawToken}`;
  const date = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(`${event.event_date}T12:00:00`));
  const assetName = event.report_asset_name || asset.name;
  const subject = `NavoPass Bericht – ${assetName}`;
  const intro = `Der Bericht „${event.title}“ vom ${date} für ${assetName} wurde für dich bereitgestellt. Der geschützte Link ist 30 Tage gültig.`;
  try {
    await sendMail({
      to:recipient,
      subject,
      text:`${intro}\n\nBericht öffnen: ${reportUrl}\n\nNavoPass`,
      html:brandedMail({title:"Bericht ist fertig",intro,actionLabel:"Bericht öffnen",actionUrl:reportUrl,footer:"Der Link ist 30 Tage gültig und führt nur zu diesem Bericht."}),
    });
  } catch (error) {
    if (share?.id) await query("DELETE FROM service_report_shares WHERE id=$1 AND created_by=$2", [share.id,user.id]);
    console.error("NavoPass report mail failed", { assetId: asset.id, eventId: event.id, userId: user.id, error });
    redirect(`${reportPath}?error=${encodeURIComponent("Bericht konnte nicht versendet werden. Bitte später erneut versuchen.")}`);
  }
  revalidatePath(reportPath);
  redirect(`${reportPath}?sent=1`);
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
