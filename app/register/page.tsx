import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import styles from "@/app/auth.module.css";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next = "/app" } = await searchParams;
  const loginHref = next !== "/app" ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={styles.brand}><Logo /></div><Link className={styles.back} href="/">← Zur Startseite</Link></header>
      <section className={styles.shell}>
        <aside className={styles.side}><div className={styles.sideInner}><span className={styles.eyebrow}>In wenigen Sekunden startklar</span><h2>Dein erster digitaler Pass wartet.</h2><p>Lege dein Konto an und verwalte Geräte, Fahrzeuge, Werkzeuge und vieles mehr an einem Ort.</p><div className={styles.benefits}><div className={styles.benefit}><span className={styles.check}>✓</span><span>Aktuell 0 € – kein Zahlungsmittel erforderlich</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>Dokumente, Wartungen und Garantien übersichtlich sammeln</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>Auf Wunsch mit Haushalt oder Team zusammenarbeiten</span></div></div></div></aside>
        <div className={styles.formPane}><div className={styles.formBox}><span>Dein NavoPass</span><h1>Konto erstellen</h1><p className={styles.intro}>Einmal registrieren und danach deine digitalen Objektpässe zentral verwalten.</p>{error && <p className={styles.error}>{error}</p>}<form action={registerAction} className={styles.form}><input type="hidden" name="next" value={next} /><label className={styles.label}>Name<input name="name" autoComplete="name" placeholder="Dein Name" required /></label><label className={styles.label}>E-Mail-Adresse<input name="email" type="email" autoComplete="email" placeholder="name@beispiel.de" required /></label><label className={styles.label}>Passwort<input name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Mindestens 8 Zeichen" required /><small className={styles.hint}>Mindestens 8 Zeichen.</small></label><label className={styles.legalCheck}><input name="legalAccepted" type="checkbox" required /><span>Ich akzeptiere die <Link href="/nutzungsbedingungen" target="_blank">Nutzungsbedingungen</Link> und habe die <Link href="/datenschutz" target="_blank">Datenschutzerklärung</Link> zur Kenntnis genommen.</span></label><button className={styles.submit} type="submit">Kostenlos registrieren →</button></form><p className={styles.priceHint}>Aktuelle Konditionen: <Link href="/preise">Preise ansehen</Link></p><p className={styles.foot}>Schon registriert? <Link href={loginHref}>Jetzt anmelden</Link></p><div className={styles.trust}><span>✓ Datenschutz im Fokus</span><span>✓ Kein automatisches Bezahlabo</span></div></div></div>
      </section>
    </main>
  );
}
