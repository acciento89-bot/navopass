import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { getCurrentUser } from "@/lib/auth";
import { getBillingState, shouldOpenPortal } from "@/lib/billing";
import { KLEINUNTERNEHMER_NOTICE } from "@/lib/legal";
import { PLAN_CONFIG, formatEuro, formatStorage, type Plan } from "@/lib/plan-config";
import { isStripeCheckoutConfigured } from "@/lib/stripe";
import { getLocale, type Locale } from "@/lib/i18n";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Preise",
  description: "NavoPass Preise für Free, Plus, Family und Business – vom digitalen Objektpass bis zur Einsatzplanung für Unternehmen.",
};

const order: Plan[] = ["FREE", "PLUS", "FAMILY", "BUSINESS"];

function features(plan: Plan, locale: Locale) {
  const en = locale === "en";
  const item = PLAN_CONFIG[plan];
  const shared = item.maxSharedWorkspaces === null ? (en ? "Unlimited shared workspaces" : "Unbegrenzt gemeinsame Bereiche") : item.maxSharedWorkspaces > 0 ? `${item.maxSharedWorkspaces} ${en ? "shared workspaces" : "gemeinsame Bereiche"}` : (en ? "Personal workspace" : "Persönlicher Bereich");
  const base = [
    `${item.maxAssets.toLocaleString(en ? "en-GB" : "de-DE")} ${en ? "passes" : "Pässe"}`,
    `${formatStorage(item.maxStorageBytes)} ${en ? "storage" : "Speicher"}`,
    `${item.maxSeats} ${en ? (item.maxSeats === 1 ? "user" : "users") : "Nutzer"}`,
    shared,
    en ? "QR codes & sharing links" : "QR-Code & Freigabelinks",
    en ? "History, deadlines & calendar export" : "Historie, Fristen & Kalenderexport",
  ];
  if (plan === "BUSINESS") {
    base.push(
      ...(en ? ["Organise customers, locations & assets", "Jobs, priorities & staff assignments", "Weekly planning with durations & conflict prevention", "Work, service and inspection reports with materials, readings & confirmation", "Printable PDF view & protected customer sharing"] : ["Kunden, Standorte & Objekte organisieren", "Einsätze, Prioritäten & Mitarbeiterzuweisung", "Wochenplanung mit Einsatzdauer & Konfliktschutz", "Arbeits-, Service- und Prüfberichte mit Material, Messwerten & Bestätigung", "PDF-Druckansicht & geschützte Kundenfreigabe"]),
    );
  }
  return base;
}

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ billingError?: string; billingCancelled?: string }> }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const locale = await getLocale();
  const en = locale === "en";
  const tr = (de: string, english: string) => en ? english : de;
  const billing = user ? await getBillingState(user.id) : null;
  const hasManagedSubscription = Boolean(billing && shouldOpenPortal(billing));

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>{tr("Preise & Limits", "Pricing & limits")}</span>
          <h1>{tr("Vom ersten Objektpass bis zum digitalen Einsatzprozess.", "From your first asset pass to a complete digital service workflow.")}</h1>
          <p>{tr("Free, Plus und Family wachsen mit deinen privaten Dingen und gemeinsamen Bereichen. Business ist branchenneutral für Unternehmen und Teams gedacht, die Kunden, Standorte, Geräte, Fahrzeuge oder Anlagen sowie Einsätze und Berichte in einem Ablauf organisieren.", "Free, Plus and Family grow with your personal items and shared workspaces. Business is built for companies and teams across industries that manage customers, locations, equipment, vehicles or systems alongside jobs and reports in one workflow.")}</p>
        </section>

        {params.billingError && <div className={styles.billingError}><b>{tr("Buchung nicht gestartet.", "Checkout could not be started.")}</b> {params.billingError}</div>}
        {params.billingCancelled && <div className={styles.billingNotice}>{tr("Checkout abgebrochen. Dein bisheriger Tarif wurde nicht verändert.", "Checkout cancelled. Your current plan has not changed.")}</div>}

        <section className={styles.pricingGrid} aria-label={tr("NavoPass Tarife", "NavoPass plans")}>
          {order.map((plan) => {
            const item = PLAN_CONFIG[plan];
            const monthly = formatEuro(item.monthlyCents);
            const yearly = formatEuro(item.yearlyCents);
            const savings = Math.max(0, item.monthlyCents * 12 - item.yearlyCents);
            const featured = plan === "BUSINESS";
            const current = user?.plan === plan;
            const monthlyReady = plan !== "FREE" && isStripeCheckoutConfigured(plan, "monthly");
            const yearlyReady = plan !== "FREE" && isStripeCheckoutConfigured(plan, "yearly");

            return (
              <article className={`${styles.priceCard} ${featured ? styles.featured : ""}`} key={plan}>
                <span className={styles.badge}>{current ? tr("Aktueller Tarif", "Current plan") : plan === "FREE" ? tr("Kostenlos", "Free") : plan === "BUSINESS" ? "Business & Teams" : plan === "FAMILY" ? tr("Familie", "Family") : tr("Privat", "Personal")}</span>
                <h2>{item.name}</h2>
                <div className={styles.price}><strong>{monthly}</strong><small>/ {tr("Monat", "month")}</small></div>
                {item.yearlyCents > 0 ? <p className={styles.annual}>{yearly} / {tr("Jahr", "year")} · {tr("spart", "save")} {formatEuro(savings)}</p> : <p className={styles.annual}>{tr("Dauerhaft ohne Grundgebühr", "No recurring fee")}</p>}
                <p>{en ? ({ FREE:"Get started with your most important personal items.", PLUS:"For individuals with many devices, vehicles and documents.", FAMILY:"For families and households that manage items together.", BUSINESS:"For businesses and teams managing customers, assets, job schedules, staff assignments and traceable work, service or inspection reports." } as Record<Plan,string>)[plan] : item.description}</p>
                <ul className={styles.features}>{features(plan, locale).map((feature) => <li key={feature}>{feature}</li>)}</ul>

                {plan === "FREE" ? (
                  <Link className={styles.priceAction} href={user ? "/app" : "/register"}>{user ? tr("Zum Dashboard", "Open dashboard") : tr("Kostenlos starten", "Start for free")}</Link>
                ) : !user ? (
                  <div className={styles.billingActions}>
                    <Link className={styles.priceAction} href="/login?next=%2Fpreise">{tr("Anmelden & buchen", "Sign in & subscribe")}</Link>
                    <small>{tr("Monatlich oder jährlich nach der Anmeldung auswählen.", "Choose monthly or yearly billing after signing in.")}</small>
                  </div>
                ) : hasManagedSubscription ? (
                  <div className={styles.billingActions}>
                    <Link className={styles.priceAction} href="/app/settings">{tr("Abo & Tarif verwalten", "Manage subscription & plan")}</Link>
                    <small>{tr("Ein bestehendes Abo wird nicht durch ein zweites paralleles Checkout ersetzt.", "An existing subscription cannot be replaced by a second parallel checkout.")}</small>
                  </div>
                ) : (
                  <div className={styles.billingActions}>
                    {monthlyReady ? <Link className={styles.priceAction} href={`/app/billing/checkout?plan=${plan}&interval=monthly`}>{tr("Monatlich", "Monthly")} · {monthly}</Link> : <span className={`${styles.priceAction} ${styles.muted}`}>{tr("Monatlich noch nicht konfiguriert", "Monthly plan not configured yet")}</span>}
                    {yearlyReady ? <Link className={`${styles.priceAction} ${styles.yearlyAction}`} href={`/app/billing/checkout?plan=${plan}&interval=yearly`}>{tr("Jährlich", "Yearly")} · {yearly}</Link> : <span className={`${styles.priceAction} ${styles.muted}`}>{tr("Jährlich noch nicht konfiguriert", "Yearly plan not configured yet")}</span>}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <div className={styles.notice}><strong>{tr("Business umfasst deutlich mehr als Objektpässe:", "Business goes far beyond asset passes:")}</strong> {tr("Der Tarif ist für branchenübergreifende Kunden- und Objektverwaltung, Einsatzplanung, Teamzuweisung und nachvollziehbare Arbeits-, Service- oder Prüfberichte ausgelegt. Ob Handwerk, technischer Service, Fahrzeug- oder Gerätewartung, Prüfservice oder anderer Außendienst spielt dabei keine Rolle.", "The plan covers cross-industry customer and asset management, job scheduling, team assignments and traceable work, service or inspection reports – for trades, technical services, vehicle or equipment maintenance, inspections and other field operations.")}</div>
        <div className={styles.notice}><strong>{tr("Umsatzsteuer:", "VAT:")}</strong> {en ? "VAT is not charged in accordance with § 19 of the German VAT Act (small-business regulation)." : KLEINUNTERNEHMER_NOTICE}</div>
        <div className={styles.notice}><strong>{tr("Abos:", "Subscriptions:")}</strong> {tr("Vor jeder neuen kostenpflichtigen Bestellung zeigt NavoPass Tarif, Abrechnungszeitraum, Kündigungs- und Widerrufsinformationen noch einmal an. Die Zahlungsdaten werden anschließend sicher über Stripe verarbeitet. Tarifstatus und Zugriffsrechte werden serverseitig aus dem bestätigten Stripe-Abonnement übernommen.", "Before every paid order, NavoPass displays the plan, billing period, cancellation and withdrawal information again. Payment details are then processed securely by Stripe. Plan status and access rights are applied server-side from the confirmed Stripe subscription.")}</div>
        <div className="business-contact">{tr("Mehr als 1.000 Pässe oder 10 Nutzer benötigt?", "Need more than 1,000 passes or 10 users?")} <Link href="/kontakt">{tr("Individuelles Angebot anfragen", "Request a custom quote")} →</Link></div>
      </main>
    </PublicShell>
  );
}
