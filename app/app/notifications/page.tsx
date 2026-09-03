import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { listAssets } from "@/lib/assets";
import { dateOnly, daysUntil } from "@/lib/date";
import { listPendingInvitesForEmail } from "@/lib/workspaces";
import { getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function relative(days: number, en: boolean) {
  if (days < 0) return en ? `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue` : `${Math.abs(days)} ${Math.abs(days) === 1 ? "Tag" : "Tage"} überfällig`;
  if (days === 0) return en ? "due today" : "heute fällig";
  if (days === 1) return en ? "due tomorrow" : "morgen fällig";
  return en ? `in ${days} days` : `in ${days} Tagen`;
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const en = (await getLocale()) === "en";
  const reminderDays = user.reminder_days ?? 30;
  const assets = (await listAssets(user.id)).filter((asset) => !asset.archived_at);
  const invites = await listPendingInvitesForEmail(user.email);
  const reminders = assets.flatMap((asset) => {
    const result: { key: string; type: "SERVICE" | "WARRANTY"; days: number; date: string; asset: typeof asset }[] = [];
    const serviceDate = dateOnly(asset.next_service_date);
    const serviceDays = daysUntil(asset.next_service_date);
    if (serviceDate && serviceDays !== null && serviceDays <= reminderDays) {
      result.push({ key: `${asset.id}-service`, type: "SERVICE", days: serviceDays, date: serviceDate, asset });
    }
    const warrantyDate = dateOnly(asset.warranty_until);
    const warrantyDays = daysUntil(asset.warranty_until);
    if (warrantyDate && warrantyDays !== null && warrantyDays <= reminderDays) {
      result.push({ key: `${asset.id}-warranty`, type: "WARRANTY", days: warrantyDays, date: warrantyDate, asset });
    }
    return result;
  }).sort((a, b) => a.days - b.days);
  const urgent = reminders.filter((item) => item.days < 0).length;

  return (
    <main className="app-page"><div className="container"><AppHeader name={user.name} />
      <section className="notifications-head"><div><span className="eyebrow">{en ? "NavoPass reminds you" : "NavoPass erinnert dich"}</span><h1>{en ? "Notifications" : "Benachrichtigungen"}</h1><p>{en ? `Maintenance, warranty deadlines, and pending invitations in one place. Your current reminder window is ${reminderDays} days.` : `Wartungen, Garantiefristen und offene Einladungen an einem Ort. Dein aktueller Vorlauf beträgt ${reminderDays} Tage.`}</p></div><Link className="button ghost small" href="/app/settings">{en ? "Reminder settings" : "Erinnerungen einstellen"}</Link></section>
      <section className="notification-summary"><article className={urgent ? "urgent" : ""}><span>{en ? "Overdue" : "Überfällig"}</span><b>{urgent}</b><small>{en ? "Action required" : "Handlungsbedarf"}</small></article><article><span>{en ? "Within reminder window" : "Im Erinnerungszeitraum"}</span><b>{reminders.length}</b><small>{reminderDays} {en ? "days ahead" : "Tage Vorlauf"}</small></article><article><span>{en ? "Invitations" : "Einladungen"}</span><b>{invites.length}</b><small>{en ? "Pending workspaces" : "Offene Bereiche"}</small></article></section>
      {invites.length > 0 && <section className="panel notification-section"><div className="panel-head"><div><span className="eyebrow">{en ? "Collaboration" : "Zusammenarbeit"}</span><h2>{en ? "Pending invitations" : "Offene Einladungen"}</h2></div><span className="count-pill">{invites.length}</span></div><div className="notification-list">{invites.map((invite) => <article className="notification-row invite" key={invite.id}><span className="notification-icon">+</span><div><b>{en ? `Invitation to “${invite.workspace_name}”` : `Einladung zu „${invite.workspace_name}“`}</b><p>{en ? "Role" : "Rolle"}: {invite.role === "ADMIN" ? "Admin" : invite.role === "EDITOR" ? (en ? "Editor" : "Bearbeiter") : (en ? "Viewer" : "Betrachter")}. {en ? "Open the invitation link sent by the workspace owner." : "Öffne den Einladungslink, den dir der Bereichsinhaber geschickt hat."}</p></div><Link href="/app/team">{en ? "Workspaces" : "Bereiche"} →</Link></article>)}</div></section>}
      <section className="panel notification-section"><div className="panel-head"><div><span className="eyebrow">{en ? "Deadlines" : "Fristen"}</span><h2>{en ? "Maintenance & warranty" : "Wartung & Garantie"}</h2></div><Link className="text-link" href="/app/service">{en ? "Open service center" : "Service-Center öffnen"} →</Link></div>{reminders.length === 0 ? <div className="notification-empty"><span>✓</span><div><b>{en ? "Everything is on track" : "Alles im grünen Bereich"}</b><p>{en ? `No recorded maintenance or warranty deadline is due within the next ${reminderDays} days.` : `Innerhalb der nächsten ${reminderDays} Tage steht aktuell keine hinterlegte Wartung oder Garantiefrist an.`}</p></div></div> : <div className="notification-list">{reminders.map((item) => <article className={`notification-row ${item.days < 0 ? "danger" : item.days <= 7 ? "warning" : ""}`} key={item.key}><span className="notification-icon">{item.type === "SERVICE" ? "M" : "W"}</span><div><b>{item.type === "SERVICE" ? (en ? "Maintenance" : "Wartung") : (en ? "Warranty" : "Garantie")}: {item.asset.name}</b><p>{relative(item.days, en)} · {item.asset.workspace_name || (en ? "Personal" : "Persönlich")}</p></div><Link href={`/app/assets/${item.asset.id}`}>{en ? "Open" : "Öffnen"} →</Link></article>)}</div>}</section>
    </div></main>
  );
}
