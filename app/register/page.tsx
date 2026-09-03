import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale } from "@/lib/i18n";
import styles from "@/app/auth.module.css";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next = "/app" } = await searchParams;
  const locale = await getLocale();
  const en = locale === "en";
  const tr = (de: string, english: string) => en ? english : de;
  const loginHref = next !== "/app" ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={styles.brand}><Logo label={tr("NavoPass Startseite", "NavoPass home page")} /></div><LanguageSwitcher compact /><Link className={styles.back} href="/">← {tr("Zur Startseite", "Back to home")}</Link></header>
      <section className={styles.shell}>
        <aside className={styles.side}><div className={styles.sideInner}><span className={styles.eyebrow}>{tr("In wenigen Sekunden startklar", "Ready in seconds")}</span><h2>{tr("Dein erster digitaler Pass wartet.", "Your first digital pass is waiting.")}</h2><p>{tr("Lege dein Konto an und verwalte Geräte, Fahrzeuge, Werkzeuge und vieles mehr an einem Ort.", "Create your account and manage equipment, vehicles, tools and much more in one place.")}</p><div className={styles.benefits}><div className={styles.benefit}><span className={styles.check}>✓</span><span>{tr("Aktuell 0 € – kein Zahlungsmittel erforderlich", "Currently €0 – no payment method required")}</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>{tr("Dokumente, Wartungen und Garantien übersichtlich sammeln", "Keep documents, maintenance and warranties organised")}</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>{tr("Auf Wunsch mit Haushalt oder Team zusammenarbeiten", "Collaborate with your household or team when needed")}</span></div></div></div></aside>
        <div className={styles.formPane}><div className={styles.formBox}><span>{tr("Dein NavoPass", "Your NavoPass")}</span><h1>{tr("Konto erstellen", "Create account")}</h1><p className={styles.intro}>{tr("Einmal registrieren und danach deine digitalen Objektpässe zentral verwalten.", "Register once, then manage all your digital asset passes in one place.")}</p>{error && <p className={styles.error}>{error}</p>}<form action={registerAction} className={styles.form}><input type="hidden" name="next" value={next} /><input type="hidden" name="locale" value={locale} /><label className={styles.label}>{tr("Name", "Name")}<input name="name" autoComplete="name" placeholder={tr("Dein Name", "Your name")} required /></label><label className={styles.label}>{tr("E-Mail-Adresse", "Email address")}<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label><label className={styles.label}>{tr("Passwort", "Password")}<input name="password" type="password" minLength={8} autoComplete="new-password" placeholder={tr("Mindestens 8 Zeichen", "At least 8 characters")} required /><small className={styles.hint}>{tr("Mindestens 8 Zeichen.", "At least 8 characters.")}</small></label><label className={styles.legalCheck}><input name="legalAccepted" type="checkbox" required /><span>{tr("Ich akzeptiere die", "I accept the")} <Link href="/nutzungsbedingungen" target="_blank">{tr("Nutzungsbedingungen", "Terms of use")}</Link> {tr("und habe die", "and acknowledge the")} <Link href="/datenschutz" target="_blank">{tr("Datenschutzerklärung", "Privacy policy")}</Link>.</span></label><button className={styles.submit} type="submit">{tr("Kostenlos registrieren", "Create free account")} →</button></form><p className={styles.priceHint}>{tr("Aktuelle Konditionen:", "Current plans:")} <Link href="/preise">{tr("Preise ansehen", "View pricing")}</Link></p><p className={styles.foot}>{tr("Schon registriert?", "Already registered?")} <Link href={loginHref}>{tr("Jetzt anmelden", "Sign in")}</Link></p><div className={styles.trust}><span>✓ {tr("Datenschutz im Fokus", "Privacy by design")}</span><span>✓ {tr("Kein automatisches Bezahlabo", "No automatic paid subscription")}</span></div></div></div>
      </section>
    </main>
  );
}
