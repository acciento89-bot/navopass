import type { Metadata } from "next";
import Link from "next/link";
import { NavoPassContactForm } from "@/components/navopass-contact-form";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung für NavoPass.",
};

export default function ImprintPage() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Rechtliche Angaben</span>
          <h1>Impressum</h1>
          <p>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG) für den digitalen Dienst NavoPass.</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>Diensteanbieter</h2>
            <p><strong>Piotr Kaminski – Kamilunavo</strong><br />Einzelunternehmen<br />Otto-Braun-Straße 14<br />40595 Düsseldorf<br />Deutschland</p>
          </section>

          <section>
            <h2>Kontakt</h2>
            <p>E-Mail: <a href="mailto:contact@kamilunavo.com">contact@kamilunavo.com</a></p>
            <div className={styles.methods}>
              <div className={styles.method}><span>Direkter Kontakt</span><a href="mailto:contact@kamilunavo.com">contact@kamilunavo.com</a></div>
              <div className={styles.method}><span>Weitere elektronische Kontaktmöglichkeit</span><b>Kontaktformular unten</b></div>
            </div>
            <p>Alternativ kann das folgende Kontaktformular verwendet werden. Es bereitet eine Nachricht an <a href="mailto:support@kamilunavo.com">support@kamilunavo.com</a> vor.</p>
            <NavoPassContactForm />
          </section>

          <section>
            <h2>Register und Identifikationsnummern</h2>
            <p>Es besteht derzeit kein Handelsregistereintrag.</p>
            <p>Wirtschafts-Identifikationsnummer gemäß § 139c AO: <strong>DE464473083-00001</strong></p>
            <p>Eine Umsatzsteuer-Identifikationsnummer nach § 27a UStG wurde derzeit nicht erteilt.</p>
          </section>

          <section>
            <h2>Verbraucherstreitbeilegung</h2>
            <p>Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
            <p>Ein Link zur früheren EU-Plattform für Online-Streitbeilegung wird nicht mehr bereitgestellt, da diese Plattform eingestellt und die zugrunde liegende EU-Verordnung aufgehoben wurde.</p>
          </section>

          <section>
            <h2>Inhalte und Urheberrecht</h2>
            <p>Texte, Designs, Grafiken, Logos, Produktnamen und sonstige Inhalte von NavoPass sind nach den anwendbaren Vorschriften geschützt. Eine Nutzung über gesetzliche Schranken hinaus bedarf der vorherigen Zustimmung des jeweiligen Rechteinhabers.</p>
          </section>

          <nav className={styles.legalLinks} aria-label="Weitere rechtliche Informationen">
            <Link href="/datenschutz">Datenschutz</Link>
            <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>
            <Link href="/preise">Preise</Link>
            <Link href="/kontakt">Kontakt</Link>
          </nav>
          <p className={styles.meta}>Stand: 29. August 2026</p>
        </article>
      </main>
    </PublicShell>
  );
}
