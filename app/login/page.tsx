import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import styles from "@/app/auth.module.css";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next = "/app" } = await searchParams;
  const registerHref = next !== "/app" ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={styles.brand}><Logo /></div><Link className={styles.back} href="/">← Zur Startseite</Link></header>
      <section className={styles.shell}>
        <aside className={styles.side}><div className={styles.sideInner}><span className={styles.eyebrow}>Deine digitalen Pässe</span><h2>Alles im Blick. Jederzeit.</h2><p>Öffne deine Objekt-, Wartungs- und Servicepässe sicher von jedem Gerät aus.</p><div className={styles.benefits}><div className={styles.benefit}><span className={styles.check}>✓</span><span>Dokumente, Garantien und Historien zentral verwalten</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>QR-Codes für Service, Übergabe und Verkauf nutzen</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>Haushalte und Teams gemeinsam verwalten</span></div></div></div></aside>
        <div className={styles.formPane}><div className={styles.formBox}><span>Willkommen zurück</span><h1>Anmelden</h1><p className={styles.intro}>Melde dich an und öffne dein NavoPass-Dashboard.</p>{error && <p className={styles.error}>{error}</p>}<form action={loginAction} className={styles.form}><input type="hidden" name="next" value={next} /><label className={styles.label}>E-Mail-Adresse<input name="email" type="email" autoComplete="email" placeholder="name@beispiel.de" required /></label><label className={styles.label}>Passwort<input name="password" type="password" autoComplete="current-password" placeholder="Dein Passwort" required /></label><button className={styles.submit} type="submit">Anmelden →</button></form><p className={styles.foot}>Noch kein Konto? <Link href={registerHref}>Kostenlos registrieren</Link></p><p className={styles.priceHint}><Link href="/preise">Preise</Link> · <Link href="/datenschutz">Datenschutz</Link> · <Link href="/impressum">Impressum</Link></p><div className={styles.trust}><span>✓ Sicherer Login</span><span>✓ Datenschutz im Fokus</span></div></div></div>
      </section>
    </main>
  );
}
