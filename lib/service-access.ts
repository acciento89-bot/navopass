import { createHash, randomBytes } from "node:crypto";
import { query } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth";

export type ServiceGrant = {
  asset_id:string;
  user_id:string;
  granted_by:string;
  expires_at:string;
  revoked_at:string|null;
  created_at:string;
  updated_at:string;
  email?:string;
  name?:string;
  company_name?:string|null;
  professional_title?:string|null;
};

export type ServiceInvite = {
  id:string;
  asset_id:string;
  email:string;
  expires_at:string;
  access_until:string;
  accepted_at:string|null;
  revoked_at:string|null;
  created_at:string;
};

function tokenHash(token:string){return createHash("sha256").update(token).digest("hex");}

export async function createServiceInvite(assetId:string,email:string,createdBy:string,accessDays:number){
  const normalized=normalizeEmail(email);
  const token=randomBytes(32).toString("base64url");
  const days=Math.max(1,Math.min(365,accessDays));
  await query(`UPDATE asset_service_invites SET revoked_at=now() WHERE asset_id=$1 AND lower(email)=lower($2) AND accepted_at IS NULL AND revoked_at IS NULL`,[assetId,normalized]);
  await query(`INSERT INTO asset_service_invites (asset_id,email,token_hash,expires_at,access_until,created_by)
    VALUES ($1,$2,$3,now()+interval '7 days',now()+($4::text||' days')::interval,$5)`,[assetId,normalized,tokenHash(token),days,createdBy]);
  return token;
}

export async function getServiceInviteByToken(token:string){
  const result=await query<ServiceInvite>(`SELECT id,asset_id,email,expires_at,access_until,accepted_at,revoked_at,created_at
    FROM asset_service_invites WHERE token_hash=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() LIMIT 1`,[tokenHash(token)]);
  return result.rows[0]??null;
}

export async function acceptServiceInvite(invite:ServiceInvite,userId:string){
  await query(`INSERT INTO asset_service_grants (asset_id,user_id,granted_by,expires_at,revoked_at,updated_at)
    SELECT i.asset_id,$2,i.created_by,i.access_until,NULL,now() FROM asset_service_invites i WHERE i.id=$1
    ON CONFLICT (asset_id,user_id) DO UPDATE SET granted_by=EXCLUDED.granted_by,expires_at=EXCLUDED.expires_at,revoked_at=NULL,updated_at=now()`,[invite.id,userId]);
  await query("UPDATE asset_service_invites SET accepted_at=now() WHERE id=$1",[invite.id]);
}

export async function listServiceGrants(assetId:string){
  const result=await query<ServiceGrant>(`SELECT g.*,u.email,u.name,u.company_name,u.professional_title
    FROM asset_service_grants g JOIN users u ON u.id=g.user_id
    WHERE g.asset_id=$1 AND g.revoked_at IS NULL AND g.expires_at>now()
    ORDER BY g.expires_at ASC`,[assetId]);
  return result.rows;
}

export async function listPendingServiceInvites(assetId:string){
  const result=await query<ServiceInvite>(`SELECT id,asset_id,email,expires_at,access_until,accepted_at,revoked_at,created_at
    FROM asset_service_invites WHERE asset_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC`,[assetId]);
  return result.rows;
}

export async function revokeServiceGrant(assetId:string,userId:string){
  await query("UPDATE asset_service_grants SET revoked_at=now(),updated_at=now() WHERE asset_id=$1 AND user_id=$2",[assetId,userId]);
}

export async function revokeServiceInvite(assetId:string,inviteId:string){
  await query("UPDATE asset_service_invites SET revoked_at=now() WHERE asset_id=$1 AND id=$2",[assetId,inviteId]);
}
