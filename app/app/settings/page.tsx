import Link from "next/link";
import {
  changePasswordAction,
  deleteAccountAction,
  logoutOtherSessionsAction,
  updateProfileAction,
  updateReminderSettingsAction,
} from "@/app/actions/account";
import { AppHeader } from "@/components/app-header";
import { ConfirmButton } from "@/components/confirm-button";
import { countActiveSessions, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ profileError?: string; profileSuccess?: string; passwordError?: string; passwordSuccess?: string; deleteError?: string; reminderSuccess?: string; sessionsSuccess?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const sessionCount = await countActiveSessions(user.id);

  return (
    <main className="app-page"><div className="container"><AppHeader name={user.name} /><div className="page-back"><Link href="/app">← Meine Pässe</Link></div>
      <section className="settings-head"><span className="eyebrow">Konto & Datenschutz</span><h1>Einstellungen</h1><p>Profil, Erinnerungen, Sicherheit, Datenexport und dein NavoPass-Konto an einem Ort.</p></section>
      <section className="settings-grid">
        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Profil</span><h2>Persönliche Daten</h2></div><span className="settings-icon">NP</span></div>{params.profileError && <p className="form-error">{params.profileError}</p>}{params.profileSuccess && <p className="form-success">{params.profileSuccess}</p>}<form action={updateProfileAction} className="compact-form"><label>Name<input name="name" defaultValue={user.name} required /></label><label>E-Mail-Adresse<input name="email" type="email" defaultValue={user.email} required /></label><button className="button small" type="submit">Profil speichern</button></form></article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Erinnerungen</span><h2>Fristen-Vorlauf</h2></div><span className="settings-icon">!</span></div><p className="muted">NavoPass zeigt Wartungs- und Garantiehinweise innerhalb dieses Zeitraums in der Benachrichtigungszentrale.</p>{params.reminderSuccess && <p className="form-success">{params.reminderSuccess}</p>}<form action={updateReminderSettingsAction} className="compact-form"><label>Erinnern ab<select name="reminderDays" defaultValue={String(user.reminder_days ?? 30)}><option value="7">7 Tage vorher</option><option value="14">14 Tage vorher</option><option value="30">30 Tage vorher</option><option value="60">60 Tage vorher</option><option value="90">90 Tage vorher</option><option value="180">180 Tage vorher</option></select></label><button className="button small" type="submit">Erinnerungen speichern</button></form><Link className="text-link" href="/app/notifications">Benachrichtigungen öffnen →</Link></article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Sicherheit</span><h2>Passwort ändern</h2></div><span className="settings-icon">••</span></div>{params.passwordError && <p className="form-error">{params.passwordError}</p>}{params.passwordSuccess && <p className="form-success">{params.passwordSuccess}</p>}<form action={changePasswordAction} className="compact-form"><label>Aktuelles Passwort<input name="currentPassword" type="password" autoComplete="current-password" required /></label><label>Neues Passwort<input name="newPassword" type="password" minLength={8} autoComplete="new-password" required /></label><label>Neues Passwort wiederholen<input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></label><button className="button small" type="submit">Passwort ändern</button></form></article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Sitzungen</span><h2>Angemeldete Geräte</h2></div><span className="settings-icon">{sessionCount}</span></div><p className="muted">Aktuell sind {sessionCount} aktive NavoPass-Sitzung{sessionCount === 1 ? "" : "en"} gespeichert. Du kannst alle anderen Geräte sofort abmelden.</p>{params.sessionsSuccess && <p className="form-success">{params.sessionsSuccess}</p>}<form action={logoutOtherSessionsAction}><ConfirmButton className="button ghost small" type="submit" message="Alle anderen NavoPass-Sitzungen abmelden?">Andere Geräte abmelden</ConfirmButton></form></article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Zusammenarbeit</span><h2>Haushalte & Teams</h2></div><span className="settings-icon">+</span></div><p className="muted">Verwalte gemeinsame Bereiche, Einladungen und Rollen für Familie, Kollegen oder Mitarbeiter.</p><Link className="button ghost small" href="/app/team">Bereiche verwalten</Link></article>

        <article className="panel settings-panel"><div className="panel-title"><div><span className="eyebrow">Daten</span><h2>Export herunterladen</h2></div><span className="settings-icon">↓</span></div><p className="muted">Lade deine Konto-, Pass-, Historien- und Dokument-Metadaten als JSON-Datei herunter.</p><a className="button ghost small" href="/api/export">Meine Daten exportieren</a></article>

        <article className="panel settings-panel danger-panel"><div className="panel-title"><div><span className="eyebrow danger-text">Gefahrenbereich</span><h2>Konto löschen</h2></div><span className="settings-icon danger">!</span></div><p className="muted">Löscht dein Konto und deine persönlichen Daten dauerhaft. Von dir verwaltete gemeinsame Bereiche mit anderen Mitgliedern müssen vorher aufgeräumt werden.</p>{params.deleteError && <p className="form-error">{params.deleteError}</p>}<form action={deleteAccountAction} className="compact-form"><label>Passwort<input name="password" type="password" autoComplete="current-password" required /></label><label>Zur Bestätigung „LÖSCHEN“ eingeben<input name="confirmation" placeholder="LÖSCHEN" required /></label><ConfirmButton className="danger-button" type="submit" message="Dein NavoPass-Konto wird dauerhaft gelöscht. Wirklich fortfahren?">Konto endgültig löschen</ConfirmButton></form></article>
      </section>
    </div></main>
  );
}
