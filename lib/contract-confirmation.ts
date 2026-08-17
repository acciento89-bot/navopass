import { query } from "@/lib/db";
import { brandedMail, escapeHtml, isMailConfigured, sendMail } from "@/lib/mailer";
import { PLAN_CONFIG, formatEuro, type Plan } from "@/lib/plan-config";
import { appUrl, type BillingInterval } from "@/lib/stripe";

export async function sendContractConfirmation(consentId: string, checkoutSessionId: string) {
  if (!isMailConfigured()) throw new Error("Mail transport is not configured");

  const result = await query<{
    id: string;
    plan: Exclude<Plan, "FREE">;
    billing_interval: BillingInterval;
    terms_version: string;
    terms_accepted_at: Date | string;
    withdrawal_acknowledged_at: Date | string;
    early_performance_requested_at: Date | string;
    contract_confirmation_sent_at: Date | string | null;
    name: string;
    email: string;
  }>(
    `SELECT c.id,c.plan,c.billing_interval,c.terms_version,c.terms_accepted_at,c.withdrawal_acknowledged_at,
      c.early_performance_requested_at,c.contract_confirmation_sent_at,u.name,u.email
     FROM billing_consents c JOIN users u ON u.id=c.user_id
     WHERE c.id=$1 AND c.stripe_checkout_session_id=$2 LIMIT 1`,
    [consentId, checkoutSessionId]
  );
  const consent = result.rows[0];
  if (!consent) throw new Error("Billing consent not found for Checkout Session");
  if (consent.contract_confirmation_sent_at) return { state: "already-sent" as const };

  const definition = PLAN_CONFIG[consent.plan];
  const yearly = consent.billing_interval === "yearly";
  const amount = yearly ? definition.yearlyCents : definition.monthlyCents;
  const cadence = yearly ? "jährlich" : "monatlich";
  const base = appUrl();
  const termsUrl = `${base}/nutzungsbedingungen`;
  const withdrawalUrl = `${base}/vertrag-widerrufen`;
  const cancellationUrl = `${base}/vertrag-kuendigen`;
  const acceptedAt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Berlin" }).format(new Date(consent.terms_accepted_at));

  const details = [
    `Tarif: NavoPass ${definition.name}`,
    `Preis: ${formatEuro(amount)} ${yearly ? "pro Jahr" : "pro Monat"}`,
    `Abrechnung: ${cadence} im Voraus; fortlaufend bis zur Kündigung`,
    `Ordentliche Kündigung: zum Ende des laufenden Abrechnungszeitraums`,
    `Tariflimits: ${definition.maxAssets} Pässe, ${definition.maxSeats} Nutzer, ${definition.maxStorageBytes} Bytes Speicher`,
    `Nutzungsbedingungen: Version ${consent.terms_version}, bestätigt am ${acceptedAt}`,
    "Widerruf: Für Verbraucher besteht bei Fernabsatzverträgen grundsätzlich ein 14-tägiges gesetzliches Widerrufsrecht nach Maßgabe der gesetzlichen Voraussetzungen.",
    "Leistungsbeginn: Du hast ausdrücklich verlangt, dass NavoPass unmittelbar nach erfolgreicher Bestellung und damit vor Ablauf der Widerrufsfrist mit der kostenpflichtigen Dienstleistung beginnt.",
    `Anbieter: Piotr Kaminski – Kamilunavo, Otto-Braun-Straße 14, 40595 Düsseldorf, contact@kamilunavo.com`,
  ];

  const text = `Hallo ${consent.name},\n\nhiermit bestätigen wir deinen kostenpflichtigen NavoPass-Vertrag.\n\n${details.join("\n")}\n\nNutzungsbedingungen: ${termsUrl}\nWiderruf und Widerrufsbelehrung: ${withdrawalUrl}\nKündigung: ${cancellationUrl}\n\nDie Zahlungsabwicklung erfolgt über Stripe. Diese E-Mail bestätigt den NavoPass-Vertragsinhalt und deine vor dem Checkout abgegebenen Erklärungen.`;
  const detailsHtml = details.map((line) => `<li style="margin:0 0 8px">${escapeHtml(line)}</li>`).join("");
  const html = brandedMail({
    title: "Dein NavoPass-Vertrag",
    intro: `Hallo ${consent.name}, dein kostenpflichtiges NavoPass-Abonnement wurde erfolgreich abgeschlossen.`,
    actionLabel: "NavoPass öffnen",
    actionUrl: `${base}/app/settings`,
    footer: "Diese Vertragsbestätigung bitte für deine Unterlagen aufbewahren.",
  }).replace(
    "<hr style=\"border:0;border-top:1px solid #e4edf2;margin:30px 0 20px\">",
    `<div style="margin:24px 0;padding:18px;border-radius:14px;background:#f4f8fb;color:#29475e;line-height:1.55"><ul style="padding-left:20px;margin:0">${detailsHtml}</ul><p style="font-size:13px;margin:16px 0 0"><a href="${escapeHtml(termsUrl)}">Nutzungsbedingungen</a> · <a href="${escapeHtml(withdrawalUrl)}">Vertrag widerrufen</a> · <a href="${escapeHtml(cancellationUrl)}">Verträge hier kündigen</a></p></div><hr style="border:0;border-top:1px solid #e4edf2;margin:30px 0 20px">`
  );

  await sendMail({
    to: consent.email,
    subject: `NavoPass Vertragsbestätigung – ${definition.name}`,
    text,
    html,
  });
  await query("UPDATE billing_consents SET contract_confirmation_sent_at=now() WHERE id=$1 AND contract_confirmation_sent_at IS NULL", [consent.id]);
  return { state: "sent" as const };
}
