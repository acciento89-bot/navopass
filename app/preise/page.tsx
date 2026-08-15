import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Preise",
  description: "Aktuelle Preise und geplante Tarife von NavoPass.",
};

const currentFeatures = [
  "Digitale Objektpässe anlegen und verwalten",
  "Fotos und PDF-Dokumente direkt am Pass speichern",
  "Wartungen, Reparaturen und Garantiefristen dokumentieren",
  "QR-Code und Freigabelink für ausgewählte Passdaten",
  "Kalenderexport für Wartungs- und Garantiefristen",
  "Persönliche, Haushalts- und Team-Bereiche mit Rollen",
];

export default function PricingPage() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Preise</span>
          <h1>Jetzt kostenlos starten.</h1>
          <p>NavoPass befindet sich in der Startphase. Die aktuelle Nutzung kostet 0 € und erfordert kein Zahlungsmittel. Ein späterer kostenpflichtiger Tarif beginnt niemals automatisch ohne deine ausdrückliche Bestellung.</p>
        </section>

        <section className={styles.pricingGrid} aria-label="NavoPass Tarife">
          <article className={`${styles.priceCard} ${styles.featured}`}>
            <span className={styles.badge}>Aktuell verfügbar</span>
            <h2>Startphase</h2>
            <div className={styles.price}><strong>0 €</strong><small>/ Monat</small></div>
            <p>Für private Nutzer, Haushalte und Teams während der aktuellen Einführungsphase.</p>
            <ul className={styles.features}>{currentFeatures.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <Link className={styles.priceAction} href="/register">Kostenlos registrieren</Link>
          </article>

          <article className={styles.priceCard}>
            <span className={styles.badge}>Geplant</span>
            <h2>Pro</h2>
            <div className={styles.price}><strong>—</strong><small>Preis noch nicht festgelegt</small></div>
            <p>Ein späterer Pro-Tarif kann zusätzliche Komfort- und Verwaltungsfunktionen erhalten.</p>
            <ul className={styles.features}><li>Preis wird vor Einführung veröffentlicht</li><li>Leistungsumfang wird transparent ausgewiesen</li><li>Kein automatischer Wechsel aus der Startphase</li></ul>
            <span className={`${styles.priceAction} ${styles.muted}`}>Noch nicht buchbar</span>
          </article>

          <article className={styles.priceCard}>
            <span className={styles.badge}>Geplant</span>
            <h2>Business</h2>
            <div className={styles.price}><strong>—</strong><small>Preis noch nicht festgelegt</small></div>
            <p>Für Unternehmen mit weitergehenden Anforderungen an Teams, Verwaltung und Betriebsmittel.</p>
            <ul className={styles.features}><li>Separate Business-Funktionen erst nach Veröffentlichung</li><li>Klare Preis- und Laufzeitangaben vor Bestellung</li><li>Keine kostenpflichtige Aktivierung ohne Zustimmung</li></ul>
            <span className={`${styles.priceAction} ${styles.muted}`}>Noch nicht buchbar</span>
          </article>
        </section>

        <div className={styles.notice}><strong>Wichtig:</strong> Aktuell entstehen durch Registrierung und Nutzung von NavoPass keine Entgelte. Sollte Kamilunavo später kostenpflichtige Tarife anbieten, werden Preis, Leistungsumfang, Laufzeit, Kündigungsbedingungen und gegebenenfalls Widerrufsinformationen vor einer kostenpflichtigen Bestellung angezeigt.</div>
      </main>
    </PublicShell>
  );
}
