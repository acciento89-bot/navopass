"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { query } from "@/lib/db";
import { canExecuteBusinessServiceJob, hasBusinessService } from "@/lib/entitlements";
import { brandedMail, isMailConfigured, sendMail } from "@/lib/mailer";

function text(formData: FormData, key: string, max = 1000) { return String(formData.get(key) ?? "").trim().slice(0, max); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function durationMinutes(formData: FormData) {
  const raw = text(formData, "estimatedDurationMinutes", 10);
  const parsed = raw ? Number(raw) : 60;
  return Number.isFinite(parsed) ? Math.max(15, Math.min(720, Math.round(parsed))) : 60;
}
const PRIORITIES = new Set(["LOW", "NORMAL", "HIGH"]);

function requireBusinessDispatch(user: Awaited<ReturnType<typeof requireUser>>) {
  if (!hasBusinessService(user)) redirect(`/preise?billingError=${encodeURIComponent("Service-Disposition, Kundenverwaltung und Technikerplanung sind im Business-Tarif enthalten.")}`);
}

async function validateAssignee(assetId: string, creatorId: string, assignedUserId: string) {
  if (!assignedUserId || assignedUserId === creatorId) return creatorId;
  const result = await query<{ id: string }>(
    `SELECT u.id
       FROM assets a
       JOIN workspace_members wm ON wm.workspace_id=a.workspace_id
       JOIN users u ON u.id=wm.user_id
      WHERE a.id=$1 AND u.id=$2 AND wm.role IN ('OWNER','ADMIN','EDITOR')
      LIMIT 1`,
    [assetId, assignedUserId]
  );
  return result.rows[0]?.id ?? null;
}

async function hasScheduleConflict(assignedUserId: string, scheduledFor: string | null, duration: number, excludeJobId?: string) {
  if (!scheduledFor) return false;
  const result = await query<{ id: string }>(
    `SELECT id
       FROM service_jobs
      WHERE assigned_user_id=$1
        AND status IN ('OPEN','IN_PROGRESS')
        AND scheduled_for IS NOT NULL
        AND ($4::uuid IS NULL OR id<>$4::uuid)
        AND scheduled_for < ($2::timestamptz + make_interval(mins => $3))
        AND (scheduled_for + make_interval(mins => estimated_duration_minutes)) > $2::timestamptz
      LIMIT 1`,
    [assignedUserId, scheduledFor, duration, excludeJobId || null]
  );
  return Boolean(result.rows[0]);
}

function scheduleConflictRedirect() {
  redirect(`/app/auftraege?error=${encodeURIComponent("Der geplante Zeitraum überschneidet sich mit einem anderen offenen Einsatz dieses Technikers. Bitte Termin, Dauer oder Techniker ändern.")}`);
}

export async function createServiceJobAction(formData: FormData) {
  const user = await requireUser();
  if (user.account_type !== "PROFESSIONAL") redirect("/app/profil?error=Serviceauftraege%20sind%20fuer%20berufliche%20Profile%20vorgesehen.");
  requireBusinessDispatch(user);
  await ensureCustomerSchema();
  const assetId = text(formData, "assetId", 80);
  const customerId = text(formData, "customerId", 80);
  const assignedUserId = text(formData, "assignedUserId", 80) || user.id;
  const title = text(formData, "title", 180) || "Wartung / Service";
  const scheduledFor = text(formData, "scheduledFor", 40) || null;
  const estimatedDurationMinutes = durationMinutes(formData);
  const notes = text(formData, "notes", 2000) || null;
  const priorityRaw = text(formData, "priority", 20) || "NORMAL";
  const priority = PRIORITIES.has(priorityRaw) ? priorityRaw : "NORMAL";
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset || !roleCanManage(asset, user.id)) redirect("/app/auftraege?error=Keine%20Berechtigung%20fuer%20diesen%20Objektpass.");
  const assignee = await validateAssignee(asset.id, user.id, assignedUserId);
  if (!assignee) redirect("/app/auftraege?error=Techniker%20hat%20keinen%20Bearbeitungszugriff%20auf%20diese%20Anlage.");
  if (await hasScheduleConflict(assignee, scheduledFor, estimatedDurationMinutes)) scheduleConflictRedirect();
  if (customerId) {
    const customer = await query<{ id: string }>("SELECT id FROM service_customers WHERE id=$1 AND user_id=$2 LIMIT 1", [customerId, user.id]);
    if (!customer.rows[0]) redirect("/app/auftraege?error=Kunde%20wurde%20nicht%20gefunden.");
  }
  await query(`INSERT INTO service_jobs (user_id,assigned_user_id,customer_id,asset_id,title,scheduled_for,estimated_duration_minutes,notes,priority) VALUES ($1,$2,$3,$4,$5,$6::timestamptz,$7,$8,$9)`, [user.id, assignee, customerId || null, asset.id, title, scheduledFor, estimatedDurationMinutes, notes, priority]);
  revalidatePath("/app/auftraege");
  if (customerId) revalidatePath(`/app/kunden/${customerId}`);
  redirect("/app/auftraege?success=Serviceauftrag%20wurde%20angelegt.");
}

export async function assignServiceJobAction(formData: FormData) {
  const user = await requireUser();
  requireBusinessDispatch(user);
  const jobId = text(formData, "jobId", 80);
  const assignedUserId = text(formData, "assignedUserId", 80) || user.id;
  const job = (await query<{ asset_id: string; scheduled_for: string | null; estimated_duration_minutes: number }>("SELECT asset_id,scheduled_for,estimated_duration_minutes FROM service_jobs WHERE id=$1 AND user_id=$2 LIMIT 1", [jobId, user.id])).rows[0];
  if (!job) redirect("/app/auftraege?error=Serviceauftrag%20nicht%20gefunden.");
  const assignee = await validateAssignee(job.asset_id, user.id, assignedUserId);
  if (!assignee) redirect("/app/auftraege?error=Techniker%20hat%20keinen%20Bearbeitungszugriff%20auf%20diese%20Anlage.");
  if (await hasScheduleConflict(assignee, job.scheduled_for, job.estimated_duration_minutes, jobId)) scheduleConflictRedirect();
  await query("UPDATE service_jobs SET assigned_user_id=$1,updated_at=now() WHERE id=$2 AND user_id=$3 AND status IN ('OPEN','IN_PROGRESS')", [assignee, jobId, user.id]);
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Techniker wurde zugewiesen.")}`);
}

export async function rescheduleServiceJobAction(formData: FormData) {
  const user = await requireUser();
  requireBusinessDispatch(user);
  const jobId = text(formData, "jobId", 80);
  const scheduledFor = text(formData, "scheduledFor", 40);
  if (!jobId || !scheduledFor) redirect(`/app/auftraege?error=${encodeURIComponent("Bitte einen neuen Termin auswählen.")}`);
  const job = (await query<{ assigned_user_id: string | null; estimated_duration_minutes: number }>("SELECT assigned_user_id,estimated_duration_minutes FROM service_jobs WHERE id=$1 AND user_id=$2 AND status IN ('OPEN','IN_PROGRESS') LIMIT 1", [jobId, user.id])).rows[0];
  if (!job) redirect(`/app/auftraege?error=${encodeURIComponent("Auftrag konnte nicht neu terminiert werden.")}`);
  if (job.assigned_user_id && await hasScheduleConflict(job.assigned_user_id, scheduledFor, job.estimated_duration_minutes, jobId)) scheduleConflictRedirect();
  await query("UPDATE service_jobs SET scheduled_for=$1::timestamptz,updated_at=now() WHERE id=$2 AND user_id=$3 AND status IN ('OPEN','IN_PROGRESS')", [scheduledFor, jobId, user.id]);
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Termin wurde aktualisiert.")}`);
}

export async function updateServiceJobDurationAction(formData: FormData) {
  const user = await requireUser();
  requireBusinessDispatch(user);
  const jobId = text(formData, "jobId", 80);
  const estimatedDurationMinutes = durationMinutes(formData);
  const job = (await query<{ assigned_user_id: string | null; scheduled_for: string | null }>("SELECT assigned_user_id,scheduled_for FROM service_jobs WHERE id=$1 AND user_id=$2 AND status IN ('OPEN','IN_PROGRESS') LIMIT 1", [jobId, user.id])).rows[0];
  if (!job) redirect(`/app/auftraege?error=${encodeURIComponent("Auftrag konnte nicht aktualisiert werden.")}`);
  if (job.assigned_user_id && await hasScheduleConflict(job.assigned_user_id, job.scheduled_for, estimatedDurationMinutes, jobId)) scheduleConflictRedirect();
  await query("UPDATE service_jobs SET estimated_duration_minutes=$1,updated_at=now() WHERE id=$2 AND user_id=$3", [estimatedDurationMinutes, jobId, user.id]);
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Geplante Einsatzdauer wurde aktualisiert.")}`);
}

export async function startServiceJobAction(formData: FormData) {
  const user = await requireUser();
  const jobId = text(formData, "jobId", 80);
  if (!await canExecuteBusinessServiceJob(user.id, jobId)) redirect(`/app/auftraege?error=${encodeURIComponent("Dieser Serviceauftrag ist nicht durch einen aktiven Business-Tarif freigeschaltet.")}`);
  await query("UPDATE service_jobs SET status='IN_PROGRESS',started_at=COALESCE(started_at,now()),updated_at=now() WHERE id=$1 AND (user_id=$2 OR assigned_user_id=$2) AND status='OPEN'", [jobId, user.id]);
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Serviceauftrag wurde gestartet.")}`);
}

export async function reopenServiceJobAction(formData: FormData) {
  const user = await requireUser();
  const jobId = text(formData, "jobId", 80);
  if (!await canExecuteBusinessServiceJob(user.id, jobId)) redirect(`/app/auftraege?error=${encodeURIComponent("Dieser Serviceauftrag ist nicht durch einen aktiven Business-Tarif freigeschaltet.")}`);
  await query("UPDATE service_jobs SET status='OPEN',started_at=NULL,updated_at=now() WHERE id=$1 AND (user_id=$2 OR assigned_user_id=$2) AND status='IN_PROGRESS'", [jobId, user.id]);
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Serviceauftrag wurde zurück auf offen gesetzt.")}`);
}

export async function cancelServiceJobAction(formData: FormData) {
  const user = await requireUser();
  requireBusinessDispatch(user);
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
