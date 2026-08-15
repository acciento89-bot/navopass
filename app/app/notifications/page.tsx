import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { listAssets } from "@/lib/assets";
import { listPendingInvitesForEmail } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

function diffDays(value: string) {
  const due = new Date(`${value}T12:00:00`).getTime();
  const now = new Date(); now.setHours(12, 0, 0, 0);
  return Math.ceil((due - now.getTime()) / 86400000);
}

function relative(days: number) {
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? "Tag" : "Tage"} überfällig`;
  if (days === 0) return "heute fällig";
  if (days === 1) return "morgen fällig";
  return `in ${days} Tagen`;
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const reminderDays = user.reminder_days ?? 30;
  const assets = (await listAssets(user.id)).filter((asset) => !asset.archived_at);
  const invites = await listPendingInvitesForEmail(user.email);
  const reminders = assets.flatMap((asset) => {
    const result: { key: string; type: "SERVICE" | "WARRANTY"; days: number; date: string; asset: typeof asset }[] = [];
    if (asset.next_service_date) {
      const days = diffDays(asset.next_service_date);
      if (days <= reminderDays) result.push({ key: `${asset.id}-service`, type: "SERVICE", days, date: asset.next_service_date, asset });
    }
    if (asset.warranty_until) {
      const days = diffDays(asset.warranty_until);
      if (days <= reminderDays) result.push({ key: `${asset.id}-warranty`, type: "WARRANTY", days, date: asset.warranty_until, asset });
    }
    return result;
  }).sort((a, b) => a.days - b.days);
  const urgent = reminders.filter((item) => item.days < 0).length;

  return (
    <main className="app-page"><div className="container"><AppHeader name={user.name} />
      <section className="notifications-head"><div><span className="eyebrow">NavoPass erinnert dich</span><h1>Benachrichtigungen</h1><p>Wartungen, Garantiefristen und offene Einladungen an einem Ort. Dein aktueller Vorlauf beträgt {reminderDays} Tage.</p></div><Link className="button ghost small" href="/app/settings">Erinnerungen einstellen</Link></section>
      <section className="notification-summary"><article className={urgent ? "urgent" : ""}><span>Überfällig</span><b>{urgent}</b><small>Handlungsbedarf</small></article><article><span>Im Erinnerungszeitraum</span><b>{reminders.length}</b><small>{reminderDays} Tage Vorlauf</small></article><article><span>Einladungen</span><b>{invites.length}</b><small>Offene Bereiche</small></article></section>
      {invites.length > 0 && <section className="panel notification-section"><div className="panel-head"><div><span className="eyebrow">Zusammenarbeit</span><h2>Offene Einladungen</h2></div><span className="count-pill">{invites.length}</span></div><div className="notification-list">{invites.map((invite) => <article className="notification-row invite" key={invite.id}><span className="notification-icon">+</span><div><b>Einladung zu „{invite.workspace_name}“</b><p>Rolle: {invite.role === "ADMIN" ? "Admin" : invite.role === "EDITOR" ? "Bearbeiter" : "Betrachter"}. Öffne den Einladungslink, den dir der Bereichsinhaber geschickt hat.</p></div><Link href="/app/team">Bereiche →</Link></article>)}</div></section>}
      <section className="panel notification-section"><div className="panel-head"><div><span className="eyebrow">Fristen</span><h2>Wartung & Garantie</h2></div><Link className="text-link" href="/app/service">Service-Center öffnen →</Link></div>{reminders.length === 0 ? <div className="notification-empty"><span>✓</span><div><b>Alles im grünen Bereich</b><p>Innerhalb der nächsten {reminderDays} Tage steht aktuell keine hinterlegte Wartung oder Garantiefrist an.</p></div></div> : <div className="notification-list">{reminders.map((item) => <article className={`notification-row ${item.days < 0 ? "danger" : item.days <= 7 ? "warning" : ""}`} key={item.key}><span className="notification-icon">{item.type === "SERVICE" ? "W" : "G"}</span><div><b>{item.type === "SERVICE" ? "Wartung" : "Garantie"}: {item.asset.name}</b><p>{relative(item.days)} · {item.asset.workspace_name || "Persönlich"}</p></div><Link href={`/app/assets/${item.asset.id}`}>Öffnen →</Link></article>)}</div>}</section>
    </div></main>
  );
}
