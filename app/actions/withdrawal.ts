"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/auth";
import { query } from "@/lib/db";
import { brandedMail, isMailConfigured, sendMail } from "@/lib/mailer";
import { appUrl, getStripe } from "@/lib/stripe";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() || "support@kamilunavo.com";
const WITHDRAWAL_DAYS = 14;

function value(formData: FormData, key: string, max = 1000) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function fail(message: string): never {
  redirect(`/vertrag-widerrufen?error=${encodeURIComponent(message)}`);
}

export async function submitWithdrawalAction(formData: FormData) {
  const en = value(formData, "locale", 2) === "en";
  const honeypot = value(formData, "companyWebsite", 200);
  if (honeypot) redirect("/vertrag-widerrufen?received=1");

  const consumerName = value(formData, "consumerName", 160);
  const email = normalizeEmail(value(formData, "email", 320));
  const contractLabel = value(formData, "contractLabel", 120) || "NavoPass-Abo";

  if (consumerName.length < 2) fail(en ? "Please enter your name." : "Bitte gib deinen Namen an.");
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) fail(en ? "Please enter a valid email address." : "Bitte gib eine gültige E-Mail-Adresse an.");

  const account = await query<{ id: string; stripe_subscription_id: string | null }>(
    "SELECT id,stripe_subscription_id FROM users WHERE lower(email)=lower($1) LIMIT 1",
    [email]
  );
  const user = account.rows[0] ?? null;
  const receiptToken = randomBytes(32).toString("base64url");

  const inserted = await query<{ id: string; requested_at: Date | string }>(
    `INSERT INTO withdrawal_requests (
      user_id,consumer_name,email,contract_label,stripe_subscription_id,receipt_token_hash
     ) VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id,requested_at`,
    [user?.id ?? null, consumerName, email, contractLabel, user?.stripe_subscription_id ?? null, hash(receiptToken)]
  );

  const requestId = inserted.rows[0].id;
  const requestedAt = new Date(inserted.rows[0].requested_at);
  let status = "REVIEW_REQUIRED";
  let note = en ? "Your withdrawal notice has been received and will be matched to the stated contract and reviewed." : "Die Widerrufserklärung ist eingegangen und wird dem angegebenen Vertrag zugeordnet und geprüft.";

  if (user?.stripe_subscription_id) {
    try {
      const subscription = await getStripe().subscriptions.retrieve(user.stripe_subscription_id);
      const ageMs = requestedAt.getTime() - subscription.created * 1000;
      const clearlyWithinWindow = ageMs >= 0 && ageMs <= WITHDRAWAL_DAYS * 24 * 60 * 60 * 1000;
      if (clearlyWithinWindow && subscription.status !== "canceled") {
        await getStripe().subscriptions.cancel(subscription.id);
        status = "CANCELED_REVIEW_REFUND";
        note = en ? "The clearly matched NavoPass subscription was created within the past 14 days and was ended immediately. Any required refund will be processed based on the payment and applicable statutory consequences." : "Das eindeutig zugeordnete NavoPass-Abonnement lag innerhalb von 14 Tagen seit seiner Erstellung und wurde unmittelbar beendet. Eine gegebenenfalls erforderliche Rückzahlung wird anhand der Zahlung und der gesetzlichen Widerrufsfolgen bearbeitet.";
      } else if (subscription.status === "canceled") {
        status = "RECEIVED_SUBSCRIPTION_ENDED";
        note = en ? "Your withdrawal notice has been received. The matched Stripe subscription had already ended; any refund consequences will be reviewed." : "Die Widerrufserklärung ist eingegangen. Das zugeordnete Stripe-Abonnement war bereits beendet; mögliche Rückzahlungsfolgen werden geprüft.";
      } else {
        note = en ? "Your withdrawal notice has been received. Because an unambiguous automated deadline check could not be completed, validity and further contractual consequences will be reviewed. Receipt remains documented with date and time." : "Die Widerrufserklärung ist eingegangen. Da eine automatische eindeutige Fristprüfung nicht abgeschlossen werden konnte, werden Wirksamkeit und weitere Vertragsfolgen geprüft. Der Eingang der Erklärung bleibt mit Datum und Uhrzeit dokumentiert.";
      }
    } catch (error) {
      console.error("NavoPass withdrawal subscription lookup failed", { requestId, error });
      note = en ? "Your withdrawal notice has been received. Automated contract verification was technically unavailable; the case will be reviewed using the stored notice." : "Die Widerrufserklärung ist eingegangen. Die automatische Vertragsprüfung war technisch nicht möglich; der Vorgang wird anhand der gespeicherten Erklärung geprüft.";
    }
  } else {
    note = en ? "Your withdrawal notice has been received. An active Stripe subscription could not be matched automatically using the email address; the contract association will be reviewed." : "Die Widerrufserklärung ist eingegangen. Ein aktives Stripe-Abonnement konnte nicht automatisch anhand der E-Mail-Adresse zugeordnet werden; die Vertragszuordnung wird geprüft.";
  }

  await query("UPDATE withdrawal_requests SET processing_status=$1,processing_note=$2 WHERE id=$3", [status, note, requestId]);

  const receivedLabel = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Berlin" }).format(requestedAt);
  const receiptUrl = `${appUrl()}/vertrag-widerrufen/bestaetigung?token=${encodeURIComponent(receiptToken)}`;
  const declaration = `${consumerName} widerruft den Vertrag „${contractLabel}“. Die Erklärung ist am ${receivedLabel} eingegangen.`;

  if (isMailConfigured()) {
    try {
      await sendMail({
        to: email,
        subject: `NavoPass Widerrufsbestätigung ${requestId.slice(0, 8)}`,
        text: `${declaration}\n\n${note}\n\nVorgangsnummer: ${requestId}\nEmpfangsbestätigung: ${receiptUrl}`,
        html: brandedMail({
          title: "Widerrufserklärung eingegangen",
          intro: `${declaration} ${note}`,
          actionLabel: "Empfangsbestätigung öffnen",
          actionUrl: receiptUrl,
          footer: `Vorgangsnummer: ${requestId}`,
        }),
      });
      await query("UPDATE withdrawal_requests SET confirmation_sent_at=now() WHERE id=$1", [requestId]);
    } catch (error) {
      console.error("NavoPass withdrawal confirmation email failed", { requestId, error });
    }

    try {
      await sendMail({
        to: SUPPORT_EMAIL,
        replyTo: email,
        subject: `[NavoPass Widerruf] ${contractLabel} · ${status}`,
        text: `Vorgang: ${requestId}\nEingang: ${receivedLabel}\nName: ${consumerName}\nE-Mail: ${email}\nVertrag: ${contractLabel}\nStatus: ${status}\n${note}\n\n${receiptUrl}`,
      });
      await query("UPDATE withdrawal_requests SET support_notified_at=now() WHERE id=$1", [requestId]);
    } catch (error) {
      console.error("NavoPass withdrawal support notification failed", { requestId, error });
    }
  }

  redirect(`/vertrag-widerrufen/bestaetigung?token=${encodeURIComponent(receiptToken)}`);
}
