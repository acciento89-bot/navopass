"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { query } from "@/lib/db";
import { brandedMail, isMailConfigured, sendMail } from "@/lib/mailer";

function text(formData: FormData, key: string, max = 1000) { return String(formData.get(key) ?? "").trim().slice(0, max); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
const PRIORITIES = new Set(["LOW", "NORMAL", "HIGH"]);

export async function createServiceJobAction(formData: FormData) {
  const user = await requireUser();
  if (user.account_type !== "PROFESSIONAL") redirect("/app/profil?error=Serviceauftraege%20sind%20fuer%20berufliche%20Profile%20vorgesehen.");
  await ensureCustomerSchema();
  const assetId = text(formData, "assetId", 80);
  const customerId = text(formData, "customerId", 80);
  const title = text(formData, "title", 180) || "Wartung / Service";
  const scheduledFor = text(formData, "scheduledFor", 40) || null;
  const notes = text(formData, "notes", 2000) || null;
  const priorityRaw = text(formData, "priority", 20) || "NORMAL";
  const priority = PRIORITIES.has(priorityRaw) ? priorityRaw : "NORMAL";
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset || !roleCanManage(asset, user.id)) redirect("/app/auftraege?error=Keine%20Berechtigung%20fuer%20diesen%20Objektpass.");
  if (customerId) {
    const customer = await query<{ id: string }>("SELECT id FROM service_customers WHERE id=$1 AND user_id=$2 LIMIT 1", [customerId, user.id]);
    if (!customer.rows[0]) redirect("/app/auftraege?error=Kunde%20wurde%20nicht%20gefunden.");
  }
  await query(`INSERT INTO service_jobs (user_id,customer_id,asset_id,title,scheduled_for,notes,priority) VALUES ($1,$2,$3,$4,$5::timestamptz,$6,$7)`, [user.id, customerId || null, asset.id, title, scheduledFor, notes, priority]);
  revalidatePath("/app/auftraege");
  if (customerId) revalidatePath(`/app/kunden/${customerId}`);
  redirect("/app/auftraege?success=Serviceauftrag%20wurde%20angelegt.");
}

export async function startServiceJobAction(formData: FormData) {
  const user = await requireUser();
  const jobId = text(formData, "jobId", 80);
  await query("UPDATE service_jobs SET status='IN_PROGRESS',started_at=COALESCE(started_at,now()),updated_at=now() WHERE id=$1 AND user_id=$2 AND status='OPEN'", [jobId, user.id]);
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Serviceauftrag wurde gestartet.")}`);
}

export async function reopenServiceJobAction(formData: FormData) {
  const user = await requireUser();
  const jobId = text(formData, "jobId", 80);
  await query("UPDATE service_jobs SET status='OPEN',started_at=NULL,updated_at=now() WHERE id=$1 AND user_id=$2 AND status='IN_PROGRESS'", [jobId, user.id]);
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Serviceauftrag wurde zurück auf offen gesetzt.")}`);
}

export async function cancelServiceJobAction(formData: FormData) {
  const user = await requireUser();
  const jobId = text(formData, "jobId", 80);
  await query("UPDATE service_jobs SET status='CANCELLED',updated_at=now() WHERE id=$1 AND user_id=$2 AND status IN ('OPEN','IN_PROGRESS')", [jobId, user.id]);
  revalidatePath("/app/auftraege");
}

export async function sendServiceReportAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  const eventId = text(formData, "eventId", 80);
  const recipient = text(formData, "recipientEmail", 220).toLowerCase();
  if (!validEmail(recipient)) redirect(`/app/assets/${assetId}/service/${eventId}/bericht?error=${encodeURIComponent("Bitte eine gültige E-Mail-Adresse angeben.")}`);
  if (!isMailConfigured()) redirect(`/app/assets/${assetId}/service/${eventId}/bericht?error=${encodeURIComponent("E-Mail-Versand ist derzeit nicht konfiguriert.")}`);
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) redirect("/app?error=Keine%20Berechtigung");
  const event = (await query<{ id: string; title: string; event_date: string }>("SELECT id,title,event_date FROM asset_events WHERE id=$1 AND asset_id=$2 AND event_type IN ('SERVICE','REPAIR','INSPECTION') LIMIT 1", [eventId, asset.id])).rows[0];
  if (!event) redirect(`/app/assets/${asset.id}?error=Servicebericht%20nicht%20gefunden`);
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await query(`INSERT INTO service_report_shares (asset_id,event_id,created_by,recipient_email,token_hash,expires_at) VALUES ($1,$2,$3,$4,$5,now()+interval '30 days')`, [asset.id,event.id,user.id,recipient,tokenHash]);
  const appUrl = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
  const reportUrl = `${appUrl}/bericht/${rawToken}`;
  const date = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(`${event.event_date}T12:00:00`));
  const subject = `NavoPass Servicebericht – ${asset.name}`;
  const intro = `Der Servicebericht „${event.title}“ vom ${date} für ${asset.name} wurde für dich bereitgestellt. Der geschützte Link ist 30 Tage gültig.`;
  await sendMail({to:recipient,subject,text:`${intro}\n\nBericht öffnen: ${reportUrl}\n\nNavoPass`,html:brandedMail({title:"Servicebericht ist fertig",intro,actionLabel:"Servicebericht öffnen",actionUrl:reportUrl,footer:"Der Link ist 30 Tage gültig und führt nur zu diesem Servicebericht."})});
  revalidatePath(`/app/assets/${asset.id}/service/${event.id}/bericht`);
  redirect(`/app/assets/${asset.id}/service/${event.id}/bericht?sent=1`);
}
