"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/auth";
import { query } from "@/lib/db";
import { brandedMail, isMailConfigured, sendMail } from "@/lib/mailer";
import { appUrl, getStripe, subscriptionPeriodEnd } from "@/lib/stripe";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() || "support@kamilunavo.com";

type CancellationKind = "ORDINARY" | "EXTRAORDINARY";
type EndMode = "NEXT_POSSIBLE" | "IMMEDIATE" | "DATE";

function value(formData: FormData, key: string, max = 1000) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function fail(message: string): never {
  redirect(`/vertrag-kuendigen?error=${encodeURIComponent(message)}`);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

function formatDate(value: Date | string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(parsed);
}

function requestedEndLabel(mode: EndMode, date: string | null) {
  if (mode === "NEXT_POSSIBLE") return "zum nächstmöglichen Zeitpunkt";
  if (mode === "IMMEDIATE") return "sofort";
  return date ? `zum ${formatDate(`${date}T12:00:00Z`) || date}` : "zu dem angegebenen Datum";
}

export async function submitCancellationAction(formData: FormData) {
  const en = value(formData, "locale", 2) === "en";
  const honeypot = value(formData, "companyWebsite", 200);
  if (honeypot) redirect("/vertrag-kuendigen?received=1");

  const email = normalizeEmail(value(formData, "email", 320));
  const contractLabel = value(formData, "contractLabel", 120) || "NavoPass-Abo";
  const rawKind = value(formData, "cancellationKind", 30);
  const kind: CancellationKind = rawKind === "EXTRAORDINARY" ? "EXTRAORDINARY" : "ORDINARY";
  const reason = value(formData, "reason", 2000);
  const rawEndMode = value(formData, "requestedEndMode", 30);
  const endMode: EndMode = rawEndMode === "IMMEDIATE" ? "IMMEDIATE" : rawEndMode === "DATE" ? "DATE" : "NEXT_POSSIBLE";
  const requestedDate = endMode === "DATE" ? value(formData, "requestedEndDate", 20) : "";

  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) fail(en ? "Please enter the email address for your NavoPass contract." : "Bitte gib die E-Mail-Adresse deines NavoPass-Vertrags an.");
  if (kind === "EXTRAORDINARY" && reason.length < 3) fail(en ? "Please state the reason for an extraordinary cancellation." : "Bitte gib bei einer außerordentlichen Kündigung den Kündigungsgrund an.");
  if (endMode === "DATE" && !validDate(requestedDate)) fail(en ? "Please enter a valid requested end date." : "Bitte gib ein gültiges gewünschtes Beendigungsdatum an.");

  const account = await query<{ id: string; stripe_subscription_id: string | null; subscription_status: string | null }>(
    `SELECT id,stripe_subscription_id,subscription_status FROM users WHERE lower(email)=lower($1) LIMIT 1`,
    [email]
  );
  const user = account.rows[0] ?? null;
  const receiptToken = randomBytes(32).toString("base64url");
  const receiptHash = tokenHash(receiptToken);

  const inserted = await query<{ id: string; requested_at: Date | string }>(
    `INSERT INTO cancellation_requests (
      user_id,email,contract_label,cancellation_kind,reason,requested_end_mode,requested_end_date,
      stripe_subscription_id,receipt_token_hash
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id,requested_at`,
    [user?.id ?? null, email, contractLabel, kind, reason || null, endMode, requestedDate || null, user?.stripe_subscription_id ?? null, receiptHash]
  );

  const requestId = inserted.rows[0].id;
  const requestedAt = new Date(inserted.rows[0].requested_at);
  let processingStatus = "RECEIVED";
  let processingNote = en ? "Your cancellation notice has been received and will be reviewed against the contract." : "Die Kündigungserklärung ist eingegangen und wird anhand des Vertrags geprüft.";

  if (user?.stripe_subscription_id && kind === "ORDINARY" && endMode === "NEXT_POSSIBLE") {
    try {
      const updated = await getStripe().subscriptions.update(user.stripe_subscription_id, { cancel_at_period_end: true });
      const periodEnd = formatDate(subscriptionPeriodEnd(updated));
      processingStatus = "SCHEDULED";
      processingNote = periodEnd
        ? (en ? `The Stripe subscription has been scheduled to end at the close of the current billing period on ${periodEnd}.` : `Das Stripe-Abonnement wurde zum Ende des laufenden Abrechnungszeitraums am ${periodEnd} zur Beendigung vorgemerkt.`)
        : (en ? "The Stripe subscription has been scheduled to end at the close of the current billing period." : "Das Stripe-Abonnement wurde zum Ende des laufenden Abrechnungszeitraums zur Beendigung vorgemerkt.");
    } catch (error) {
      console.error("NavoPass automatic cancellation scheduling failed", { requestId, error });
      processingStatus = "REVIEW_REQUIRED";
      processingNote = en ? "Your cancellation notice has been received. Automatic scheduling could not be completed and will be reviewed manually." : "Die Kündigungserklärung ist wirksam eingegangen. Die automatische Vormerkung konnte technisch nicht abgeschlossen werden und wird manuell geprüft.";
    }
  } else if (!user?.stripe_subscription_id) {
    processingStatus = "REVIEW_REQUIRED";
    processingNote = en ? "Your cancellation notice has been received. No active Stripe subscription could be matched automatically; the association will be reviewed." : "Die Kündigungserklärung ist eingegangen. Es konnte kein aktives Stripe-Abonnement automatisch zugeordnet werden; die Zuordnung wird geprüft.";
  } else if (kind === "EXTRAORDINARY") {
    processingStatus = "REVIEW_REQUIRED";
    processingNote = en ? "Your extraordinary cancellation notice has been received and will be reviewed together with the reason provided." : "Die außerordentliche Kündigungserklärung ist eingegangen und wird einschließlich des angegebenen Grundes geprüft.";
  } else {
    processingStatus = "REVIEW_REQUIRED";
    processingNote = en ? "Your cancellation notice with the requested end date has been received and will be reviewed." : "Die Kündigungserklärung mit dem gewünschten Beendigungszeitpunkt ist eingegangen und wird geprüft.";
  }

  await query(
    "UPDATE cancellation_requests SET processing_status=$1,processing_note=$2 WHERE id=$3",
    [processingStatus, processingNote, requestId]
  );

  const receivedLabel = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Berlin" }).format(requestedAt);
  const endLabel = requestedEndLabel(endMode, requestedDate || null);
  const receiptUrl = `${appUrl()}/vertrag-kuendigen/bestaetigung?token=${encodeURIComponent(receiptToken)}`;
  const subject = `NavoPass Kündigungsbestätigung ${requestId.slice(0, 8)}`;
  const summary = `Deine Kündigungserklärung für „${contractLabel}“ ist am ${receivedLabel} bei Kamilunavo eingegangen. Art: ${kind === "EXTRAORDINARY" ? "außerordentliche Kündigung" : "ordentliche Kündigung"}. Gewünschter Beendigungszeitpunkt: ${endLabel}.`;
  const reasonText = kind === "EXTRAORDINARY" ? `\nKündigungsgrund: ${reason}` : "";

  if (isMailConfigured()) {
    try {
      await sendMail({
        to: email,
        subject,
        text: `${summary}${reasonText}\n\n${processingNote}\n\nVorgangsnummer: ${requestId}\nEmpfangsbestätigung: ${receiptUrl}`,
        html: brandedMail({
          title: "Kündigungserklärung eingegangen",
          intro: `${summary} ${processingNote}`,
          actionLabel: "Empfangsbestätigung öffnen",
          actionUrl: receiptUrl,
          footer: `Vorgangsnummer: ${requestId}`,
        }),
      });
      await query("UPDATE cancellation_requests SET confirmation_sent_at=now() WHERE id=$1", [requestId]);
    } catch (error) {
      console.error("NavoPass cancellation confirmation email failed", { requestId, error });
    }

    try {
      await sendMail({
        to: SUPPORT_EMAIL,
        replyTo: email,
        subject: `[NavoPass Kündigung] ${contractLabel} · ${processingStatus}`,
        text: `Vorgang: ${requestId}\nEingang: ${receivedLabel}\nE-Mail: ${email}\nVertrag: ${contractLabel}\nArt: ${kind}\nGewünschtes Ende: ${endLabel}${reasonText}\nStatus: ${processingStatus}\n${processingNote}\n\n${receiptUrl}`,
      });
      await query("UPDATE cancellation_requests SET support_notified_at=now() WHERE id=$1", [requestId]);
    } catch (error) {
      console.error("NavoPass cancellation support notification failed", { requestId, error });
    }
  }

  redirect(`/vertrag-kuendigen/bestaetigung?token=${encodeURIComponent(receiptToken)}`);
}
