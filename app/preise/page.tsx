import type { Metadata } from "next";
import Link from "next/link";
import { createCheckoutAction } from "@/app/actions/billing";
import { PublicShell } from "@/components/public-shell";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_CONFIG, formatEuro, formatStorage, type Plan } from "@/lib/plan-config";
import { isStripeCheckoutConfigured } from "@/lib/stripe";
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
    `${item.maxSeats} Nutzer`,
    shared,
    "QR-Code & Freigabelinks",
    "Wartungen, Historie & Kalenderexport",
  ];
}

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ billingError?: string; billingCancelled?: string }> }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Preise & Limits</span>
          <h1>Einfach starten. Mitwachsen, wenn du mehr brauchst.</h1>
          <p>Grundfunktionen bleiben in jedem Tarif erhalten. Bezahlt wird für mehr Pässe, Speicher und Zusammenarbeit – nicht dafür, grundlegende Funktionen künstlich freizuschalten.</p>
        </section>

        {params.billingError && <div className={styles.billingError}><b>Buchung nicht gestartet.</b> {params.billingError}</div>}
        {params.billingCancelled && <div className={styles.billingNotice}>Checkout abgebrochen. Dein bisheriger Tarif wurde nicht verändert.</div>}

        <section className={styles.pricingGrid} aria-label="NavoPass Tarife">
          {order.map((plan) => {
            const item = PLAN_CONFIG[plan];
            const monthly = formatEuro(item.monthlyCents);
            const yearly = formatEuro(item.yearlyCents);
            const savings = Math.max(0, item.monthlyCents * 12 - item.yearlyCents);
            const featured = plan === "FAMILY";
            const current = user?.plan === plan;
            const monthlyReady = plan !== "FREE" && isStripeCheckoutConfigured(plan, "monthly");
            const yearlyReady = plan !== "FREE" && isStripeCheckoutConfigured(plan, "yearly");

            return (
              <article className={`${styles.priceCard} ${featured ? styles.featured : ""}`} key={plan}>
                <span className={styles.badge}>{current ? "Aktueller Tarif" : plan === "FREE" ? "Kostenlos" : featured ? "Empfohlen" : plan === "BUSINESS" ? "Für Teams" : "Privat"}</span>
                <h2>{item.name}</h2>
                <div className={styles.price}><strong>{monthly}</strong><small>/ Monat</small></div>
                {item.yearlyCents > 0 ? <p className={styles.annual}>{yearly} / Jahr · spart {formatEuro(savings)}</p> : <p className={styles.annual}>Dauerhaft ohne Grundgebühr</p>}
                <p>{item.description}</p>
                <ul className={styles.features}>{features(plan).map((feature) => <li key={feature}>{feature}</li>)}</ul>

                {plan === "FREE" ? (
                  <Link className={styles.priceAction} href={user ? "/app" : "/register"}>{user ? "Zum Dashboard" : "Kostenlos starten"}</Link>
                ) : !user ? (
                  <div className={styles.billingActions}>
                    <Link className={styles.priceAction} href="/login?next=%2Fpreise">Anmelden & buchen</Link>
                    <small>Monatlich oder jährlich nach der Anmeldung auswählen.</small>
                  </div>
                ) : (
                  <div className={styles.billingActions}>
                    {monthlyReady ? <form action={createCheckoutAction}><input type="hidden" name="plan" value={plan} /><input type="hidden" name="interval" value="monthly" /><button className={styles.priceAction} type="submit">{current ? "Abo verwalten" : `Monatlich · ${monthly}`}</button></form> : <span className={`${styles.priceAction} ${styles.muted}`}>Monatlich noch nicht konfiguriert</span>}
                    {yearlyReady ? <form action={createCheckoutAction}><input type="hidden" name="plan" value={plan} /><input type="hidden" name="interval" value="yearly" /><button className={`${styles.priceAction} ${styles.yearlyAction}`} type="submit">{current ? "Tarif im Portal ändern" : `Jährlich · ${yearly}`}</button></form> : <span className={`${styles.priceAction} ${styles.muted}`}>Jährlich noch nicht konfiguriert</span>}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <div className={styles.notice}><strong>Abos:</strong> Kostenpflichtige Tarife werden sicher über Stripe gebucht. Tarifstatus und Zugriffsrechte werden serverseitig aus dem Stripe-Abonnement übernommen. Kündigung, Rechnungen und Zahlungsmittel kannst du anschließend über das Stripe-Kundenportal verwalten.</div>
        <div className="business-contact">Mehr als 1.000 Pässe oder 10 Nutzer benötigt? <Link href="/kontakt">Individuelles Angebot anfragen →</Link></div>
      </main>
    </PublicShell>
  );
}
