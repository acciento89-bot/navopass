import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale } from "@/lib/i18n";
import styles from "@/app/auth.module.css";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string; next?: string }> }) {
  const { error, success, next = "/app" } = await searchParams;
  const locale = await getLocale();
  const en = locale === "en";
  const tr = (de: string, english: string) => en ? english : de;
  const registerHref = next !== "/app" ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={styles.brand}><Logo label={tr("NavoPass Startseite", "NavoPass home page")} /></div><LanguageSwitcher compact /><Link className={styles.back} href="/">← {tr("Zur Startseite", "Back to home")}</Link></header>
      <section className={styles.shell}>
        <aside className={styles.side}><div className={styles.sideInner}><span className={styles.eyebrow}>{tr("Deine digitalen Pässe", "Your digital passes")}</span><h2>{tr("Alles im Blick. Jederzeit.", "Everything organised. Anytime.")}</h2><p>{tr("Öffne deine Objekt-, Wartungs- und Servicepässe sicher von jedem Gerät aus.", "Access your asset, maintenance and service passes securely from any device.")}</p><div className={styles.benefits}><div className={styles.benefit}><span className={styles.check}>✓</span><span>{tr("Dokumente, Garantien und Historien zentral verwalten", "Manage documents, warranties and histories in one place")}</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>{tr("QR-Codes für Service, Übergabe und Verkauf nutzen", "Use QR codes for service, handovers and resale")}</span></div><div className={styles.benefit}><span className={styles.check}>✓</span><span>{tr("Haushalte und Teams gemeinsam verwalten", "Collaborate with households and teams")}</span></div></div></div></aside>
        <div className={styles.formPane}><div className={styles.formBox}><span>{tr("Willkommen zurück", "Welcome back")}</span><h1>{tr("Anmelden", "Sign in")}</h1><p className={styles.intro}>{tr("Melde dich an und öffne dein NavoPass-Dashboard.", "Sign in to open your NavoPass dashboard.")}</p>{error && <p className={styles.error}>{error}</p>}{success && <p className={styles.success}>{success}</p>}<form action={loginAction} className={styles.form}><input type="hidden" name="next" value={next} /><input type="hidden" name="locale" value={locale} /><label className={styles.label}>{tr("E-Mail-Adresse", "Email address")}<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label><label className={styles.label}>{tr("Passwort", "Password")}<input name="password" type="password" autoComplete="current-password" placeholder={tr("Dein Passwort", "Your password")} required /></label><div className={styles.formHelp}><Link href="/passwort-vergessen">{tr("Passwort vergessen?", "Forgot password?")}</Link></div><button className={styles.submit} type="submit">{tr("Anmelden", "Sign in")} →</button></form><p className={styles.foot}>{tr("Noch kein Konto?", "New to NavoPass?")} <Link href={registerHref}>{tr("Kostenlos registrieren", "Create a free account")}</Link></p><p className={styles.priceHint}><Link href="/preise">{tr("Preise", "Pricing")}</Link> · <Link href="/datenschutz">{tr("Datenschutz", "Privacy")}</Link> · <Link href="/impressum">{tr("Impressum", "Legal notice")}</Link></p><div className={styles.trust}><span>✓ {tr("Sicherer Login", "Secure sign-in")}</span><span>✓ {tr("Datenschutz im Fokus", "Privacy by design")}</span></div></div></div>
      </section>
    </main>
  );
}
