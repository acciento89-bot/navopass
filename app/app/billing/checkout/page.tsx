import Link from "next/link";
import { redirect } from "next/navigation";
import { createCheckoutAction } from "@/app/actions/billing";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { getBillingState, shouldOpenPortal } from "@/lib/billing";
import { PAID_TERMS_VERSION } from "@/lib/legal";
import { PLAN_CONFIG, formatEuro, formatStorage, type Plan } from "@/lib/plan-config";
import type { BillingInterval } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function paidPlan(value: string | undefined): Exclude<Plan, "FREE"> | null {
  return value === "PLUS" || value === "FAMILY" || value === "BUSINESS" ? value : null;
}

function interval(value: string | undefined): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export default async function BillingCheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string; interval?: string; error?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const plan = paidPlan(params.plan);
  if (!plan) redirect("/preise?billingError=Ungültiger%20Tarif");
  const billingInterval = interval(params.interval);
  const definition = PLAN_CONFIG[plan];
  const amount = billingInterval === "yearly" ? definition.yearlyCents : definition.monthlyCents;
  const billing = await getBillingState(user.id);

  if (shouldOpenPortal(billing)) {
    redirect("/app/settings?billingError=Du%20hast%20bereits%20ein%20laufendes%20Abo.%20Tarifwechsel%20und%20Kündigung%20erfolgen%20über%20die%20Abo-Verwaltung.");
  }

  return (
    <main className="app-page"><div className="container"><AppHeader name={user.name} />
      <div className="page-back"><Link href="/preise">← Zurück zu den Tarifen</Link></div>
      <section className="settings-head"><span className="eyebrow">Bestellung prüfen</span><h1>{definition.name} {billingInterval === "yearly" ? "jährlich" : "monatlich"}</h1><p>Prüfe Tarif, Laufzeit und Verbraucherinformationen, bevor du zur sicheren Zahlung bei Stripe wechselst.</p></section>
      {params.error && <p className="form-error team-message">{params.error}</p>}

      <section className="settings-grid">
        <article className="panel settings-panel plan-panel">
          <div className="plan-top"><div><span className="eyebrow">Deine Auswahl</span><h2>{definition.name}</h2><p>{definition.description}</p></div><span className="plan-badge">{billingInterval === "yearly" ? "Jährlich" : "Monatlich"}</span></div>
          <div className="detail-list">
            <div><span>Preis</span><b>{formatEuro(amount)} je {billingInterval === "yearly" ? "Jahr" : "Monat"}</b></div>
            <div><span>Pässe</span><b>bis {definition.maxAssets.toLocaleString("de-DE")}</b></div>
            <div><span>Speicher</span><b>{formatStorage(definition.maxStorageBytes)}</b></div>
            <div><span>Nutzer</span><b>bis {definition.maxSeats}</b></div>
          </div>
          <div className="limit-note"><b>Fortlaufendes Abonnement.</b> Nach jedem Abrechnungszeitraum verlängert sich das Abo um einen weiteren gleich langen Abrechnungszeitraum, bis es gekündigt wird. Die ordentliche Kündigung ist zum Ende des laufenden Abrechnungszeitraums möglich.</div>
        </article>

        <article className="panel settings-panel">
          <div className="panel-title"><div><span className="eyebrow">Vertragspartner</span><h2>Kamilunavo</h2></div><span className="settings-icon">DE</span></div>
          <p className="muted">Piotr Kaminski – Kamilunavo<br />Otto-Braun-Straße 14<br />40595 Düsseldorf<br />Deutschland</p>
          <p className="muted">Die Zahlung wird im nächsten Schritt über Stripe abgewickelt. Die im Stripe-Checkout unmittelbar vor Abschluss angezeigte Gesamtsumme muss dieser Tarifauswahl entsprechen; NavoPass prüft die konfigurierte Stripe-Price-ID zusätzlich serverseitig.</p>
        </article>

        <article className="panel settings-panel span-2">
          <div className="panel-title"><div><span className="eyebrow">Verbraucherinformationen</span><h2>Bestätigung vor Stripe</h2></div><span className="settings-icon">✓</span></div>
          <p className="muted">Für kostenpflichtige Fernabsatzverträge besteht für Verbraucher grundsätzlich ein 14-tägiges Widerrufsrecht. Die vollständige Widerrufsbelehrung und elektronische Widerrufsfunktion findest du unter <Link className="text-link" href="/vertrag-widerrufen">Vertrag widerrufen</Link>. Die Kündigung eines laufenden Abos ist zusätzlich über <Link className="text-link" href="/vertrag-kuendigen">Verträge hier kündigen</Link> möglich.</p>
          <form action={createCheckoutAction} className="compact-form">
            <input type="hidden" name="plan" value={plan} />
            <input type="hidden" name="interval" value={billingInterval} />
            <label className="check-label"><input type="checkbox" name="termsAccepted" required /><span>Ich akzeptiere die <Link href="/nutzungsbedingungen" target="_blank">Nutzungsbedingungen</Link> in der Version {PAID_TERMS_VERSION}.</span></label>
            <label className="check-label"><input type="checkbox" name="withdrawalAcknowledged" required /><span>Ich habe die <Link href="/vertrag-widerrufen" target="_blank">Widerrufsbelehrung</Link>, die 14-tägige Widerrufsfrist und die elektronische Widerrufsmöglichkeit zur Kenntnis genommen.</span></label>
            <label className="check-label"><input type="checkbox" name="earlyPerformanceRequested" required /><span>Ich verlange ausdrücklich, dass Kamilunavo mit der kostenpflichtigen NavoPass-Dienstleistung unmittelbar nach erfolgreicher Bestellung und damit vor Ablauf der Widerrufsfrist beginnt. Mir ist bekannt, dass bei einem späteren Widerruf für bereits auf meinen ausdrücklichen Wunsch erbrachte Leistungen unter den gesetzlichen Voraussetzungen Wertersatz geschuldet sein kann.</span></label>
            <button className="button" type="submit">Weiter zur sicheren Zahlung bei Stripe →</button>
          </form>
          <p className="muted">Der zahlungspflichtige Abschluss erfolgt erst im folgenden Stripe-Checkout. Wird Stripe abgebrochen, wird kein kostenpflichtiger Tarif aktiviert.</p>
        </article>
      </section>
    </div></main>
  );
}
