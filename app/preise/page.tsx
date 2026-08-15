import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { PLAN_CONFIG, formatEuro, formatStorage, type Plan } from "@/lib/plans";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Preise",
  description: "NavoPass Preise für Free, Plus, Family und Business.",
};

const order: Plan[] = ["FREE", "PLUS", "FAMILY", "BUSINESS"];

function features(plan: Plan) {
  const item = PLAN_CONFIG[plan];
  const shared = item.maxSharedWorkspaces === null ? "Unbegrenzt gemeinsame Bereiche" : item.maxSharedWorkspaces > 0 ? `${item.maxSharedWorkspaces} gemeinsame Bereiche` : "Persönlicher Bereich";
  return [
    `${item.maxAssets.toLocaleString("de-DE")} Pässe`,
    `${formatStorage(item.maxStorageBytes)} Speicher`,
    `${item.maxSeats} ${item.maxSeats === 1 ? "Nutzer" : "Nutzer"}`,
    shared,
    "QR-Code & Freigabelinks",
    "Wartungen, Historie & Kalenderexport",
  ];
}

export default function PricingPage() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Preise & Limits</span>
          <h1>Einfach starten. Mitwachsen, wenn du mehr brauchst.</h1>
          <p>Grundfunktionen bleiben in jedem Tarif erhalten. Bezahlt wird für mehr Pässe, Speicher und Zusammenarbeit – nicht dafür, grundlegende Funktionen künstlich freizuschalten.</p>
        </section>

        <section className={styles.pricingGrid} aria-label="NavoPass Tarife">
          {order.map((plan) => {
            const item = PLAN_CONFIG[plan];
            const monthly = formatEuro(item.monthlyCents);
            const yearly = formatEuro(item.yearlyCents);
            const savings = Math.max(0, item.monthlyCents * 12 - item.yearlyCents);
            const featured = plan === "FAMILY";
            return (
              <article className={`${styles.priceCard} ${featured ? styles.featured : ""}`} key={plan}>
                <span className={styles.badge}>{plan === "FREE" ? "Kostenlos" : featured ? "Empfohlen" : plan === "BUSINESS" ? "Für Teams" : "Privat"}</span>
                <h2>{item.name}</h2>
                <div className={styles.price}><strong>{monthly}</strong><small>/ Monat</small></div>
                {item.yearlyCents > 0 ? <p className={styles.annual}>{yearly} / Jahr · spart {formatEuro(savings)}</p> : <p className={styles.annual}>Dauerhaft ohne Grundgebühr</p>}
                <p>{item.description}</p>
                <ul className={styles.features}>{features(plan).map((feature) => <li key={feature}>{feature}</li>)}</ul>
                {plan === "FREE" ? <Link className={styles.priceAction} href="/register">Kostenlos starten</Link> : <span className={`${styles.priceAction} ${styles.muted}`}>Buchung folgt mit Zahlungsanbindung</span>}
              </article>
            );
          })}
        </section>

        <div className={styles.notice}><strong>Wichtig:</strong> Die Tarife und technischen Limits sind bereits festgelegt. Die kostenpflichtige Buchung wird separat angebunden. Bis ein Checkout aktiv ist, entsteht durch das reine Anzeigen eines Tarifs keine Zahlungspflicht. Ein Tarifwechsel in ein kostenpflichtiges Paket erfolgt niemals automatisch.</div>
        <div className="business-contact">Mehr als 1.000 Pässe oder 10 Nutzer benötigt? <Link href="/kontakt">Individuelles Angebot anfragen →</Link></div>
      </main>
    </PublicShell>
  );
}
