import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import styles from "@/app/auth.module.css";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = "", error } = await searchParams;
  const hasToken = token.length > 20;

  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={styles.brand}><Logo /></div><Link className={styles.back} href="/login">← Zur Anmeldung</Link></header>
      <section className={styles.shell}>
        <aside className={styles.side}><div className={styles.sideInner}><span className={styles.eyebrow}>Sicherheitslink</span><h2>Lege ein neues Passwort fest.</h2><p>Nach erfolgreicher Änderung werden alle bisherigen NavoPass-Sitzungen beendet. Danach meldest du dich mit deinem neuen Passwort erneut an.</p><div className={styles.benefits}><div className={styles.benefit}><span className={styles.check}>✓</span><span>Mindestens 8 Zeichen verwenden</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>Link kann nur einmal verwendet werden</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>Bestehende Pässe und Dokumente bleiben unverändert</span></div></div></div></aside>
        <div className={styles.formPane}><div className={styles.formBox}><span>Neues Passwort</span><h1>Passwort ändern</h1>{error && <p className={styles.error}>{error}</p>}{hasToken ? <><p className={styles.intro}>Wähle jetzt ein neues Passwort für dein NavoPass-Konto.</p><form action={resetPasswordAction} className={styles.form}><input type="hidden" name="token" value={token} /><label className={styles.label}>Neues Passwort<input name="password" type="password" minLength={8} autoComplete="new-password" required /><small className={styles.hint}>Mindestens 8 Zeichen.</small></label><label className={styles.label}>Passwort wiederholen<input name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></label><button className={styles.submit} type="submit">Passwort speichern →</button></form></> : <><p className={styles.error}>Der Zurücksetzen-Link fehlt oder ist ungültig.</p><Link className={styles.submitLink} href="/passwort-vergessen">Neuen Link anfordern →</Link></>}<p className={styles.foot}><Link href="/login">Zurück zur Anmeldung</Link></p></div></div>
      </section>
    </main>
  );
}
