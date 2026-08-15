import Link from "next/link";
import { acceptWorkspaceInviteAction } from "@/app/actions/workspaces";
import { Logo } from "@/components/logo";
import { getCurrentUser, normalizeEmail } from "@/lib/auth";
import { getInviteByToken } from "@/lib/workspaces";

function maskedEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}${"•".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const invite = await getInviteByToken(token);
  const user = await getCurrentUser();
  const next = `/invite/${encodeURIComponent(token)}`;

  return (
    <main className="invite-page">
      <section className="invite-card">
        <Logo />
        {!invite ? <><span className="invite-icon">!</span><h1>Einladung nicht mehr gültig</h1><p>Der Link ist abgelaufen, wurde bereits verwendet oder zurückgezogen.</p><Link className="button" href="/app">Zu NavoPass</Link></> : <>
          <span className="eyebrow">Gemeinsam in NavoPass</span>
          <h1>Einladung zu „{invite.workspace_name}“</h1>
          <p>Du wurdest als <b>{invite.role === "ADMIN" ? "Administrator" : invite.role === "EDITOR" ? "Bearbeiter" : "Betrachter"}</b> eingeladen. Die Einladung ist für {maskedEmail(invite.email)} bestimmt.</p>
          {error && <p className="form-error">{error}</p>}
          {!user ? <div className="invite-actions"><Link className="button" href={`/login?next=${encodeURIComponent(next)}`}>Anmelden & annehmen</Link><Link className="button ghost" href={`/register?next=${encodeURIComponent(next)}`}>Konto erstellen</Link></div> : normalizeEmail(user.email) !== normalizeEmail(invite.email) ? <div className="invite-warning"><b>Falsches Konto angemeldet</b><span>Du bist als {user.email} angemeldet. Diese Einladung gehört zu einer anderen E-Mail-Adresse.</span><Link className="button ghost small" href="/app">Zum Dashboard</Link></div> : <form action={acceptWorkspaceInviteAction}><input type="hidden" name="token" value={token} /><button className="button" type="submit">Einladung annehmen →</button></form>}
          <div className="invite-role-info"><span>VIEWER · ansehen</span><span>EDITOR · bearbeiten</span><span>ADMIN · Mitglieder verwalten</span></div>
        </>}
      </section>
    </main>
  );
}
