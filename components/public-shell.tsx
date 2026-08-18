import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import styles from "@/app/public-pages.module.css";

export async function PublicShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Logo />
          <nav className={styles.nav} aria-label="Öffentliche Navigation">
            <Link href="/">Startseite</Link>
            <Link href="/preise">Preise</Link>
            <Link href="/kontakt">Kontakt</Link>
            <Link href="/datenschutz">Datenschutz</Link>
          </nav>
          <div className={styles.actions}>
            <div className={styles.contractActions}>
              <Link className={styles.withdrawLink} href="/vertrag-widerrufen">Vertrag widerrufen</Link>
              <Link className={styles.cancelLink} href="/vertrag-kuendigen">Verträge hier kündigen</Link>
            </div>
            {user ? (
              <>
                <Link className={styles.login} href="/app">Meine Pässe</Link>
                <Link className={styles.cta} href="/app/settings">Mein Konto</Link>
              </>
            ) : (
              <>
                <Link className={styles.login} href="/login">Anmelden</Link>
                <Link className={styles.cta} href="/register">Kostenlos starten</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div><Logo /><p>Der digitale Pass für deine Dinge.</p></div>
          <nav className={styles.footerLinks} aria-label="Rechtliches und Service">
            <Link href="/preise">Preise</Link>
            <Link href="/vertrag-widerrufen">Vertrag widerrufen</Link>
            <Link href="/vertrag-kuendigen">Verträge hier kündigen</Link>
            <Link href="/kontakt">Kontakt</Link>
            <Link href="/datenschutz">Datenschutz</Link>
            <Link href="/impressum">Impressum</Link>
            <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>
          </nav>
          <div className={styles.copyright}>© 2026 Piotr Kaminski – Kamilunavo · NavoPass</div>
        </div>
      </footer>
    </div>
  );
}
