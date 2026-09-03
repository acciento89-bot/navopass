import Link from "next/link";
import {
  cancelWorkspaceInviteAction,
  createWorkspaceAction,
  deleteWorkspaceAction,
  inviteMemberAction,
  leaveWorkspaceAction,
  removeWorkspaceMemberAction,
  renameWorkspaceAction,
  updateMemberRoleAction,
} from "@/app/actions/workspaces";
import { AppHeader } from "@/components/app-header";
import { ConfirmButton } from "@/components/confirm-button";
import { requireUser } from "@/lib/auth";
import { getAccountPlanState } from "@/lib/plans";
import { canManage, listUserWorkspaces, listWorkspaceInvites, listWorkspaceMembers } from "@/lib/workspaces";
import { getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function kindLabel(kind: string, en: boolean) {
  if (kind === "HOUSEHOLD") return en ? "Household" : "Haushalt";
  if (kind === "TEAM") return en ? "Team / company" : "Team / Firma";
  return en ? "Personal" : "Persönlich";
}

function roleLabel(role: string, en: boolean) {
  if (role === "OWNER") return en ? "Owner" : "Inhaber";
  if (role === "ADMIN") return "Admin";
  if (role === "EDITOR") return en ? "Editor" : "Bearbeiter";
  return en ? "Viewer" : "Betrachter";
}

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ workspace?: string; invite?: string; emailState?: string; error?: string; joined?: string; upgrade?: string }> }) {
  const user = await requireUser();
  const en = (await getLocale()) === "en";
  const params = await searchParams;
  const [workspaces, ownPlan] = await Promise.all([listUserWorkspaces(user.id), getAccountPlanState(user.id)]);
  const selected = workspaces.find((workspace) => workspace.id === params.workspace) ?? workspaces.find((workspace) => workspace.kind !== "PERSONAL") ?? workspaces[0];
  const members = selected ? await listWorkspaceMembers(selected.id) : [];
  const invites = selected && selected.kind !== "PERSONAL" && canManage(selected.role) ? await listWorkspaceInvites(selected.id) : [];
  const appUrl = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
  const inviteUrl = params.invite ? `${appUrl}/invite/${params.invite}` : null;
  const sharedLimit = ownPlan.definition.maxSharedWorkspaces;
  const canCreateOwnWorkspace = sharedLimit === null || ownPlan.usage.sharedWorkspaces < sharedLimit;

  return (
    <main className="app-page">
      <div className="container">
        <AppHeader name={user.name} />
        <section className="team-head"><div><span className="eyebrow">{en ? "Manage together" : "Gemeinsam verwalten"}</span><h1>{en ? "Households & teams" : "Haushalte & Teams"}</h1><p>{en ? "Share asset passes with family, colleagues, or employees – with clear roles and permissions." : "Teile Objektpässe mit Familie, Kollegen oder Mitarbeitern – mit klaren Rollen und Rechten."}</p></div>{canCreateOwnWorkspace ? <a className="button ghost small" href="#new-workspace">+ {en ? "Create workspace" : "Bereich erstellen"}</a> : <Link className="button ghost small" href="/preise">{en ? "Collaboration plan" : "Tarif für Zusammenarbeit"} →</Link>}</section>
        {params.error && <p className="form-error team-message">{params.error}</p>}
        {params.upgrade && <div className="upgrade-banner"><span><b>{en ? "Plan limit reached." : "Tariflimit erreicht."}</b> {en ? "Your existing workspaces and data remain available. Choose a larger plan to keep growing." : "Deine bestehenden Bereiche und Daten bleiben erhalten. Für weiteres Wachstum brauchst du einen größeren Tarif."}</span><Link href="/preise">{en ? "View plans" : "Tarife ansehen"} →</Link></div>}
        {params.joined && <p className="form-success team-message">{en ? "Invitation accepted. You now have access to this workspace." : "Einladung angenommen. Du hast jetzt Zugriff auf diesen Bereich."}</p>}
        {inviteUrl && <section className="invite-result"><div><span className="eyebrow">{en ? "Invitation created" : "Einladung erstellt"}</span><h2>{params.emailState === "sent" ? (en ? "Invitation sent by email" : "Einladung wurde per E-Mail versendet") : (en ? "Invitation link is ready" : "Einladungslink ist bereit")}</h2><p>{params.emailState === "sent" ? (en ? "The invitee received the link by email. You can also share it directly if needed." : "Die eingeladene Person hat den Link per E-Mail erhalten. Du kannst ihn bei Bedarf zusätzlich direkt weitergeben.") : params.emailState === "failed" ? (en ? "The email could not be sent. The invitation is valid – please share the link directly." : "Der E-Mail-Versand hat nicht funktioniert. Die Einladung selbst ist gültig – gib den Link bitte direkt weiter.") : (en ? "Email delivery is not configured yet. Please share the link directly with the invitee." : "Der Mailversand ist noch nicht konfiguriert. Gib den Link bitte direkt an die eingeladene Person weiter.")}</p></div><code>{inviteUrl}</code><p className="muted">{en ? "The link is valid for 7 days and only works with the invited email address." : "Der Link ist 7 Tage gültig und funktioniert nur mit der eingeladenen E-Mail-Adresse."}</p></section>}

        <section className="team-layout">
          <aside className="workspace-sidebar">
            <div className="workspace-sidebar-title"><span>{en ? "Your workspaces" : "Deine Bereiche"}</span><b>{workspaces.length}</b></div>
            {workspaces.map((workspace) => <Link key={workspace.id} href={`/app/team?workspace=${workspace.id}`} className={`workspace-nav-card ${selected?.id === workspace.id ? "active" : ""}`}><span className="workspace-symbol">{workspace.kind === "PERSONAL" ? "P" : workspace.kind === "HOUSEHOLD" ? "H" : "T"}</span><div><b>{workspace.name}</b><small>{kindLabel(workspace.kind, en)} · {roleLabel(workspace.role, en)} · {workspace.member_count} {en ? (workspace.member_count === 1 ? "member" : "members") : `Mitglied${workspace.member_count === 1 ? "" : "er"}`}</small></div></Link>)}
            {canCreateOwnWorkspace ? <form action={createWorkspaceAction} id="new-workspace" className="workspace-create"><span className="eyebrow">{en ? "New workspace" : "Neuer Bereich"}</span><label>{en ? "Name" : "Name"}<input name="name" maxLength={120} placeholder={en ? "e.g. Kaminski family" : "z. B. Familie Kaminski"} required /></label><label>{en ? "Type" : "Typ"}<select name="kind" defaultValue="HOUSEHOLD"><option value="HOUSEHOLD">{en ? "Household / family" : "Haushalt / Familie"}</option><option value="TEAM">{en ? "Team / company" : "Team / Firma"}</option></select></label><button className="button small" type="submit">{en ? "Create workspace" : "Bereich erstellen"}</button></form> : <div className="workspace-create"><span className="eyebrow">{ownPlan.definition.name}</span><b>{en ? "Shared workspaces unavailable" : "Gemeinsame Bereiche nicht verfügbar"}</b><span className="muted">{sharedLimit === 0 ? (en ? "This plan is intended for personal use." : "Dieser Tarif ist für persönliche Nutzung ausgelegt.") : (en ? `You already use ${ownPlan.usage.sharedWorkspaces} of ${sharedLimit} shared workspaces.` : `Du nutzt bereits ${ownPlan.usage.sharedWorkspaces} von ${sharedLimit} gemeinsamen Bereichen.`)}</span><Link className="button small" href="/preise">{en ? "Compare plans" : "Tarife vergleichen"}</Link></div>}
          </aside>

          {selected && <div className="workspace-main">
            <section className="workspace-overview panel"><div><span className="eyebrow">{kindLabel(selected.kind, en)}</span><h2>{selected.name}</h2><p className="muted">{en ? "Your role" : "Deine Rolle"}: <b>{roleLabel(selected.role, en)}</b>. {selected.kind === "PERSONAL" ? (en ? "This workspace belongs only to you." : "Dieser Bereich gehört nur dir.") : (en ? "All passes in this workspace are available to members according to their role." : "Alle Pässe in diesem Bereich sind für die Mitglieder entsprechend ihrer Rolle verfügbar.")}</p></div>{selected.kind !== "PERSONAL" && canManage(selected.role) && <form action={renameWorkspaceAction} className="workspace-rename"><input type="hidden" name="workspaceId" value={selected.id} /><input name="name" defaultValue={selected.name} maxLength={120} required /><button className="button ghost small" type="submit">{en ? "Rename" : "Umbenennen"}</button></form>}</section>

            <section className="panel"><div className="panel-head"><div><span className="eyebrow">{en ? "Access" : "Zugriff"}</span><h2>{en ? "Members" : "Mitglieder"}</h2></div><span className="count-pill">{members.length}</span></div><div className="member-list">{members.map((member) => <article className="member-row" key={member.user_id}><div className="member-avatar">{member.name.slice(0, 2).toUpperCase()}</div><div className="member-copy"><b>{member.name}{member.user_id === user.id ? ` · ${en ? "You" : "Du"}` : ""}</b><span>{member.email}</span></div><span className={`role-chip ${member.role.toLowerCase()}`}>{roleLabel(member.role, en)}</span>{selected.kind !== "PERSONAL" && canManage(selected.role) && member.role !== "OWNER" && <div className="member-actions"><form action={updateMemberRoleAction}><input type="hidden" name="workspaceId" value={selected.id} /><input type="hidden" name="memberId" value={member.user_id} /><select name="role" defaultValue={member.role}><option value="ADMIN">Admin</option><option value="EDITOR">{en ? "Editor" : "Bearbeiter"}</option><option value="VIEWER">{en ? "Viewer" : "Betrachter"}</option></select><button className="mini-action" type="submit">{en ? "Save" : "Speichern"}</button></form><form action={removeWorkspaceMemberAction}><input type="hidden" name="workspaceId" value={selected.id} /><input type="hidden" name="memberId" value={member.user_id} /><ConfirmButton className="mini-danger" type="submit" message={en ? `Remove ${member.name} from this workspace?` : `${member.name} aus diesem Bereich entfernen?`}>{en ? "Remove" : "Entfernen"}</ConfirmButton></form></div>}</article>)}</div></section>

            {selected.kind !== "PERSONAL" && canManage(selected.role) && <section className="panel"><div className="panel-head"><div><span className="eyebrow">{en ? "Invite" : "Einladen"}</span><h2>{en ? "Add person" : "Person hinzufügen"}</h2></div><span className="count-pill">7 {en ? "days" : "Tage"}</span></div><form action={inviteMemberAction} className="invite-form"><input type="hidden" name="workspaceId" value={selected.id} /><label>{en ? "Email address" : "E-Mail-Adresse"}<input name="email" type="email" placeholder={en ? "person@example.com" : "person@beispiel.de"} required /></label><label>{en ? "Role" : "Rolle"}<select name="role" defaultValue="EDITOR"><option value="VIEWER">{en ? "Viewer – view only" : "Betrachter – nur ansehen"}</option><option value="EDITOR">{en ? "Editor – edit passes" : "Bearbeiter – Pässe bearbeiten"}</option><option value="ADMIN">{en ? "Admin – also manage members" : "Admin – plus Mitglieder verwalten"}</option></select></label><button className="button" type="submit">{en ? "Create & send invitation" : "Einladung erstellen & senden"}</button></form>{invites.length > 0 && <div className="pending-invites"><h3>{en ? "Pending invitations" : "Offene Einladungen"}</h3>{invites.map((invite) => <div key={invite.id}><span><b>{invite.email}</b><small>{roleLabel(invite.role, en)} · {en ? "valid until" : "gültig bis"} {new Intl.DateTimeFormat(en ? "en-US" : "de-DE", { dateStyle: "medium" }).format(new Date(invite.expires_at))}</small></span><form action={cancelWorkspaceInviteAction}><input type="hidden" name="workspaceId" value={selected.id} /><input type="hidden" name="inviteId" value={invite.id} /><button className="mini-danger" type="submit">{en ? "Withdraw" : "Zurückziehen"}</button></form></div>)}</div>}</section>}

            {selected.kind !== "PERSONAL" && <section className="panel workspace-danger"><div><span className="eyebrow">{en ? "Manage workspace" : "Bereich verwalten"}</span><h2>{selected.role === "OWNER" ? (en ? "Delete workspace" : "Bereich löschen") : (en ? "Leave workspace" : "Bereich verlassen")}</h2><p className="muted">{selected.role === "OWNER" ? (en ? "Deleting does not remove the passes; they are moved back to your personal workspace." : "Beim Löschen werden die Pässe nicht gelöscht, sondern zurück in deinen persönlichen Bereich verschoben.") : (en ? "You will lose access to all shared passes in this workspace." : "Du verlierst den Zugriff auf alle gemeinsamen Pässe dieses Bereichs.")}</p></div>{selected.role === "OWNER" ? <form action={deleteWorkspaceAction}><input type="hidden" name="workspaceId" value={selected.id} /><ConfirmButton className="danger-button small" type="submit" message={en ? `Really delete “${selected.name}”? Its passes will be moved to your personal workspace.` : `Bereich „${selected.name}“ wirklich löschen? Die Pässe werden in deinen persönlichen Bereich verschoben.`}>{en ? "Delete workspace" : "Bereich löschen"}</ConfirmButton></form> : <form action={leaveWorkspaceAction}><input type="hidden" name="workspaceId" value={selected.id} /><ConfirmButton className="danger-button small" type="submit" message={en ? `Really leave “${selected.name}”?` : `Bereich „${selected.name}“ wirklich verlassen?`}>{en ? "Leave workspace" : "Bereich verlassen"}</ConfirmButton></form>}</section>}
          </div>}
        </section>
      </div>
    </main>
  );
}
