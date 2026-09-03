import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import styles from "@/app/auth.module.css";
import { getLocale } from "@/lib/i18n";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = "", error } = await searchParams;
  const hasToken = token.length > 20;
  const en = (await getLocale()) === "en";

  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={styles.brand}><Logo /></div><Link className={styles.back} href="/login">← {en ? "Back to sign in" : "Zur Anmeldung"}</Link></header>
      <section className={styles.shell}>
        <aside className={styles.side}><div className={styles.sideInner}><span className={styles.eyebrow}>{en ? "Security link" : "Sicherheitslink"}</span><h2>{en ? "Set a new password." : "Lege ein neues Passwort fest."}</h2><p>{en ? "After the change, all previous NavoPass sessions will end. Then sign in again with your new password." : "Nach erfolgreicher Änderung werden alle bisherigen NavoPass-Sitzungen beendet. Danach meldest du dich mit deinem neuen Passwort erneut an."}</p><div className={styles.benefits}><div className={styles.benefit}><span className={styles.check}>✓</span><span>{en ? "Use at least 8 characters" : "Mindestens 8 Zeichen verwenden"}</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>{en ? "Link can only be used once" : "Link kann nur einmal verwendet werden"}</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>{en ? "Existing passes and documents remain unchanged" : "Bestehende Pässe und Dokumente bleiben unverändert"}</span></div></div></div></aside>
        <div className={styles.formPane}><div className={styles.formBox}><span>{en ? "New password" : "Neues Passwort"}</span><h1>{en ? "Change password" : "Passwort ändern"}</h1>{error && <p className={styles.error}>{error}</p>}{hasToken ? <><p className={styles.intro}>{en ? "Choose a new password for your NavoPass account." : "Wähle jetzt ein neues Passwort für dein NavoPass-Konto."}</p><form action={resetPasswordAction} className={styles.form}><input type="hidden" name="token" value={token} /><input type="hidden" name="locale" value={en ? "en" : "de"}/><label className={styles.label}>{en ? "New password" : "Neues Passwort"}<input name="password" type="password" minLength={8} autoComplete="new-password" required /><small className={styles.hint}>{en ? "At least 8 characters." : "Mindestens 8 Zeichen."}</small></label><label className={styles.label}>{en ? "Repeat password" : "Passwort wiederholen"}<input name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></label><button className={styles.submit} type="submit">{en ? "Save password" : "Passwort speichern"} →</button></form></> : <><p className={styles.error}>{en ? "The reset link is missing or invalid." : "Der Zurücksetzen-Link fehlt oder ist ungültig."}</p><Link className={styles.submitLink} href="/passwort-vergessen">{en ? "Request a new link" : "Neuen Link anfordern"} →</Link></>}<p className={styles.foot}><Link href="/login">{en ? "Back to sign in" : "Zurück zur Anmeldung"}</Link></p></div></div>
      </section>
    </main>
  );
}
