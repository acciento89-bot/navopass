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
import { canManage, listUserWorkspaces, listWorkspaceInvites, listWorkspaceMembers } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

function kindLabel(kind: string) {
  if (kind === "HOUSEHOLD") return "Haushalt";
  if (kind === "TEAM") return "Team / Firma";
  return "Persönlich";
}

function roleLabel(role: string) {
  if (role === "OWNER") return "Inhaber";
  if (role === "ADMIN") return "Admin";
  if (role === "EDITOR") return "Bearbeiter";
  return "Betrachter";
}

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ workspace?: string; invite?: string; error?: string; joined?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const workspaces = await listUserWorkspaces(user.id);
  const selected = workspaces.find((workspace) => workspace.id === params.workspace) ?? workspaces.find((workspace) => workspace.kind !== "PERSONAL") ?? workspaces[0];
  const members = selected ? await listWorkspaceMembers(selected.id) : [];
  const invites = selected && selected.kind !== "PERSONAL" && canManage(selected.role) ? await listWorkspaceInvites(selected.id) : [];
  const appUrl = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
  const inviteUrl = params.invite ? `${appUrl}/invite/${params.invite}` : null;

  return (
    <main className="app-page">
      <div className="container">
        <AppHeader name={user.name} />
        <section className="team-head"><div><span className="eyebrow">Gemeinsam verwalten</span><h1>Haushalte & Teams</h1><p>Teile Objektpässe mit Familie, Kollegen oder Mitarbeitern – mit klaren Rollen und Rechten.</p></div><a className="button ghost small" href="#new-workspace">+ Bereich erstellen</a></section>
        {params.error && <p className="form-error team-message">{params.error}</p>}
        {params.joined && <p className="form-success team-message">Einladung angenommen. Du hast jetzt Zugriff auf diesen Bereich.</p>}
        {inviteUrl && <section className="invite-result"><div><span className="eyebrow">Einladungslink erstellt</span><h2>Link jetzt weitergeben</h2><p>Der Link ist 7 Tage gültig und funktioniert nur mit der eingeladenen E-Mail-Adresse.</p></div><code>{inviteUrl}</code><p className="muted">Ein E-Mail-Versand ist bewusst noch nicht aktiv – solange kein Maildienst angebunden ist, gibst du diesen Link direkt an die Person weiter.</p></section>}

        <section className="team-layout">
          <aside className="workspace-sidebar">
            <div className="workspace-sidebar-title"><span>Deine Bereiche</span><b>{workspaces.length}</b></div>
            {workspaces.map((workspace) => <Link key={workspace.id} href={`/app/team?workspace=${workspace.id}`} className={`workspace-nav-card ${selected?.id === workspace.id ? "active" : ""}`}><span className="workspace-symbol">{workspace.kind === "PERSONAL" ? "P" : workspace.kind === "HOUSEHOLD" ? "H" : "T"}</span><div><b>{workspace.name}</b><small>{kindLabel(workspace.kind)} · {roleLabel(workspace.role)} · {workspace.member_count} Mitglied{workspace.member_count === 1 ? "" : "er"}</small></div></Link>)}
            <form action={createWorkspaceAction} id="new-workspace" className="workspace-create"><span className="eyebrow">Neuer Bereich</span><label>Name<input name="name" maxLength={120} placeholder="z. B. Familie Kaminski" required /></label><label>Typ<select name="kind" defaultValue="HOUSEHOLD"><option value="HOUSEHOLD">Haushalt / Familie</option><option value="TEAM">Team / Firma</option></select></label><button className="button small" type="submit">Bereich erstellen</button></form>
          </aside>

          {selected && <div className="workspace-main">
            <section className="workspace-overview panel"><div><span className="eyebrow">{kindLabel(selected.kind)}</span><h2>{selected.name}</h2><p className="muted">Deine Rolle: <b>{roleLabel(selected.role)}</b>. {selected.kind === "PERSONAL" ? "Dieser Bereich gehört nur dir." : "Alle Pässe in diesem Bereich sind für die Mitglieder entsprechend ihrer Rolle verfügbar."}</p></div>{selected.kind !== "PERSONAL" && canManage(selected.role) && <form action={renameWorkspaceAction} className="workspace-rename"><input type="hidden" name="workspaceId" value={selected.id} /><input name="name" defaultValue={selected.name} maxLength={120} required /><button className="button ghost small" type="submit">Umbenennen</button></form>}</section>

            <section className="panel"><div className="panel-head"><div><span className="eyebrow">Zugriff</span><h2>Mitglieder</h2></div><span className="count-pill">{members.length}</span></div><div className="member-list">{members.map((member) => <article className="member-row" key={member.user_id}><div className="member-avatar">{member.name.slice(0, 2).toUpperCase()}</div><div className="member-copy"><b>{member.name}{member.user_id === user.id ? " · Du" : ""}</b><span>{member.email}</span></div><span className={`role-chip ${member.role.toLowerCase()}`}>{roleLabel(member.role)}</span>{selected.kind !== "PERSONAL" && canManage(selected.role) && member.role !== "OWNER" && <div className="member-actions"><form action={updateMemberRoleAction}><input type="hidden" name="workspaceId" value={selected.id} /><input type="hidden" name="memberId" value={member.user_id} /><select name="role" defaultValue={member.role}><option value="ADMIN">Admin</option><option value="EDITOR">Bearbeiter</option><option value="VIEWER">Betrachter</option></select><button className="mini-action" type="submit">Speichern</button></form><form action={removeWorkspaceMemberAction}><input type="hidden" name="workspaceId" value={selected.id} /><input type="hidden" name="memberId" value={member.user_id} /><ConfirmButton className="mini-danger" type="submit" message={`${member.name} aus diesem Bereich entfernen?`}>Entfernen</ConfirmButton></form></div>}</article>)}</div></section>

            {selected.kind !== "PERSONAL" && canManage(selected.role) && <section className="panel"><div className="panel-head"><div><span className="eyebrow">Einladen</span><h2>Person hinzufügen</h2></div><span className="count-pill">7 Tage</span></div><form action={inviteMemberAction} className="invite-form"><input type="hidden" name="workspaceId" value={selected.id} /><label>E-Mail-Adresse<input name="email" type="email" placeholder="person@beispiel.de" required /></label><label>Rolle<select name="role" defaultValue="EDITOR"><option value="VIEWER">Betrachter – nur ansehen</option><option value="EDITOR">Bearbeiter – Pässe bearbeiten</option><option value="ADMIN">Admin – plus Mitglieder verwalten</option></select></label><button className="button" type="submit">Einladungslink erstellen</button></form>{invites.length > 0 && <div className="pending-invites"><h3>Offene Einladungen</h3>{invites.map((invite) => <div key={invite.id}><span><b>{invite.email}</b><small>{roleLabel(invite.role)} · gültig bis {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(invite.expires_at))}</small></span><form action={cancelWorkspaceInviteAction}><input type="hidden" name="workspaceId" value={selected.id} /><input type="hidden" name="inviteId" value={invite.id} /><button className="mini-danger" type="submit">Zurückziehen</button></form></div>)}</div>}</section>}

            {selected.kind !== "PERSONAL" && <section className="panel workspace-danger"><div><span className="eyebrow">Bereich verwalten</span><h2>{selected.role === "OWNER" ? "Bereich löschen" : "Bereich verlassen"}</h2><p className="muted">{selected.role === "OWNER" ? "Beim Löschen werden die Pässe nicht gelöscht, sondern zurück in deinen persönlichen Bereich verschoben." : "Du verlierst den Zugriff auf alle gemeinsamen Pässe dieses Bereichs."}</p></div>{selected.role === "OWNER" ? <form action={deleteWorkspaceAction}><input type="hidden" name="workspaceId" value={selected.id} /><ConfirmButton className="danger-button small" type="submit" message={`Bereich „${selected.name}“ wirklich löschen? Die Pässe werden in deinen persönlichen Bereich verschoben.`}>Bereich löschen</ConfirmButton></form> : <form action={leaveWorkspaceAction}><input type="hidden" name="workspaceId" value={selected.id} /><ConfirmButton className="danger-button small" type="submit" message={`Bereich „${selected.name}“ wirklich verlassen?`}>Bereich verlassen</ConfirmButton></form>}</section>}
          </div>}
        </section>
      </div>
    </main>
  );
}
