import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import styles from "@/app/auth.module.css";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { error, sent } = await searchParams;

  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={styles.brand}><Logo /></div><Link className={styles.back} href="/login">← Zur Anmeldung</Link></header>
      <section className={styles.shell}>
        <aside className={styles.side}><div className={styles.sideInner}><span className={styles.eyebrow}>Kontozugang</span><h2>Zurück in deinen NavoPass.</h2><p>Wir senden dir einen einmal verwendbaren Link. Damit kannst du dein Passwort sicher neu setzen, ohne deine gespeicherten Pässe zu verlieren.</p><div className={styles.benefits}><div className={styles.benefit}><span className={styles.check}>✓</span><span>Link nur 60 Minuten gültig</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>Alle bestehenden Sitzungen werden nach der Änderung beendet</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>Keine Auskunft darüber, ob eine E-Mail registriert ist</span></div></div></div></aside>
        <div className={styles.formPane}><div className={styles.formBox}><span>Passwort vergessen</span><h1>Zugang wiederherstellen</h1><p className={styles.intro}>Gib die E-Mail-Adresse deines NavoPass-Kontos ein.</p>{error && <p className={styles.error}>{error}</p>}{sent ? <><p className={styles.success}>Wenn zu dieser E-Mail-Adresse ein Konto existiert, wurde ein Link zum Zurücksetzen versendet.</p><Link className={styles.submitLink} href="/login">Zurück zur Anmeldung →</Link></> : <form action={requestPasswordResetAction} className={styles.form}><label className={styles.label}>E-Mail-Adresse<input name="email" type="email" autoComplete="email" placeholder="name@beispiel.de" required /></label><button className={styles.submit} type="submit">Link anfordern →</button></form>}<p className={styles.foot}>Du kennst dein Passwort wieder? <Link href="/login">Anmelden</Link></p><p className={styles.priceHint}><Link href="/kontakt">Support</Link> · <Link href="/datenschutz">Datenschutz</Link> · <Link href="/impressum">Impressum</Link></p></div></div>
      </section>
    </main>
  );
}
