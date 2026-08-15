"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeEmail, requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  canManage,
  createWorkspaceInvite,
  ensurePersonalWorkspace,
  getInviteByToken,
  getWorkspaceMembership,
  listWorkspaceMembers,
  type WorkspaceRole,
} from "@/lib/workspaces";

function text(formData: FormData, key: string, max = 300) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

const inviteRoles = new Set(["ADMIN", "EDITOR", "VIEWER"]);

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const name = text(formData, "name", 120);
  const kind = text(formData, "kind", 20) === "TEAM" ? "TEAM" : "HOUSEHOLD";
  if (name.length < 2) redirect("/app/team?error=Bitte%20einen%20Namen%20angeben");

  const result = await query<{ id: string }>(
    "INSERT INTO workspaces (name,kind,owner_id) VALUES ($1,$2,$3) RETURNING id",
    [name, kind, user.id]
  );
  await query("INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,'OWNER')", [result.rows[0].id, user.id]);
  revalidatePath("/app/team");
  redirect(`/app/team?workspace=${result.rows[0].id}`);
}

export async function renameWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = text(formData, "workspaceId", 80);
  const name = text(formData, "name", 120);
  if (!workspaceId || name.length < 2) return;
  const membership = await getWorkspaceMembership(user.id, workspaceId);
  if (!membership || !canManage(membership.role) || membership.kind === "PERSONAL") return;
  await query("UPDATE workspaces SET name=$1,updated_at=now() WHERE id=$2", [name, workspaceId]);
  revalidatePath("/app"); revalidatePath("/app/team");
  redirect(`/app/team?workspace=${workspaceId}`);
}

export async function inviteMemberAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = text(formData, "workspaceId", 80);
  const email = normalizeEmail(text(formData, "email", 240));
  const requestedRole = text(formData, "role", 20);
  const role = (inviteRoles.has(requestedRole) ? requestedRole : "VIEWER") as Exclude<WorkspaceRole, "OWNER">;
  if (!workspaceId || !email.includes("@")) redirect(`/app/team?workspace=${workspaceId}&error=Bitte%20gueltige%20E-Mail%20angeben`);
  const membership = await getWorkspaceMembership(user.id, workspaceId);
  if (!membership || !canManage(membership.role) || membership.kind === "PERSONAL") return;

  const members = await listWorkspaceMembers(workspaceId);
  if (members.some((member) => member.email.toLowerCase() === email)) {
    redirect(`/app/team?workspace=${workspaceId}&error=Diese%20Person%20ist%20bereits%20Mitglied`);
  }

  const token = await createWorkspaceInvite(workspaceId, email, role, user.id);
  revalidatePath("/app/team"); revalidatePath("/app/notifications");
  redirect(`/app/team?workspace=${workspaceId}&invite=${encodeURIComponent(token)}`);
}

export async function acceptWorkspaceInviteAction(formData: FormData) {
  const user = await requireUser();
  const token = text(formData, "token", 200);
  if (!token) redirect("/app");
  const invite = await getInviteByToken(token);
  if (!invite) redirect(`/invite/${encodeURIComponent(token)}?error=Einladung%20ist%20ungueltig%20oder%20abgelaufen`);
  if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
    redirect(`/invite/${encodeURIComponent(token)}?error=Diese%20Einladung%20ist%20fuer%20eine%20andere%20E-Mail-Adresse`);
  }

  await query(
    `INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,$3)
     ON CONFLICT (workspace_id,user_id) DO NOTHING`,
    [invite.workspace_id, user.id, invite.role]
  );
  await query("UPDATE workspace_invites SET accepted_at=now() WHERE id=$1", [invite.id]);
  revalidatePath("/app"); revalidatePath("/app/team"); revalidatePath("/app/notifications");
  redirect(`/app/team?workspace=${invite.workspace_id}&joined=1`);
}

export async function updateMemberRoleAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = text(formData, "workspaceId", 80);
  const memberId = text(formData, "memberId", 80);
  const requestedRole = text(formData, "role", 20);
  if (!workspaceId || !memberId || !inviteRoles.has(requestedRole)) return;
  const membership = await getWorkspaceMembership(user.id, workspaceId);
  if (!membership || !canManage(membership.role)) return;
  const target = (await listWorkspaceMembers(workspaceId)).find((member) => member.user_id === memberId);
  if (!target || target.role === "OWNER") return;
  if (membership.role === "ADMIN" && target.role === "ADMIN") return;
  await query("UPDATE workspace_members SET role=$1 WHERE workspace_id=$2 AND user_id=$3", [requestedRole, workspaceId, memberId]);
  revalidatePath("/app/team");
}

export async function removeWorkspaceMemberAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = text(formData, "workspaceId", 80);
  const memberId = text(formData, "memberId", 80);
  if (!workspaceId || !memberId) return;
  const membership = await getWorkspaceMembership(user.id, workspaceId);
  if (!membership || !canManage(membership.role)) return;
  const target = (await listWorkspaceMembers(workspaceId)).find((member) => member.user_id === memberId);
  if (!target || target.role === "OWNER") return;
  if (membership.role === "ADMIN" && target.role === "ADMIN") return;
  await query("DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2", [workspaceId, memberId]);
  revalidatePath("/app/team"); revalidatePath("/app");
}

export async function leaveWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = text(formData, "workspaceId", 80);
  if (!workspaceId) return;
  const membership = await getWorkspaceMembership(user.id, workspaceId);
  if (!membership || membership.role === "OWNER" || membership.kind === "PERSONAL") return;
  await query("DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2", [workspaceId, user.id]);
  revalidatePath("/app"); revalidatePath("/app/team");
  redirect("/app/team");
}

export async function cancelWorkspaceInviteAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = text(formData, "workspaceId", 80);
  const inviteId = text(formData, "inviteId", 80);
  if (!workspaceId || !inviteId) return;
  const membership = await getWorkspaceMembership(user.id, workspaceId);
  if (!membership || !canManage(membership.role)) return;
  await query("DELETE FROM workspace_invites WHERE id=$1 AND workspace_id=$2", [inviteId, workspaceId]);
  revalidatePath("/app/team");
}

export async function deleteWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = text(formData, "workspaceId", 80);
  if (!workspaceId) return;
  const membership = await getWorkspaceMembership(user.id, workspaceId);
  if (!membership || membership.role !== "OWNER" || membership.kind === "PERSONAL") return;
  const personalId = await ensurePersonalWorkspace(user);
  await query("UPDATE assets SET workspace_id=$1,owner_id=$2,updated_at=now() WHERE workspace_id=$3", [personalId, user.id, workspaceId]);
  await query("DELETE FROM workspaces WHERE id=$1", [workspaceId]);
  revalidatePath("/app"); revalidatePath("/app/team"); revalidatePath("/app/service");
  redirect("/app/team");
}
