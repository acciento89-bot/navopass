import Link from "next/link";
import {
  changePasswordAction,
  deleteAccountAction,
  logoutOtherSessionsAction,
  updateProfileAction,
  updateReminderSettingsAction,
} from "@/app/actions/account";
import { openBillingPortalAction } from "@/app/actions/billing";
import { AppHeader } from "@/components/app-header";
import { ConfirmButton } from "@/components/confirm-button";
import { requireUser, countActiveSessions } from "@/lib/auth";
import { getBillingState } from "@/lib/billing";
import { formatEuro, formatStorage, getAccountPlanState, getReservedSeatCount } from "@/lib/plans";

export const dynamic = "force-dynamic";

function percent(used: number, max: number | null) {
  if (max === null || max <= 0) return 0;
  return Math.max(0, Math.min(100, (used / max) * 100));
}

function tone(used: number, max: number | null) {
  if (max === null) return "";
  if (max === 0) return used > 0 ? "over" : "";
  if (used > max) return "over";
  if (used >= max || used / max >= 0.8) return "warning";
  return "";
}

function billingStatusLabel(status: string | null) {
  if (status === "active") return "Aktiv";
  if (status === "trialing") return "Testphase";
  if (status === "past_due") return "Zahlung offen";
  if (status === "unpaid") return "Unbezahlt";
  if (status === "paused") return "Pausiert";
  if (status === "canceled") return "Beendet";
  if (status === "incomplete") return "Zahlung noch nicht abgeschlossen";
  if (status === "incomplete_expired") return "Nicht abgeschlossen";
  return status ? status : "Kein Stripe-Abo";
}

function dateLabel(value: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(date);
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ profileError?: string; profileSuccess?: string; passwordError?: string; passwordSuccess?: string; deleteError?: string; reminderSuccess?: string; sessionsSuccess?: string; limit?: string; billingSuccess?: string; billingError?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const [sessionCount, planState, reservedSeats, billing] = await Promise.all([
    countActiveSessions(user.id),
    getAccountPlanState(user.id),
    getReservedSeatCount(user.id),
    getBillingState(user.id),
  ]);
  const { definition, usage } = planState;
  const workspaceLimit = definition.maxSharedWorkspaces;
  const isOverLimit = usage.assets > definition.maxAssets || usage.storageBytes > definition.maxStorageBytes || reservedSeats > definition.maxSeats || (workspaceLimit !== null && usage.sharedWorkspaces > workspaceLimit);
  const periodEnd = dateLabel(billing.subscription_current_period_end);

  return (
    <main className="app-page"><div className="container"><AppHeader name={user.name} /><div className="page-back"><Link href="/app">← Meine Pässe</Link></div>
      <section className="settings-head"><span className="eyebrow">Konto & Datenschutz</span><h1>Einstellungen</h1><p>Tarif, Nutzung, Profil, Erinnerungen, Sicherheit, Datenexport und dein NavoPass-Konto an einem Ort.</p></section>
      {params.limit && <div className="upgrade-banner"><span><b>Tariflimit erreicht.</b> {params.limit}</span><Link href="/preise">Tarife ansehen →</Link></div>}
      {params.billingSuccess && <p className="form-success team-message">Checkout abgeschlossen. Dein Tarif wird automatisch aktiviert, sobald Stripe den bestätigten Abo-Status an NavoPass übermittelt hat.</p>}
      {params.billingError && <p className="form-error team-message">{params.billingError}</p>}
      <section className="settings-grid">
        <article className="panel settings-panel plan-panel">
          <div className="plan-top"><div><span className="eyebrow">Tarif & Nutzung</span><h2>{definition.name}</h2><p>{definition.description}</p><p className="plan-price"><b>{formatEuro(definition.monthlyCents)}</b> / Monat{definition.yearlyCents > 0 ? ` · ${formatEuro(definition.yearlyCents)} / Jahr` : ""}</p></div><span className="plan-badge">Aktueller Tarif</span></div>
          {billing.subscription_status && <div className="limit-note"><b>Stripe-Abo: {billingStatusLabel(billing.subscription_status)}.</b> {billing.subscription_cancel_at_period_end ? ` Das Abo ist zur Kündigung vorgemerkt${periodEnd ? ` und läuft bis ${periodEnd}` : ""}.` : periodEnd ? ` Aktueller Abrechnungszeitraum bis ${periodEnd}.` : ""} {billing.subscription_status === "past_due" ? "Bitte Zahlungsmittel im Abo-Portal prüfen." : ""}</div>}
          <div className="plan-usage-grid">
            <div className="quota-card"><div className="quota-head"><span>Pässe</span><b>{usage.assets} / {definition.maxAssets}</b></div><div className="quota-track"><i className={tone(usage.assets,definition.maxAssets)} style={{width:`${percent(usage.assets,definition.maxAssets)}%`}} /></div><small>Archivierte Pässe zählen mit, werden aber niemals automatisch gelöscht.</small></div>
            <div className="quota-card"><div className="quota-head"><span>Speicher</span><b>{formatStorage(usage.storageBytes)} / {formatStorage(definition.maxStorageBytes)}</b></div><div className="quota-track"><i className={tone(usage.storageBytes,definition.maxStorageBytes)} style={{width:`${percent(usage.storageBytes,definition.maxStorageBytes)}%`}} /></div><small>Gezählt werden lokal hochgeladene Dateien; externe Links verbrauchen keinen Speicher.</small></div>
            <div className="quota-card"><div className="quota-head"><span>Nutzerplätze</span><b>{reservedSeats} / {definition.maxSeats}</b></div><div className="quota-track"><i className={tone(reservedSeats,definition.maxSeats)} style={{width:`${percent(reservedSeats,definition.maxSeats)}%`}} /></div><small>Offene Einladungen reservieren bereits einen Platz.</small></div>
            <div className="quota-card"><div className="quota-head"><span>Gemeinsame Bereiche</span><b>{usage.sharedWorkspaces} / {workspaceLimit === null ? "∞" : workspaceLimit}</b></div><div className="quota-track"><i className={tone(usage.sharedWorkspaces,workspaceLimit)} style={{width:`${workspaceLimit === null ? 12 : percent(usage.sharedWorkspaces,workspaceLimit)}%`}} /></div><small>Persönlicher Bereich zählt nicht gegen dieses Limit.</small></div>
          </div>
          {isOverLimit && <div className="limit-note"><b>Deine vorhandenen Daten bleiben erhalten.</b> Das Konto liegt momentan über mindestens einem Tariflimit. NavoPass sperrt deshalb nur neue Pässe, Uploads, Nutzer oder Bereiche, bis wieder Platz frei ist oder ein größerer Tarif aktiv ist.</div>}
          <div className="plan-actions">{billing.stripe_customer_id ? <form action={openBillingPortalAction}><button className="button small" type="submit">Abo, Rechnungen & Zahlung verwalten</button></form> : <Link className="plan-action-primary" href="/preise">Tarife vergleichen</Link>}<Link className="plan-action-secondary" href="/kontakt">Mehr als Business benötigt? Kontakt aufnehmen →</Link></div>
        </article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Profil</span><h2>Persönliche Daten</h2></div><span className="settings-icon">NP</span></div>{params.profileError && <p className="form-error">{params.profileError}</p>}{params.profileSuccess && <p className="form-success">{params.profileSuccess}</p>}<form action={updateProfileAction} className="compact-form"><label>Name<input name="name" defaultValue={user.name} required /></label><label>E-Mail-Adresse<input name="email" type="email" defaultValue={user.email} required /></label><button className="button small" type="submit">Profil speichern</button></form></article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Erinnerungen</span><h2>Fristen-Vorlauf</h2></div><span className="settings-icon">!</span></div><p className="muted">NavoPass zeigt Wartungs- und Garantiehinweise innerhalb dieses Zeitraums in der Benachrichtigungszentrale.</p>{params.reminderSuccess && <p className="form-success">{params.reminderSuccess}</p>}<form action={updateReminderSettingsAction} className="compact-form"><label>Erinnern ab<select name="reminderDays" defaultValue={String(user.reminder_days ?? 30)}><option value="7">7 Tage vorher</option><option value="14">14 Tage vorher</option><option value="30">30 Tage vorher</option><option value="60">60 Tage vorher</option><option value="90">90 Tage vorher</option><option value="180">180 Tage vorher</option></select></label><button className="button small" type="submit">Erinnerungen speichern</button></form><Link className="text-link" href="/app/notifications">Benachrichtigungen öffnen →</Link></article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Sicherheit</span><h2>Passwort ändern</h2></div><span className="settings-icon">••</span></div>{params.passwordError && <p className="form-error">{params.passwordError}</p>}{params.passwordSuccess && <p className="form-success">{params.passwordSuccess}</p>}<form action={changePasswordAction} className="compact-form"><label>Aktuelles Passwort<input name="currentPassword" type="password" autoComplete="current-password" required /></label><label>Neues Passwort<input name="newPassword" type="password" minLength={8} autoComplete="new-password" required /></label><label>Neues Passwort wiederholen<input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></label><button className="button small" type="submit">Passwort ändern</button></form></article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Sitzungen</span><h2>Angemeldete Geräte</h2></div><span className="settings-icon">{sessionCount}</span></div><p className="muted">Aktuell sind {sessionCount} aktive NavoPass-Sitzung{sessionCount === 1 ? "" : "en"} gespeichert. Du kannst alle anderen Geräte sofort abmelden.</p>{params.sessionsSuccess && <p className="form-success">{params.sessionsSuccess}</p>}<form action={logoutOtherSessionsAction}><ConfirmButton className="button ghost small" type="submit" message="Alle anderen NavoPass-Sitzungen abmelden?">Andere Geräte abmelden</ConfirmButton></form></article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Zusammenarbeit</span><h2>Haushalte & Teams</h2></div><span className="settings-icon">+</span></div><p className="muted">Verwalte gemeinsame Bereiche, Einladungen und Rollen für Familie, Kollegen oder Mitarbeiter.</p><Link className="button ghost small" href="/app/team">Bereiche verwalten</Link></article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Daten</span><h2>Export herunterladen</h2></div><span className="settings-icon">↓</span></div><p className="muted">Lade deine Konto-, Pass-, Historien- und Dokument-Metadaten als JSON-Datei herunter.</p><a className="button ghost small" href="/api/export">Meine Daten exportieren</a></article>

        <article className="panel settings-panel danger-panel"><div className="panel-title"><div><span className="eyebrow danger-text">Gefahrenbereich</span><h2>Konto löschen</h2></div><span className="settings-icon danger">!</span></div><p className="muted">Löscht dein Konto und deine persönlichen Daten dauerhaft. Ein noch laufendes Stripe-Abo wird dabei zuerst beendet, damit nach der Kontolöschung keine weitere NavoPass-Abrechnung erfolgt.</p>{params.deleteError && <p className="form-error">{params.deleteError}</p>}<form action={deleteAccountAction} className="compact-form"><label>Passwort<input name="password" type="password" autoComplete="current-password" required /></label><label>Zur Bestätigung „LÖSCHEN“ eingeben<input name="confirmation" placeholder="LÖSCHEN" required /></label><ConfirmButton className="danger-button" type="submit" message="Dein NavoPass-Konto und ein eventuell noch laufendes NavoPass-Abo werden dauerhaft beendet. Wirklich fortfahren?">Konto endgültig löschen</ConfirmButton></form></article>
      </section>
    </div></main>
  );
}
