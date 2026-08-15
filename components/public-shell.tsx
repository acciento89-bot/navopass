import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import styles from "@/app/public-pages.module.css";

export function PublicShell({ children }: { children: ReactNode }) {
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
            <Link className={styles.login} href="/login">Anmelden</Link>
            <Link className={styles.cta} href="/register">Kostenlos starten</Link>
          </div>
        </div>
      </header>
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div><Logo /><p>Der digitale Pass für deine Dinge.</p></div>
          <nav className={styles.footerLinks} aria-label="Rechtliches und Service">
            <Link href="/preise">Preise</Link>
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
