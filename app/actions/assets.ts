"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, newPublicId, roleCanEdit, roleCanManage, roleCanTransfer } from "@/lib/assets";
import { query, transaction } from "@/lib/db";
import { canCreateAsset } from "@/lib/plans";
import { canEdit, getWorkspaceMembership, listUserWorkspaces } from "@/lib/workspaces";

const UPLOAD_ROOT=process.env.UPLOAD_DIR||"/app/uploads"; const VISIBILITIES=new Set(["PRIVATE","LINK","PUBLIC"]);
function text(formData:FormData,key:string,max=1000){const value=String(formData.get(key)??"").trim().slice(0,max);return value||null;}
function checked(formData:FormData,key:string){return formData.get(key)==="on";}
function integer(formData:FormData,key:string,fallback:number,min:number,max:number){const raw=Number.parseInt(String(formData.get(key)??""),10);if(!Number.isFinite(raw))return fallback;return Math.max(min,Math.min(max,raw));}
function visibilityValue(formData:FormData){const value=text(formData,"visibility",20)??"LINK";return VISIBILITIES.has(value)?value:"LINK";}
function revalidateAsset(assetId:string,publicId?:string){revalidatePath("/app");revalidatePath("/app/service");revalidatePath("/app/activity");revalidatePath("/app/notifications");revalidatePath("/app/team");revalidatePath("/app/settings");revalidatePath(`/app/assets/${assetId}`);if(publicId)revalidatePath(`/p/${publicId}`);}
async function writableWorkspace(userId:string,requestedId:string|null){if(requestedId){const membership=await getWorkspaceMembership(userId,requestedId);if(membership&&canEdit(membership.role))return membership;}const workspaces=await listUserWorkspaces(userId);const personal=workspaces.find(w=>w.kind==="PERSONAL"&&canEdit(w.role));if(!personal)throw new Error("No writable workspace");return personal;}
function assetLimitUrl(maxAssets:number,planName:string){return `/app/assets/new?error=${encodeURIComponent(`Limit erreicht: ${planName} erlaubt ${maxAssets} Pässe. Bestehende Pässe bleiben erhalten. Für weitere Pässe bitte Tarif upgraden.`)}&upgrade=1`;}

export async function createAssetAction(formData:FormData){
  const user=await requireUser();
  const name=text(formData,"name",160);
  if(!name)redirect("/app/assets/new?error=Bitte%20einen%20Namen%20angeben");
  const workspace=await writableWorkspace(user.id,text(formData,"workspaceId",80));
  const capacity=await canCreateAsset(workspace.owner_id);
  if(!capacity.allowed)redirect(assetLimitUrl(capacity.definition.maxAssets,capacity.definition.name));
  let createdId:string;
  try{
    const result=await query<{id:string}>(`INSERT INTO assets (owner_id,workspace_id,public_id,name,category,manufacturer,model,serial_number,purchase_date,warranty_until,next_service_date,service_interval_months,location,notes,visibility) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,[workspace.owner_id,workspace.id,newPublicId(),name,text(formData,"category",80)??"Sonstiges",text(formData,"manufacturer",160),text(formData,"model",160),text(formData,"serialNumber",160),text(formData,"purchaseDate",20),text(formData,"warrantyUntil",20),text(formData,"nextServiceDate",20),integer(formData,"serviceIntervalMonths",12,1,120),text(formData,"location",200),text(formData,"notes",5000),visibilityValue(formData)]);
    createdId=result.rows[0].id;
  }catch(error){
    console.error("NavoPass pass creation failed",error);
    redirect("/app/assets/new?error=Pass%20konnte%20nicht%20gespeichert%20werden.%20Bitte%20erneut%20versuchen.");
  }
  revalidateAsset(createdId);
  redirect(`/app/assets/${createdId}`);
}

export async function updateAssetAction(formData:FormData){
  const user=await requireUser();const assetId=text(formData,"assetId",80);const name=text(formData,"name",160);if(!assetId||!name)return;
  const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanEdit(asset,user.id))return;
  let workspaceId=asset.workspace_id;let ownerId=asset.owner_id;
  const requestedWorkspace=text(formData,"workspaceId",80);
  if(requestedWorkspace&&requestedWorkspace!==asset.workspace_id&&roleCanTransfer(asset,user.id)){
    const membership=await getWorkspaceMembership(user.id,requestedWorkspace);
    if(membership&&canEdit(membership.role)){
      if(membership.owner_id!==asset.owner_id){
        const capacity=await canCreateAsset(membership.owner_id);
        if(!capacity.allowed)redirect(`/app/assets/${assetId}/edit?error=${encodeURIComponent(`Zielbereich hat sein ${capacity.definition.name}-Limit von ${capacity.definition.maxAssets} Pässen erreicht.`)}`);
      }
      workspaceId=membership.id;ownerId=membership.owner_id;
    }
  }
  await query(`UPDATE assets SET name=$1,category=$2,manufacturer=$3,model=$4,serial_number=$5,purchase_date=$6,warranty_until=$7,next_service_date=$8,service_interval_months=$9,location=$10,notes=$11,visibility=$12,owner_id=$13,workspace_id=$14,updated_at=now() WHERE id=$15`,[name,text(formData,"category",80)??"Sonstiges",text(formData,"manufacturer",160),text(formData,"model",160),text(formData,"serialNumber",160),text(formData,"purchaseDate",20),text(formData,"warrantyUntil",20),text(formData,"nextServiceDate",20),integer(formData,"serviceIntervalMonths",asset.service_interval_months||12,1,120),text(formData,"location",200),text(formData,"notes",5000),visibilityValue(formData),ownerId,workspaceId,assetId]);
  revalidateAsset(assetId,asset.public_id);redirect(`/app/assets/${assetId}`);
}

export async function completeServiceAction(formData:FormData){
  const user=await requireUser();
  const assetId=text(formData,"assetId",80);
  if(!assetId)redirect("/app/service?error=Objekt%20fehlt");
  const asset=await getOwnedAsset(user.id,assetId);
  if(!asset||asset.archived_at||!roleCanEdit(asset,user.id))redirect("/app/service?error=Keine%20Berechtigung%20fuer%20diesen%20Pass");
  const provider=text(formData,"provider",200);
  const note=text(formData,"note",1000);
  try{
    await transaction(async(client)=>{
      await client.query(`INSERT INTO asset_events (asset_id,title,event_type,event_date,description,provider,is_public) VALUES ($1,'Wartung durchgeführt','SERVICE',current_date,$2,$3,true)`,[assetId,note??"Wartung über das NavoPass Service-Center als erledigt markiert.",provider]);
      await client.query(`UPDATE assets SET next_service_date=(current_date + make_interval(months => GREATEST(1,LEAST(service_interval_months,120))))::date,updated_at=now() WHERE id=$1`,[assetId]);
    });
  }catch(error){
    console.error("NavoPass complete service failed",{assetId,error});
    redirect("/app/service?error=Wartung%20konnte%20nicht%20gespeichert%20werden");
  }
  revalidateAsset(assetId,asset.public_id);
  redirect("/app/service?success=Wartung%20gespeichert%20und%20Folgetermin%20berechnet");
}

export async function rescheduleServiceAction(formData:FormData){
  const user=await requireUser();
  const assetId=text(formData,"assetId",80);
  const nextDate=text(formData,"nextServiceDate",20);
  if(!assetId||!nextDate||!/^\d{4}-\d{2}-\d{2}$/.test(nextDate))redirect("/app/service?error=Bitte%20gueltigen%20Wartungstermin%20waehlen");
  const asset=await getOwnedAsset(user.id,assetId);
  if(!asset||asset.archived_at||!roleCanEdit(asset,user.id))redirect("/app/service?error=Keine%20Berechtigung%20fuer%20diesen%20Pass");
  try{
    await query("UPDATE assets SET next_service_date=$1::date,updated_at=now() WHERE id=$2",[nextDate,assetId]);
  }catch(error){
    console.error("NavoPass reschedule service failed",{assetId,error});
    redirect("/app/service?error=Wartungstermin%20konnte%20nicht%20gespeichert%20werden");
  }
  revalidateAsset(assetId,asset.public_id);
  redirect("/app/service?success=Wartungstermin%20gespeichert");
}

export async function toggleFavoriteAction(formData:FormData){const user=await requireUser();const assetId=text(formData,"assetId",80);if(!assetId)return;const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanEdit(asset,user.id))return;await query("UPDATE assets SET favorite=NOT favorite,updated_at=now() WHERE id=$1",[assetId]);revalidateAsset(assetId,asset.public_id);}
export async function toggleArchiveAction(formData:FormData){const user=await requireUser();const assetId=text(formData,"assetId",80);if(!assetId)return;const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanManage(asset,user.id))return;await query("UPDATE assets SET archived_at=CASE WHEN archived_at IS NULL THEN now() ELSE NULL END,updated_at=now() WHERE id=$1",[assetId]);revalidateAsset(assetId,asset.public_id);redirect("/app");}
export async function duplicateAssetAction(formData:FormData){const user=await requireUser();const assetId=text(formData,"assetId",80);if(!assetId)return;const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanEdit(asset,user.id))return;const workspace=asset.workspace_id?await getWorkspaceMembership(user.id,asset.workspace_id):await writableWorkspace(user.id,null);if(!workspace)return;const capacity=await canCreateAsset(workspace.owner_id);if(!capacity.allowed)redirect(`/app/assets/${assetId}?limit=${encodeURIComponent(`${capacity.definition.name} erlaubt maximal ${capacity.definition.maxAssets} Pässe.`)}`);const result=await query<{id:string}>(`INSERT INTO assets (owner_id,workspace_id,public_id,name,category,manufacturer,model,serial_number,purchase_date,warranty_until,next_service_date,service_interval_months,location,notes,visibility) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'PRIVATE') RETURNING id`,[workspace.owner_id,workspace.id,newPublicId(),`${asset.name} Kopie`.slice(0,160),asset.category,asset.manufacturer,asset.model,asset.serial_number,asset.purchase_date,asset.warranty_until,asset.next_service_date,asset.service_interval_months,asset.location,asset.notes]);revalidateAsset(result.rows[0].id);redirect(`/app/assets/${result.rows[0].id}`);}
export async function deleteAssetAction(formData:FormData){const user=await requireUser();const assetId=text(formData,"assetId",80);if(!assetId)return;const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanManage(asset,user.id))return;const docs=await query<{id:string;url:string}>("SELECT id,url FROM asset_documents WHERE asset_id=$1",[assetId]);await query("DELETE FROM assets WHERE id=$1",[assetId]);await Promise.all(docs.rows.map(async doc=>{if(doc.url.startsWith(`/api/files/${doc.id}/`))await unlink(join(UPLOAD_ROOT,doc.id)).catch(()=>undefined);}));revalidatePath("/app");revalidatePath("/app/service");revalidatePath("/app/activity");revalidatePath("/app/settings");redirect("/app");}
export async function addEventAction(formData:FormData){const user=await requireUser();const assetId=text(formData,"assetId",80);const title=text(formData,"title",180);if(!assetId||!title)return;const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanEdit(asset,user.id))return;const cost=text(formData,"cost",30);const costCents=cost?Math.round(Number(cost.replace(",","."))*100):null;await query(`INSERT INTO asset_events (asset_id,title,event_type,event_date,description,provider,cost_cents,is_public) VALUES ($1,$2,$3,COALESCE($4::date,current_date),$5,$6,$7,$8)`,[assetId,title,text(formData,"eventType",40)??"NOTE",text(formData,"eventDate",20),text(formData,"description",4000),text(formData,"provider",200),Number.isFinite(costCents)?costCents:null,checked(formData,"isPublic")]);await query("UPDATE assets SET updated_at=now() WHERE id=$1",[assetId]);revalidateAsset(assetId,asset.public_id);}
export async function deleteEventAction(formData:FormData){const user=await requireUser();const eventId=text(formData,"eventId",80);const assetId=text(formData,"assetId",80);if(!eventId||!assetId)return;const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanEdit(asset,user.id))return;await query("DELETE FROM asset_events WHERE id=$1 AND asset_id=$2",[eventId,assetId]);await query("UPDATE assets SET updated_at=now() WHERE id=$1",[assetId]);revalidateAsset(assetId,asset.public_id);}
export async function addDocumentAction(formData:FormData){const user=await requireUser();const assetId=text(formData,"assetId",80);const title=text(formData,"title",180);const url=text(formData,"url",2000);if(!assetId||!title||!url||!/^https?:\/\//i.test(url))return;const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanEdit(asset,user.id))return;await query("INSERT INTO asset_documents (asset_id,title,url,kind,is_public,size_bytes) VALUES ($1,$2,$3,$4,$5,0)",[assetId,title,url,text(formData,"kind",80)??"Dokument",checked(formData,"isPublic")]);await query("UPDATE assets SET updated_at=now() WHERE id=$1",[assetId]);revalidateAsset(assetId,asset.public_id);}
export async function deleteDocumentAction(formData:FormData){const user=await requireUser();const documentId=text(formData,"documentId",80);const assetId=text(formData,"assetId",80);if(!documentId||!assetId)return;const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanEdit(asset,user.id))return;const doc=await query<{id:string;url:string}>("SELECT id,url FROM asset_documents WHERE id=$1 AND asset_id=$2 LIMIT 1",[documentId,assetId]);if(!doc.rows[0])return;await query("DELETE FROM asset_documents WHERE id=$1 AND asset_id=$2",[documentId,assetId]);if(doc.rows[0].url.startsWith(`/api/files/${documentId}/`))await unlink(join(UPLOAD_ROOT,documentId)).catch(()=>undefined);await query("UPDATE assets SET updated_at=now() WHERE id=$1",[assetId]);revalidateAsset(assetId,asset.public_id);}
export async function updateVisibilityAction(formData:FormData){const user=await requireUser();const assetId=text(formData,"assetId",80);const visibility=text(formData,"visibility",20);if(!assetId||!visibility||!VISIBILITIES.has(visibility))return;const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanEdit(asset,user.id))return;await query("UPDATE assets SET visibility=$1,updated_at=now() WHERE id=$2",[visibility,assetId]);revalidateAsset(assetId,asset.public_id);}
