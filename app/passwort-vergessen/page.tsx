import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import styles from "@/app/auth.module.css";
import { getLocale } from "@/lib/i18n";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { error, sent } = await searchParams;
  const en = (await getLocale()) === "en";

  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={styles.brand}><Logo /></div><Link className={styles.back} href="/login">← {en ? "Back to sign in" : "Zur Anmeldung"}</Link></header>
      <section className={styles.shell}>
        <aside className={styles.side}><div className={styles.sideInner}><span className={styles.eyebrow}>{en ? "Account access" : "Kontozugang"}</span><h2>{en ? "Get back into NavoPass." : "Zurück in deinen NavoPass."}</h2><p>{en ? "We’ll send you a single-use link so you can securely reset your password without losing your saved passes." : "Wir senden dir einen einmal verwendbaren Link. Damit kannst du dein Passwort sicher neu setzen, ohne deine gespeicherten Pässe zu verlieren."}</p><div className={styles.benefits}><div className={styles.benefit}><span className={styles.check}>✓</span><span>{en ? "Link valid for 60 minutes" : "Link nur 60 Minuten gültig"}</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>{en ? "All existing sessions end after the change" : "Alle bestehenden Sitzungen werden nach der Änderung beendet"}</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>{en ? "We never reveal whether an email is registered" : "Keine Auskunft darüber, ob eine E-Mail registriert ist"}</span></div></div></div></aside>
        <div className={styles.formPane}><div className={styles.formBox}><span>{en ? "Forgot password" : "Passwort vergessen"}</span><h1>{en ? "Restore access" : "Zugang wiederherstellen"}</h1><p className={styles.intro}>{en ? "Enter the email address for your NavoPass account." : "Gib die E-Mail-Adresse deines NavoPass-Kontos ein."}</p>{error && <p className={styles.error}>{error}</p>}{sent ? <><p className={styles.success}>{en ? "If an account exists for this email address, a reset link has been sent." : "Wenn zu dieser E-Mail-Adresse ein Konto existiert, wurde ein Link zum Zurücksetzen versendet."}</p><Link className={styles.submitLink} href="/login">{en ? "Back to sign in" : "Zurück zur Anmeldung"} →</Link></> : <form action={requestPasswordResetAction} className={styles.form}><input type="hidden" name="locale" value={en ? "en" : "de"}/><label className={styles.label}>{en ? "Email address" : "E-Mail-Adresse"}<input name="email" type="email" autoComplete="email" placeholder={en ? "name@example.com" : "name@beispiel.de"} required /></label><button className={styles.submit} type="submit">{en ? "Request link" : "Link anfordern"} →</button></form>}<p className={styles.foot}>{en ? "Remember your password?" : "Du kennst dein Passwort wieder?"} <Link href="/login">{en ? "Sign in" : "Anmelden"}</Link></p><p className={styles.priceHint}><Link href="/kontakt">Support</Link> · <Link href="/datenschutz">{en ? "Privacy" : "Datenschutz"}</Link> · <Link href="/impressum">{en ? "Legal notice" : "Impressum"}</Link></p></div></div>
      </section>
    </main>
  );
}
