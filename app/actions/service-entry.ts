"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanRecordService } from "@/lib/assets";
import { transaction } from "@/lib/db";
import { canExecuteBusinessServiceJob } from "@/lib/entitlements";

const EVENT_TYPES = new Set(["SERVICE", "REPAIR", "INSPECTION", "NOTE"]);

type ReportSnapshot = {
  asset_name: string;
  asset_category: string;
  asset_manufacturer: string | null;
  asset_model: string | null;
  asset_serial_number: string | null;
  asset_location: string | null;
  asset_public_id: string;
  customer_name: string | null;
  customer_contact_name: string | null;
  customer_email: string | null;
  customer_street: string | null;
  customer_postal_code: string | null;
  customer_city: string | null;
  customer_country: string | null;
};

function text(formData: FormData, key: string, max = 1000) {
  const value = String(formData.get(key) ?? "").trim().slice(0, max);
  return value || null;
}
function checked(formData: FormData, key: string) { return formData.get(key) === "on"; }

export async function recordServiceEntryAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  const jobId = text(formData, "jobId", 80);
  const title = text(formData, "title", 180);
  if (!assetId || !title) redirect("/app?error=Serviceeintrag%20unvollstaendig");

  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset || asset.archived_at || !roleCanRecordService(asset, user.id)) redirect("/app?error=Keine%20Berechtigung%20fuer%20diesen%20Pass");
  if (jobId && !await canExecuteBusinessServiceJob(user.id, jobId, asset.id)) {
    redirect(`/app/auftraege?error=${encodeURIComponent("Dieser Serviceauftrag ist nicht durch einen aktiven Business-Tarif freigeschaltet.")}`);
  }

  const rawType = text(formData, "eventType", 40) ?? "SERVICE";
  const eventType = EVENT_TYPES.has(rawType) ? rawType : "SERVICE";
  const eventDate = text(formData, "eventDate", 20);
  const description = text(formData, "description", 4000);
  const provider = text(formData, "provider", 200) ?? user.name;
  const cost = text(formData, "cost", 30);
  const parsedCost = cost ? Number(cost.replace(",", ".")) : NaN;
  const costCents = Number.isFinite(parsedCost) ? Math.round(parsedCost * 100) : null;
  const laborRaw = text(formData, "laborMinutes", 10);
  const laborMinutes = laborRaw && Number.isFinite(Number(laborRaw)) ? Math.max(0, Math.min(1440, Math.round(Number(laborRaw)))) : null;
  const partsUsed = text(formData, "partsUsed", 4000);
  const measurements = text(formData, "measurements", 4000);
  const findings = text(formData, "findings", 4000);
  const recommendation = text(formData, "recommendation", 4000);
  const customerName = text(formData, "customerName", 180);
  const signatureRaw = String(formData.get("customerSignature") ?? "");
  const customerSignature = signatureRaw.startsWith("data:image/png;base64,") && signatureRaw.length <= 300000 ? signatureRaw : null;
  const advanceService = checked(formData, "advanceService") && eventType === "SERVICE";
  const isPublic = checked(formData, "isPublic");
  let eventId = "";

  try {
    eventId = await transaction(async (client) => {
      const snapshot = (await client.query<ReportSnapshot>(
        `SELECT a.name AS asset_name,a.category AS asset_category,a.manufacturer AS asset_manufacturer,
                a.model AS asset_model,a.serial_number AS asset_serial_number,a.location AS asset_location,
                a.public_id AS asset_public_id,c.name AS customer_name,c.contact_name AS customer_contact_name,
                c.email AS customer_email,c.street AS customer_street,c.postal_code AS customer_postal_code,
                c.city AS customer_city,c.country AS customer_country
           FROM assets a
           LEFT JOIN service_jobs j
             ON j.id=$2::uuid AND j.asset_id=a.id AND (j.user_id=$3 OR j.assigned_user_id=$3)
           LEFT JOIN service_customers c
             ON c.id=CASE WHEN j.id IS NOT NULL THEN j.customer_id ELSE a.service_customer_id END
            AND (j.id IS NOT NULL OR c.user_id=$3)
          WHERE a.id=$1
          LIMIT 1`,
        [asset.id, jobId, user.id]
      )).rows[0];
      if (!snapshot) throw new Error("Report snapshot source missing");

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO asset_events
          (asset_id,title,event_type,event_date,description,provider,cost_cents,is_public,created_by_user_id,created_by_name,
           labor_minutes,parts_used,measurements,findings,recommendation,customer_name,customer_signature,customer_signed_at,
           report_asset_name,report_asset_category,report_asset_manufacturer,report_asset_model,report_asset_serial_number,
           report_asset_location,report_asset_public_id,report_customer_name,report_customer_contact_name,report_customer_email,
           report_customer_street,report_customer_postal_code,report_customer_city,report_customer_country)
         VALUES ($1,$2,$3,COALESCE($4::date,current_date),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                 CASE WHEN $17::text IS NOT NULL THEN now() ELSE NULL END,
                 $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
         RETURNING id`,
        [
          asset.id,title,eventType,eventDate,description,provider,costCents,isPublic,user.id,user.name,
          laborMinutes,partsUsed,measurements,findings,recommendation,customerName,customerSignature,
          snapshot.asset_name,snapshot.asset_category,snapshot.asset_manufacturer,snapshot.asset_model,
          snapshot.asset_serial_number,snapshot.asset_location,snapshot.asset_public_id,snapshot.customer_name,
          snapshot.customer_contact_name,snapshot.customer_email,snapshot.customer_street,snapshot.customer_postal_code,
          snapshot.customer_city,snapshot.customer_country,
        ]
      );
      const newEventId = inserted.rows[0].id;
      if (advanceService) {
        await client.query(`UPDATE assets SET next_service_date=(COALESCE($2::date,current_date) + make_interval(months => GREATEST(1,LEAST(service_interval_months,120))))::date,updated_at=now() WHERE id=$1`, [asset.id,eventDate]);
      } else {
        await client.query("UPDATE assets SET updated_at=now() WHERE id=$1", [asset.id]);
      }
      if (jobId) {
        await client.query(
          `UPDATE service_jobs SET status='DONE',completed_event_id=$1,completed_at=now(),updated_at=now()
            WHERE id=$2 AND (user_id=$3 OR assigned_user_id=$3) AND asset_id=$4 AND status IN ('OPEN','IN_PROGRESS')`,
          [newEventId,jobId,user.id,asset.id]
        );
      }
      return newEventId;
    });
  } catch (error) {
    console.error("NavoPass service entry failed", { assetId: asset.id, userId: user.id, error });
    redirect(`/app/assets/${asset.id}/service?error=${encodeURIComponent("Eintrag konnte nicht gespeichert werden.")}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/service");
  revalidatePath("/app/auftraege");
  revalidatePath(`/app/assets/${asset.id}`);
  revalidatePath(`/app/assets/${asset.id}/service`);
  revalidatePath(`/app/assets/${asset.id}/service/${eventId}/bericht`);
  revalidatePath(`/p/${asset.public_id}`);
  redirect(`/app/assets/${asset.id}/service?success=1&event=${encodeURIComponent(eventId)}${jobId?"&jobDone=1":""}`);
}
