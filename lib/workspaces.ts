import { createHash, randomBytes } from "node:crypto";
import { query } from "@/lib/db";

export type WorkspaceKind = "PERSONAL" | "HOUSEHOLD" | "TEAM";
export type WorkspaceRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export type WorkspaceMembership = {
  id: string;
  name: string;
  kind: WorkspaceKind;
  owner_id: string;
  role: WorkspaceRole;
  member_count: number;
};

export type WorkspaceMember = {
  user_id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  created_at: string;
};

export type WorkspaceInvite = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
  role: Exclude<WorkspaceRole, "OWNER">;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export function inviteTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function canEdit(role: WorkspaceRole | null | undefined) {
  return role === "OWNER" || role === "ADMIN" || role === "EDITOR";
}

export function canManage(role: WorkspaceRole | null | undefined) {
  return role === "OWNER" || role === "ADMIN";
}

export async function ensurePersonalWorkspace(user: { id: string; name: string }) {
  let result = await query<{ id: string }>(
    "SELECT id FROM workspaces WHERE owner_id=$1 AND kind='PERSONAL' LIMIT 1",
    [user.id]
  );

  if (!result.rows[0]) {
    try {
      result = await query<{ id: string }>(
        "INSERT INTO workspaces (name,kind,owner_id) VALUES ($1,'PERSONAL',$2) RETURNING id",
        ["Persönlich", user.id]
      );
    } catch {
      result = await query<{ id: string }>(
        "SELECT id FROM workspaces WHERE owner_id=$1 AND kind='PERSONAL' LIMIT 1",
        [user.id]
      );
    }
  }

  const workspaceId = result.rows[0]?.id;
  if (!workspaceId) throw new Error("Personal workspace could not be created");

  await query(
    `INSERT INTO workspace_members (workspace_id,user_id,role)
     VALUES ($1,$2,'OWNER') ON CONFLICT (workspace_id,user_id) DO UPDATE SET role='OWNER'`,
    [workspaceId, user.id]
  );
  await query("UPDATE assets SET workspace_id=$1 WHERE owner_id=$2 AND workspace_id IS NULL", [workspaceId, user.id]);
  return workspaceId;
}

export async function listUserWorkspaces(userId: string) {
  const result = await query<WorkspaceMembership>(
    `SELECT w.id,w.name,w.kind,w.owner_id,wm.role,
      (SELECT count(*)::int FROM workspace_members x WHERE x.workspace_id=w.id) AS member_count
     FROM workspace_members wm
     JOIN workspaces w ON w.id=wm.workspace_id
     WHERE wm.user_id=$1
     ORDER BY CASE w.kind WHEN 'PERSONAL' THEN 0 WHEN 'HOUSEHOLD' THEN 1 ELSE 2 END,w.name`,
    [userId]
  );
  return result.rows;
}

export async function getWorkspaceMembership(userId: string, workspaceId: string) {
  const result = await query<WorkspaceMembership>(
    `SELECT w.id,w.name,w.kind,w.owner_id,wm.role,
      (SELECT count(*)::int FROM workspace_members x WHERE x.workspace_id=w.id) AS member_count
     FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id
     WHERE wm.user_id=$1 AND w.id=$2 LIMIT 1`,
    [userId, workspaceId]
  );
  return result.rows[0] ?? null;
}

export async function listWorkspaceMembers(workspaceId: string) {
  const result = await query<WorkspaceMember>(
    `SELECT u.id AS user_id,u.name,u.email,wm.role,wm.created_at
     FROM workspace_members wm JOIN users u ON u.id=wm.user_id
     WHERE wm.workspace_id=$1
     ORDER BY CASE wm.role WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 WHEN 'EDITOR' THEN 2 ELSE 3 END,u.name`,
    [workspaceId]
  );
  return result.rows;
}

export async function listWorkspaceInvites(workspaceId: string) {
  const result = await query<WorkspaceInvite>(
    `SELECT i.id,i.workspace_id,w.name AS workspace_name,i.email,i.role,i.expires_at,i.accepted_at,i.created_at
     FROM workspace_invites i JOIN workspaces w ON w.id=i.workspace_id
     WHERE i.workspace_id=$1 AND i.accepted_at IS NULL AND i.expires_at>now()
     ORDER BY i.created_at DESC`,
    [workspaceId]
  );
  return result.rows;
}

export async function listPendingInvitesForEmail(email: string) {
  const result = await query<WorkspaceInvite>(
    `SELECT i.id,i.workspace_id,w.name AS workspace_name,i.email,i.role,i.expires_at,i.accepted_at,i.created_at
     FROM workspace_invites i JOIN workspaces w ON w.id=i.workspace_id
     WHERE lower(i.email)=lower($1) AND i.accepted_at IS NULL AND i.expires_at>now()
     ORDER BY i.created_at DESC`,
    [email]
  );
  return result.rows;
}

export async function createWorkspaceInvite(workspaceId: string, email: string, role: Exclude<WorkspaceRole, "OWNER">, createdBy: string) {
  const token = randomBytes(32).toString("base64url");
  const hash = inviteTokenHash(token);
  await query(
    `DELETE FROM workspace_invites WHERE workspace_id=$1 AND lower(email)=lower($2) AND accepted_at IS NULL`,
    [workspaceId, email]
  );
  await query(
    `INSERT INTO workspace_invites (workspace_id,email,role,token_hash,expires_at,created_by)
     VALUES ($1,lower($2),$3,$4,now()+interval '7 days',$5)`,
    [workspaceId, email, role, hash, createdBy]
  );
  return token;
}

export async function getInviteByToken(token: string) {
  const result = await query<WorkspaceInvite & { token_hash: string }>(
    `SELECT i.id,i.workspace_id,w.name AS workspace_name,i.email,i.role,i.expires_at,i.accepted_at,i.created_at,i.token_hash
     FROM workspace_invites i JOIN workspaces w ON w.id=i.workspace_id
     WHERE i.token_hash=$1 AND i.accepted_at IS NULL AND i.expires_at>now() LIMIT 1`,
    [inviteTokenHash(token)]
  );
  return result.rows[0] ?? null;
}
