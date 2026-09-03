import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n";
import styles from "@/app/public-pages.module.css";

export async function PublicShell({ children }: { children: ReactNode }) {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const en = locale === "en";
  const tr = (de: string, english: string) => en ? english : de;
  const homeHref = user ? "/app" : "/";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Logo href={homeHref} />
          <nav className={styles.nav} aria-label={tr("Öffentliche Navigation", "Public navigation")}>
            <Link href={homeHref}>{tr("Startseite", "Home")}</Link>
            <Link href="/preise">{tr("Preise", "Pricing")}</Link>
            <Link href="/kontakt">{tr("Kontakt", "Contact")}</Link>
            <Link href="/datenschutz">{tr("Datenschutz", "Privacy")}</Link>
          </nav>
          <div className={styles.actions}>
            <div className={styles.contractActions}>
              <Link className={styles.withdrawLink} href="/vertrag-widerrufen">{tr("Vertrag widerrufen", "Withdraw from contract")}</Link>
              <Link className={styles.cancelLink} href="/vertrag-kuendigen">{tr("Verträge hier kündigen", "Cancel subscription")}</Link>
            </div>
            <LanguageSwitcher compact />
            {user ? (
              <>
                <Link className={styles.login} href="/app">{tr("Meine Pässe", "My passes")}</Link>
                <Link className={styles.cta} href="/app/settings">{tr("Mein Konto", "My account")}</Link>
              </>
            ) : (
              <>
                <Link className={styles.login} href="/login">{tr("Anmelden", "Sign in")}</Link>
                <Link className={styles.cta} href="/register">{tr("Kostenlos starten", "Start for free")}</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div><Logo href={homeHref} /><p>{tr("Der digitale Pass für deine Dinge.", "The digital pass for your things.")}</p></div>
          <nav className={styles.footerLinks} aria-label={tr("Rechtliches und Service", "Legal and support")}>
            <Link href="/preise">{tr("Preise", "Pricing")}</Link>
            <Link href="/vertrag-widerrufen">{tr("Vertrag widerrufen", "Withdraw from contract")}</Link>
            <Link href="/vertrag-kuendigen">{tr("Verträge hier kündigen", "Cancel subscription")}</Link>
            <Link href="/kontakt">{tr("Kontakt", "Contact")}</Link>
            <Link href="/datenschutz">{tr("Datenschutz", "Privacy")}</Link>
            <Link href="/impressum">{tr("Impressum", "Legal notice")}</Link>
            <Link href="/nutzungsbedingungen">{tr("Nutzungsbedingungen", "Terms of use")}</Link>
          </nav>
          <div className={styles.copyright}>© 2026 Piotr Kaminski – Kamilunavo · NavoPass</div>
        </div>
      </footer>
    </div>
  );
}
