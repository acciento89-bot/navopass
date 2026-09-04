import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { deleteAccountForUser, isAccountDeletionConfirmation } from "@/lib/account-deletion";
import { destroySession, getCurrentUser, normalizeEmail } from "@/lib/auth";
import { getOwnedAsset, listAssets, newPublicId, roleCanEdit, roleCanManage } from "@/lib/assets";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { query, transaction } from "@/lib/db";
import { hasBusinessService } from "@/lib/entitlements";
import { brandedMail, isMailConfigured, sendMail } from "@/lib/mailer";
import { canCreateAsset, canCreateSharedWorkspace, canReserveSeat } from "@/lib/plans";
import { createServiceInvite, revokeServiceGrant, revokeServiceInvite } from "@/lib/service-access";
import { canEdit, canManage, createWorkspaceInvite, getWorkspaceMembership, listUserWorkspaces, listWorkspaceMembers } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISIBILITIES = new Set(["PRIVATE", "LINK", "PUBLIC"]);
const ACCOUNT_TYPES = new Set(["PRIVATE", "PROFESSIONAL"]);
const PRIORITIES = new Set(["LOW", "NORMAL", "HIGH"]);
const JOB_STATUSES = new Set(["OPEN", "IN_PROGRESS", "CANCELLED"]);
const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/app/uploads";

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
function text(value: unknown, max = 1000) {
  const result = typeof value === "string" ? value.trim().slice(0, max) : "";
  return result || null;
}
function date(value: unknown) {
  const result = text(value, 10);
  return result && /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}
function integer(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return response({ error: "UNAUTHENTICATED" }, 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return response({ error: "INVALID_CONTENT_TYPE" }, 415);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = text(body?.action, 60);
  if (!body || !action) return response({ error: "INVALID_REQUEST" }, 422);

  if (action === "updateAsset") {
    const assetId = text(body.assetId, 80);
    const name = text(body.name, 160);
    if (!assetId || !name) return response({ error: "NAME_REQUIRED" }, 422);
    const asset = await getOwnedAsset(user.id, assetId);
    if (!asset || !roleCanEdit(asset, user.id)) return response({ error: "FORBIDDEN" }, 403);
    const visibility = text(body.visibility, 20) ?? "LINK";
    await query(
      `UPDATE assets SET name=$1,category=$2,manufacturer=$3,model=$4,serial_number=$5,purchase_date=$6,
       warranty_until=$7,next_service_date=$8,service_interval_months=$9,location=$10,notes=$11,visibility=$12,updated_at=now() WHERE id=$13`,
      [name,text(body.category,80)??"Other",text(body.manufacturer,160),text(body.model,160),text(body.serialNumber,160),date(body.purchaseDate),date(body.warrantyUntil),date(body.nextServiceDate),integer(body.serviceIntervalMonths,12,1,120),text(body.location,200),text(body.notes,5000),VISIBILITIES.has(visibility)?visibility:"LINK",asset.id]
    );
    return response({ ok: true, asset: (await listAssets(user.id)).find((item) => item.id === asset.id) });
  }

  if (action === "toggleFavorite" || action === "toggleArchive") {
    const assetId = text(body.assetId, 80);
    if (!assetId) return response({ error: "INVALID_REQUEST" }, 422);
    const asset = await getOwnedAsset(user.id, assetId);
    if (!asset) return response({ error: "FORBIDDEN" }, 403);
    const allowed = action === "toggleFavorite" ? roleCanEdit(asset, user.id) : roleCanManage(asset, user.id);
    if (!allowed) return response({ error: "FORBIDDEN" }, 403);
    await query(action === "toggleFavorite"
      ? "UPDATE assets SET favorite=NOT favorite,updated_at=now() WHERE id=$1"
      : "UPDATE assets SET archived_at=CASE WHEN archived_at IS NULL THEN now() ELSE NULL END,updated_at=now() WHERE id=$1", [asset.id]);
    return response({ ok: true });
  }

  if (action === "duplicateAsset") {
    const assetId = text(body.assetId, 80);
    const asset = assetId ? await getOwnedAsset(user.id, assetId) : null;
    if (!asset || !roleCanEdit(asset, user.id)) return response({ error: "FORBIDDEN" }, 403);
    const workspaces = (await listUserWorkspaces(user.id)).filter((item) => canEdit(item.role));
    const workspace = workspaces.find((item) => item.id === asset.workspace_id) ?? workspaces.find((item) => item.kind === "PERSONAL");
    if (!workspace) return response({ error: "NO_WRITABLE_WORKSPACE" }, 403);
    const capacity = await canCreateAsset(workspace.owner_id);
    if (!capacity.allowed) return response({ error: "ASSET_LIMIT_REACHED" }, 409);
    await query(
      `INSERT INTO assets (owner_id,workspace_id,public_id,name,category,manufacturer,model,serial_number,purchase_date,warranty_until,next_service_date,service_interval_months,location,notes,visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'PRIVATE')`,
      [workspace.owner_id,workspace.id,newPublicId(),`${asset.name} Copy`.slice(0,160),asset.category,asset.manufacturer,asset.model,asset.serial_number,asset.purchase_date,asset.warranty_until,asset.next_service_date,asset.service_interval_months,asset.location,asset.notes]
    );
    return response({ ok: true }, 201);
  }

  if (action === "deleteAsset") {
    const assetId = text(body.assetId, 80);
    const asset = assetId ? await getOwnedAsset(user.id, assetId) : null;
    if (!asset || !roleCanManage(asset, user.id)) return response({ error: "FORBIDDEN" }, 403);
    const documents = await query<{ id:string; url:string }>("SELECT id,url FROM asset_documents WHERE asset_id=$1", [asset.id]);
    await query("DELETE FROM assets WHERE id=$1", [asset.id]);
    await Promise.all(documents.rows.map((document) => document.url.startsWith(`/api/files/${document.id}/`) ? unlink(join(UPLOAD_ROOT,document.id)).catch(() => undefined) : undefined));
    return response({ ok: true });
  }

  if (action === "completeService" || action === "rescheduleService") {
    const assetId = text(body.assetId, 80);
    const asset = assetId ? await getOwnedAsset(user.id, assetId) : null;
    if (!asset || asset.archived_at || !roleCanEdit(asset, user.id)) return response({ error: "FORBIDDEN" }, 403);
    if (action === "rescheduleService") {
      const nextDate = date(body.nextServiceDate);
      if (!nextDate) return response({ error: "INVALID_DATE" }, 422);
      await query("UPDATE assets SET next_service_date=$1::date,updated_at=now() WHERE id=$2", [nextDate, asset.id]);
    } else {
      await transaction(async (client) => {
        const event = await client.query<{ id: string }>(
          `INSERT INTO asset_events (asset_id,title,event_type,event_date,description,provider,is_public)
           VALUES ($1,$2,'SERVICE',current_date,$3,$4,true) RETURNING id`,
          [asset.id,text(body.title,180)??"Service completed",text(body.note,1000)??"Service completed in the NavoPass app.",text(body.provider,200)]
        );
        await client.query("UPDATE assets SET next_service_date=(current_date + make_interval(months => GREATEST(1,LEAST(service_interval_months,120))))::date,updated_at=now() WHERE id=$1", [asset.id]);
        const jobId = text(body.jobId,80);
        if (jobId) {
          await client.query(
            `UPDATE service_jobs SET status='DONE',completed_event_id=$1,completed_at=now(),updated_at=now()
             WHERE id=$2 AND asset_id=$3 AND (user_id=$4 OR assigned_user_id=$4) AND status IN ('OPEN','IN_PROGRESS')`,
            [event.rows[0].id,jobId,asset.id,user.id]
          );
        }
      });
    }
    return response({ ok: true });
  }

  if (action === "addEvent" || action === "deleteEvent") {
    const assetId = text(body.assetId, 80);
    const asset = assetId ? await getOwnedAsset(user.id, assetId) : null;
    if (!asset || !roleCanEdit(asset, user.id)) return response({ error: "FORBIDDEN" }, 403);
    if (action === "deleteEvent") {
      const eventId = text(body.eventId, 80);
      if (!eventId) return response({ error: "INVALID_REQUEST" }, 422);
      await query("DELETE FROM asset_events WHERE id=$1 AND asset_id=$2", [eventId, asset.id]);
    } else {
      const title = text(body.title, 180);
      if (!title) return response({ error: "TITLE_REQUIRED" }, 422);
      await query(
        `INSERT INTO asset_events (asset_id,title,event_type,event_date,description,provider,is_public)
         VALUES ($1,$2,$3,COALESCE($4::date,current_date),$5,$6,$7)`,
        [asset.id,title,text(body.eventType,40)??"NOTE",date(body.eventDate),text(body.description,4000),text(body.provider,200),body.isPublic===true]
      );
    }
    await query("UPDATE assets SET updated_at=now() WHERE id=$1", [asset.id]);
    return response({ ok: true });
  }

  if (action === "addDocumentLink" || action === "deleteDocument") {
    const assetId = text(body.assetId, 80);
    const asset = assetId ? await getOwnedAsset(user.id, assetId) : null;
    if (!asset || !roleCanEdit(asset, user.id)) return response({ error: "FORBIDDEN" }, 403);
    if (action === "deleteDocument") {
      const documentId = text(body.documentId, 80);
      if (!documentId) return response({ error: "INVALID_REQUEST" }, 422);
      const document = await query<{ url:string }>("SELECT url FROM asset_documents WHERE id=$1 AND asset_id=$2 LIMIT 1", [documentId,asset.id]);
      await query("DELETE FROM asset_documents WHERE id=$1 AND asset_id=$2", [documentId, asset.id]);
      if (document.rows[0]?.url.startsWith(`/api/files/${documentId}/`)) await unlink(join(UPLOAD_ROOT,documentId)).catch(() => undefined);
    } else {
      const title = text(body.title, 180);
      const url = text(body.url, 2000);
      if (!title || !url || !/^https?:\/\//i.test(url)) return response({ error: "INVALID_URL" }, 422);
      await query("INSERT INTO asset_documents (asset_id,title,url,kind,is_public,size_bytes) VALUES ($1,$2,$3,$4,$5,0)", [asset.id,title,url,text(body.kind,80)??"Document",body.isPublic===true]);
    }
    await query("UPDATE assets SET updated_at=now() WHERE id=$1", [asset.id]);
    return response({ ok: true });
  }

  if (action === "updateProfile") {
    const name = text(body.name, 160);
    const email = normalizeEmail(text(body.email, 320) ?? "");
    const accountType = text(body.accountType, 20) ?? "PRIVATE";
    if (!name || name.length < 2 || !email.includes("@") || !ACCOUNT_TYPES.has(accountType)) return response({ error: "INVALID_PROFILE" }, 422);
    const existing = await query<{ id: string }>("SELECT id FROM users WHERE email=$1 AND id<>$2 LIMIT 1", [email,user.id]);
    if (existing.rows[0]) return response({ error: "EMAIL_IN_USE" }, 409);
    await query(
      `UPDATE users SET name=$1,email=$2,account_type=$3,company_name=$4,professional_title=$5,
       email_verified_at=CASE WHEN email=$2 THEN email_verified_at ELSE NULL END WHERE id=$6`,
      [name,email,accountType,text(body.companyName,180),text(body.professionalTitle,180),user.id]
    );
    return response({ ok: true });
  }

  if (action === "updateReminder") {
    const reminderDays = integer(body.reminderDays, 30, 1, 180);
    await query("UPDATE users SET reminder_days=$1 WHERE id=$2", [reminderDays,user.id]);
    return response({ ok: true });
  }

  if (action === "deleteAccount") {
    const password = text(body.password, 500);
    if (!isAccountDeletionConfirmation(body.confirmation)) {
      return response({ error: "INVALID_CONFIRMATION" }, 422);
    }
    if (!password) return response({ error: "INVALID_PASSWORD" }, 401);

    const result = await deleteAccountForUser(user, password);
    if (!result.ok) {
      const status = result.error === "INVALID_PASSWORD" ? 401 : result.error === "SHARED_WORKSPACES_EXIST" ? 409 : 502;
      return response({ error: result.error }, status);
    }

    await destroySession();
    return response({ ok: true });
  }

  if (action === "createWorkspace") {
    const name = text(body.name, 120);
    const kind = body.kind === "TEAM" ? "TEAM" : "HOUSEHOLD";
    if (!name || name.length < 2) return response({ error: "NAME_REQUIRED" }, 422);
    const capacity = await canCreateSharedWorkspace(user.id);
    if (!capacity.allowed) return response({ error: "WORKSPACE_LIMIT_REACHED" }, 409);
    const created = await query<{ id: string }>("INSERT INTO workspaces (name,kind,owner_id) VALUES ($1,$2,$3) RETURNING id", [name,kind,user.id]);
    await query("INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,'OWNER')", [created.rows[0].id,user.id]);
    return response({ ok: true }, 201);
  }

  if (action === "inviteWorkspaceMember") {
    const workspaceId = text(body.workspaceId,80);
    const email = normalizeEmail(text(body.email,240)??"");
    const role = text(body.role,20) ?? "VIEWER";
    if (!workspaceId || !email.includes("@") || !["ADMIN","EDITOR","VIEWER"].includes(role)) return response({ error: "INVALID_REQUEST" }, 422);
    const membership = await getWorkspaceMembership(user.id,workspaceId);
    if (!membership || !canManage(membership.role) || membership.kind === "PERSONAL") return response({ error: "FORBIDDEN" }, 403);
    const members = await listWorkspaceMembers(workspaceId);
    if (members.some((member) => member.email.toLowerCase() === email)) return response({ error: "ALREADY_MEMBER" }, 409);
    const capacity = await canReserveSeat(membership.owner_id,email);
    if (!capacity.allowed) return response({ error: "SEAT_LIMIT_REACHED" }, 409);
    const token = await createWorkspaceInvite(workspaceId,email,role as "ADMIN"|"EDITOR"|"VIEWER",user.id);
    if (isMailConfigured()) {
      const inviteUrl = `${(process.env.APP_URL||"https://navopass.de").replace(/\/$/,"")}/invite/${encodeURIComponent(token)}`;
      await sendMail({
        to: email,
        subject: `${user.name} invites you to NavoPass`,
        text: `${user.name} invited you to “${membership.name}”.\n\n${inviteUrl}`,
        html: brandedMail({ title:"NavoPass invitation", intro:`${user.name} invited you to “${membership.name}”.`, actionLabel:"Accept invitation", actionUrl:inviteUrl }),
      }).catch((error) => console.error("NavoPass mobile workspace invite failed",error));
    }
    return response({ ok:true },201);
  }

  if (action === "inviteServicePartner") {
    const assetId = text(body.assetId,80);
    const email = normalizeEmail(text(body.email,240)??"");
    const accessDays = integer(body.accessDays,30,1,365);
    const asset = assetId ? await getOwnedAsset(user.id,assetId) : null;
    if (!asset || !roleCanManage(asset,user.id)) return response({ error:"FORBIDDEN" },403);
    if (!email.includes("@")) return response({ error:"INVALID_EMAIL" },422);
    const token = await createServiceInvite(asset.id,email,user.id,accessDays);
    if (isMailConfigured()) {
      const inviteUrl = `${(process.env.APP_URL||"https://navopass.de").replace(/\/$/,"")}/service-invite/${encodeURIComponent(token)}`;
      await sendMail({
        to:email,
        subject:`Service access for ${asset.name}`,
        text:`${user.name} grants you service access to “${asset.name}” for ${accessDays} days.\n\n${inviteUrl}`,
        html:brandedMail({title:"NavoPass service access",intro:`${user.name} grants you service access to “${asset.name}” for ${accessDays} days.`,actionLabel:"Accept service access",actionUrl:inviteUrl}),
      }).catch((error) => console.error("NavoPass mobile service invite failed",error));
    }
    return response({ok:true},201);
  }

  if (action === "revokeServiceGrant" || action === "revokeServiceInvite") {
    const assetId = text(body.assetId,80);
    const asset = assetId ? await getOwnedAsset(user.id,assetId) : null;
    if (!asset || !roleCanManage(asset,user.id)) return response({error:"FORBIDDEN"},403);
    if (action === "revokeServiceGrant") {
      const targetUserId = text(body.targetUserId,80);
      if (!targetUserId) return response({error:"INVALID_REQUEST"},422);
      await revokeServiceGrant(asset.id,targetUserId);
    } else {
      const inviteId = text(body.inviteId,80);
      if (!inviteId) return response({error:"INVALID_REQUEST"},422);
      await revokeServiceInvite(asset.id,inviteId);
    }
    return response({ok:true});
  }

  if (action === "createCustomer") {
    if (!hasBusinessService(user)) return response({ error: "BUSINESS_REQUIRED" }, 403);
    await ensureCustomerSchema();
    const name = text(body.name, 180);
    if (!name || name.length < 2) return response({ error: "NAME_REQUIRED" }, 422);
    await query(
      `INSERT INTO service_customers (user_id,name,contact_name,email,phone,street,postal_code,city,country,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [user.id,name,text(body.contactName,180),text(body.email,220),text(body.phone,80),text(body.street,180),text(body.postalCode,30),text(body.city,140),(text(body.country,2)??"DE").toUpperCase(),text(body.notes,1500)]
    );
    return response({ ok: true }, 201);
  }

  if (action === "assignCustomer") {
    if (!hasBusinessService(user)) return response({ error: "BUSINESS_REQUIRED" }, 403);
    const assetId = text(body.assetId, 80);
    const customerId = text(body.customerId, 80);
    const asset = assetId ? await getOwnedAsset(user.id, assetId) : null;
    if (!asset || !roleCanManage(asset,user.id)) return response({ error: "FORBIDDEN" }, 403);
    if (customerId) {
      const customer = await query<{ id: string }>("SELECT id FROM service_customers WHERE id=$1 AND user_id=$2 LIMIT 1", [customerId,user.id]);
      if (!customer.rows[0]) return response({ error: "NOT_FOUND" }, 404);
    }
    await query("UPDATE assets SET service_customer_id=$1,updated_at=now() WHERE id=$2", [customerId,asset.id]);
    return response({ ok: true });
  }

  if (action === "createJob") {
    if (!hasBusinessService(user)) return response({ error: "BUSINESS_REQUIRED" }, 403);
    const assetId = text(body.assetId, 80);
    const asset = assetId ? await getOwnedAsset(user.id, assetId) : null;
    if (!asset || !roleCanManage(asset,user.id)) return response({ error: "FORBIDDEN" }, 403);
    const customer = await query<{ service_customer_id: string | null }>("SELECT service_customer_id FROM assets WHERE id=$1", [asset.id]);
    const priority = text(body.priority,20)??"NORMAL";
    await query(
      `INSERT INTO service_jobs (user_id,assigned_user_id,customer_id,asset_id,title,scheduled_for,estimated_duration_minutes,notes,priority)
       VALUES ($1,$1,$2,$3,$4,$5::timestamptz,$6,$7,$8)`,
      [user.id,customer.rows[0]?.service_customer_id??null,asset.id,text(body.title,180)??"Service job",text(body.scheduledFor,40),integer(body.estimatedDurationMinutes,60,15,720),text(body.notes,2000),PRIORITIES.has(priority)?priority:"NORMAL"]
    );
    return response({ ok: true }, 201);
  }

  if (action === "updateJobStatus") {
    const jobId = text(body.jobId,80);
    const status = text(body.status,20);
    if (!jobId || !status || !JOB_STATUSES.has(status)) return response({ error: "INVALID_REQUEST" }, 422);
    const result = await query(
      `UPDATE service_jobs SET status=$1,started_at=CASE WHEN $1='IN_PROGRESS' THEN COALESCE(started_at,now()) ELSE NULL END,updated_at=now()
       WHERE id=$2 AND (user_id=$3 OR assigned_user_id=$3) AND status IN ('OPEN','IN_PROGRESS')`,
      [status,jobId,user.id]
    );
    if (result.rowCount !== 1) return response({ error: "NOT_FOUND" }, 404);
    return response({ ok: true });
  }

  return response({ error: "UNKNOWN_ACTION" }, 422);
}
