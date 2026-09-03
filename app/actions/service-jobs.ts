"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { query } from "@/lib/db";
import { canExecuteBusinessServiceJob, hasBusinessService } from "@/lib/entitlements";
import { berlinLocalDateTimeToUtcIso } from "@/lib/timezone";

function text(formData: FormData, key: string, max = 1000) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}
function durationMinutes(formData: FormData) {
  const raw = text(formData, "estimatedDurationMinutes", 10);
  const parsed = raw ? Number(raw) : 60;
  return Number.isFinite(parsed) ? Math.max(15, Math.min(720, Math.round(parsed))) : 60;
}
const PRIORITIES = new Set(["LOW", "NORMAL", "HIGH"]);

function requireBusinessDispatch(user: Awaited<ReturnType<typeof requireUser>>) {
  if (!hasBusinessService(user)) {
    redirect(`/preise?billingError=${encodeURIComponent("Kundenverwaltung, Einsatzplanung und Teamzuweisung sind im Business-Tarif enthalten.")}`);
  }
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

async function customerForAsset(assetId: string, ownerId: string) {
  const result = await query<{ service_customer_id: string | null }>(
    `SELECT a.service_customer_id
       FROM assets a
       LEFT JOIN service_customers c ON c.id=a.service_customer_id
      WHERE a.id=$1 AND (a.service_customer_id IS NULL OR c.user_id=$2)
      LIMIT 1`,
    [assetId, ownerId]
  );
  return result.rows[0];
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
  redirect(`/app/auftraege?error=${encodeURIComponent("Der geplante Zeitraum überschneidet sich mit einem anderen offenen Einsatz dieser Person. Bitte Termin, Dauer oder Zuweisung ändern.")}`);
}

function scheduledValue(formData: FormData) {
  const raw = text(formData, "scheduledFor", 40);
  if (!raw) return null;
  const iso = berlinLocalDateTimeToUtcIso(raw);
  if (!iso) redirect(`/app/auftraege?error=${encodeURIComponent("Der ausgewählte Termin ist ungültig.")}`);
  return iso;
}

export async function createServiceJobAction(formData: FormData) {
  const user = await requireUser();
  if (user.account_type !== "PROFESSIONAL") {
    redirect("/app/profil?error=Einsatzplanung%20ist%20fuer%20berufliche%20Profile%20vorgesehen.");
  }
  requireBusinessDispatch(user);
  await ensureCustomerSchema();

  const assetId = text(formData, "assetId", 80);
  const assignedUserId = text(formData, "assignedUserId", 80) || user.id;
  const title = text(formData, "title", 180) || "Service / Einsatz";
  const scheduledFor = scheduledValue(formData);
  const estimatedDurationMinutes = durationMinutes(formData);
  const notes = text(formData, "notes", 2000) || null;
  const priorityRaw = text(formData, "priority", 20) || "NORMAL";
  const priority = PRIORITIES.has(priorityRaw) ? priorityRaw : "NORMAL";

  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset || !roleCanManage(asset, user.id)) {
    redirect("/app/auftraege?error=Keine%20Berechtigung%20fuer%20diesen%20Objektpass.");
  }
  const customerLink = await customerForAsset(asset.id, user.id);
  if (!customerLink) {
    redirect(`/app/auftraege?error=${encodeURIComponent("Die Kundenzuordnung dieses Objekts ist ungültig. Bitte den Objektpass zuerst korrigieren.")}`);
  }
  const customerId = customerLink.service_customer_id;

  const assignee = await validateAssignee(asset.id, user.id, assignedUserId);
  if (!assignee) {
    redirect(`/app/auftraege?error=${encodeURIComponent("Die ausgewählte Person hat keinen Bearbeitungszugriff auf dieses Objekt.")}`);
  }
  if (await hasScheduleConflict(assignee, scheduledFor, estimatedDurationMinutes)) scheduleConflictRedirect();

  await query(
    `INSERT INTO service_jobs (user_id,assigned_user_id,customer_id,asset_id,title,scheduled_for,estimated_duration_minutes,notes,priority)
     VALUES ($1,$2,$3,$4,$5,$6::timestamptz,$7,$8,$9)`,
    [user.id, assignee, customerId, asset.id, title, scheduledFor, estimatedDurationMinutes, notes, priority]
  );
  revalidatePath("/app/auftraege");
  if (customerId) revalidatePath(`/app/kunden/${customerId}`);
  redirect(`/app/auftraege?success=${encodeURIComponent("Einsatz wurde angelegt.")}`);
}

export async function assignServiceJobAction(formData: FormData) {
  const user = await requireUser();
  requireBusinessDispatch(user);
  const jobId = text(formData, "jobId", 80);
  const assignedUserId = text(formData, "assignedUserId", 80) || user.id;
  const job = (await query<{ asset_id: string; scheduled_for: string | null; estimated_duration_minutes: number }>(
    "SELECT asset_id,scheduled_for,estimated_duration_minutes FROM service_jobs WHERE id=$1 AND user_id=$2 LIMIT 1",
    [jobId, user.id]
  )).rows[0];
  if (!job) redirect(`/app/auftraege?error=${encodeURIComponent("Einsatz nicht gefunden.")}`);

  const assignee = await validateAssignee(job.asset_id, user.id, assignedUserId);
  if (!assignee) {
    redirect(`/app/auftraege?error=${encodeURIComponent("Die ausgewählte Person hat keinen Bearbeitungszugriff auf dieses Objekt.")}`);
  }
  if (await hasScheduleConflict(assignee, job.scheduled_for, job.estimated_duration_minutes, jobId)) scheduleConflictRedirect();

  await query(
    "UPDATE service_jobs SET assigned_user_id=$1,updated_at=now() WHERE id=$2 AND user_id=$3 AND status IN ('OPEN','IN_PROGRESS')",
    [assignee, jobId, user.id]
  );
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Mitarbeiterzuweisung wurde aktualisiert.")}`);
}

export async function rescheduleServiceJobAction(formData: FormData) {
  const user = await requireUser();
  requireBusinessDispatch(user);
  const jobId = text(formData, "jobId", 80);
  const scheduledFor = scheduledValue(formData);
  if (!jobId || !scheduledFor) {
    redirect(`/app/auftraege?error=${encodeURIComponent("Bitte einen neuen Termin auswählen.")}`);
  }
  const job = (await query<{ assigned_user_id: string | null; estimated_duration_minutes: number }>(
    "SELECT assigned_user_id,estimated_duration_minutes FROM service_jobs WHERE id=$1 AND user_id=$2 AND status IN ('OPEN','IN_PROGRESS') LIMIT 1",
    [jobId, user.id]
  )).rows[0];
  if (!job) redirect(`/app/auftraege?error=${encodeURIComponent("Einsatz konnte nicht neu terminiert werden.")}`);
  if (job.assigned_user_id && await hasScheduleConflict(job.assigned_user_id, scheduledFor, job.estimated_duration_minutes, jobId)) scheduleConflictRedirect();

  await query(
    "UPDATE service_jobs SET scheduled_for=$1::timestamptz,updated_at=now() WHERE id=$2 AND user_id=$3 AND status IN ('OPEN','IN_PROGRESS')",
    [scheduledFor, jobId, user.id]
  );
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Termin wurde aktualisiert.")}`);
}

export async function updateServiceJobDurationAction(formData: FormData) {
  const user = await requireUser();
  requireBusinessDispatch(user);
  const jobId = text(formData, "jobId", 80);
  const estimatedDurationMinutes = durationMinutes(formData);
  const job = (await query<{ assigned_user_id: string | null; scheduled_for: string | null }>(
    "SELECT assigned_user_id,scheduled_for FROM service_jobs WHERE id=$1 AND user_id=$2 AND status IN ('OPEN','IN_PROGRESS') LIMIT 1",
    [jobId, user.id]
  )).rows[0];
  if (!job) redirect(`/app/auftraege?error=${encodeURIComponent("Einsatz konnte nicht aktualisiert werden.")}`);
  if (job.assigned_user_id && await hasScheduleConflict(job.assigned_user_id, job.scheduled_for, estimatedDurationMinutes, jobId)) scheduleConflictRedirect();

  await query("UPDATE service_jobs SET estimated_duration_minutes=$1,updated_at=now() WHERE id=$2 AND user_id=$3", [estimatedDurationMinutes, jobId, user.id]);
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Geplante Einsatzdauer wurde aktualisiert.")}`);
}

export async function startServiceJobAction(formData: FormData) {
  const user = await requireUser();
  const jobId = text(formData, "jobId", 80);
  if (!await canExecuteBusinessServiceJob(user.id, jobId)) {
    redirect(`/app/auftraege?error=${encodeURIComponent("Dieser Einsatz ist nicht durch einen aktiven Business-Tarif freigeschaltet.")}`);
  }
  await query(
    "UPDATE service_jobs SET status='IN_PROGRESS',started_at=COALESCE(started_at,now()),updated_at=now() WHERE id=$1 AND (user_id=$2 OR assigned_user_id=$2) AND status='OPEN'",
    [jobId, user.id]
  );
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Einsatz wurde gestartet.")}`);
}

export async function reopenServiceJobAction(formData: FormData) {
  const user = await requireUser();
  const jobId = text(formData, "jobId", 80);
  if (!await canExecuteBusinessServiceJob(user.id, jobId)) {
    redirect(`/app/auftraege?error=${encodeURIComponent("Dieser Einsatz ist nicht durch einen aktiven Business-Tarif freigeschaltet.")}`);
  }
  await query(
    "UPDATE service_jobs SET status='OPEN',started_at=NULL,updated_at=now() WHERE id=$1 AND (user_id=$2 OR assigned_user_id=$2) AND status='IN_PROGRESS'",
    [jobId, user.id]
  );
  revalidatePath("/app/auftraege");
  redirect(`/app/auftraege?success=${encodeURIComponent("Einsatz wurde zurück auf offen gesetzt.")}`);
}

export async function cancelServiceJobAction(formData: FormData) {
  const user = await requireUser();
  requireBusinessDispatch(user);
  const jobId = text(formData, "jobId", 80);
  await query(
    "UPDATE service_jobs SET status='CANCELLED',updated_at=now() WHERE id=$1 AND user_id=$2 AND status IN ('OPEN','IN_PROGRESS')",
    [jobId, user.id]
  );
  revalidatePath("/app/auftraege");
}
