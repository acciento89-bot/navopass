"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeEmail, requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { brandedMail, isMailConfigured, sendMail } from "@/lib/mailer";
import { acceptServiceInvite, createServiceInvite, getServiceInviteByToken, revokeServiceGrant, revokeServiceInvite } from "@/lib/service-access";

function text(formData:FormData,key:string,max=300){return String(formData.get(key)??"").trim().slice(0,max);}

export async function inviteServicePartnerAction(formData:FormData){
  const user=await requireUser();
  const assetId=text(formData,"assetId",80);
  const email=normalizeEmail(text(formData,"email",240));
  const rawDays=Number.parseInt(text(formData,"accessDays",10),10);
  const accessDays=Number.isFinite(rawDays)?Math.max(1,Math.min(365,rawDays)):30;
  if(!assetId||!email.includes("@"))redirect(`/app/assets/${assetId}?serviceError=${encodeURIComponent("Bitte eine gültige E-Mail-Adresse angeben.")}`);
  const asset=await getOwnedAsset(user.id,assetId);
  if(!asset||!roleCanManage(asset,user.id))redirect(`/app/assets/${assetId}?serviceError=${encodeURIComponent("Keine Berechtigung für Servicefreigaben.")}`);

  const token=await createServiceInvite(asset.id,email,user.id,accessDays);
  const appUrl=(process.env.APP_URL||"https://navopass.de").replace(/\/$/,"");
  const inviteUrl=`${appUrl}/service-invite/${encodeURIComponent(token)}`;
  let delivery="manual";
  if(isMailConfigured()){
    try{
      const intro=`${user.name} gibt dir für ${accessDays} Tage Servicezugriff auf den NavoPass „${asset.name}“. Die Freigabe gilt nur für diesen einzelnen Objektpass. Nach Annahme kannst du Wartungs-, Reparatur- und Prüfereignisse dokumentieren.`;
      await sendMail({
        to:email,
        subject:`Servicefreigabe für ${asset.name}`,
        text:`${intro}\n\nFreigabe annehmen:\n${inviteUrl}\n\nDie Einladung selbst ist 7 Tage gültig und ausschließlich für ${email} bestimmt.`,
        html:brandedMail({title:"NavoPass Servicefreigabe",intro,actionLabel:"Servicezugriff annehmen",actionUrl:inviteUrl,footer:"Der QR-Code allein verleiht keine Schreibrechte. Die Freigabe kann vom Eigentümer jederzeit widerrufen werden."}),
      });
      delivery="sent";
    }catch(error){console.error("NavoPass service invite email failed",error);delivery="failed";}
  }
  revalidatePath(`/app/assets/${asset.id}`);
  redirect(`/app/assets/${asset.id}?serviceInvite=${encodeURIComponent(token)}&serviceDelivery=${delivery}`);
}

export async function acceptServiceAccessAction(formData:FormData){
  const user=await requireUser();
  const token=text(formData,"token",200);
  if(!token)redirect("/app");
  const invite=await getServiceInviteByToken(token);
  if(!invite)redirect(`/service-invite/${encodeURIComponent(token)}?error=${encodeURIComponent("Einladung ist ungültig oder abgelaufen.")}`);
  if(normalizeEmail(user.email)!==normalizeEmail(invite.email))redirect(`/service-invite/${encodeURIComponent(token)}?error=${encodeURIComponent("Diese Servicefreigabe ist für eine andere E-Mail-Adresse bestimmt.")}`);
  await acceptServiceInvite(invite,user.id);
  redirect(`/app/assets/${invite.asset_id}?serviceJoined=1`);
}

export async function revokeServiceGrantAction(formData:FormData){
  const user=await requireUser();const assetId=text(formData,"assetId",80);const targetUserId=text(formData,"userId",80);if(!assetId||!targetUserId)return;
  const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanManage(asset,user.id))return;
  await revokeServiceGrant(assetId,targetUserId);revalidatePath(`/app/assets/${assetId}`);revalidatePath("/app");
}

export async function revokeServiceInviteAction(formData:FormData){
  const user=await requireUser();const assetId=text(formData,"assetId",80);const inviteId=text(formData,"inviteId",80);if(!assetId||!inviteId)return;
  const asset=await getOwnedAsset(user.id,assetId);if(!asset||!roleCanManage(asset,user.id))return;
  await revokeServiceInvite(assetId,inviteId);revalidatePath(`/app/assets/${assetId}`);
}
