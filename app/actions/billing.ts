"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBillingState, getOrCreateStripeCustomer, shouldOpenPortal } from "@/lib/billing";
import { query } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";
import { PAID_TERMS_VERSION } from "@/lib/legal";
import type { Plan } from "@/lib/plan-config";
import { appUrl, getStripe, isStripeCheckoutConfigured, validateStripePrice, type BillingInterval } from "@/lib/stripe";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function paidPlan(value: string): Exclude<Plan, "FREE"> | null {
  return value === "PLUS" || value === "FAMILY" || value === "BUSINESS" ? value : null;
}

function billingInterval(value: string): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

function pricingError(message: string): never {
  redirect(`/preise?billingError=${encodeURIComponent(message)}`);
}

function reviewError(plan: Exclude<Plan, "FREE">, interval: BillingInterval, message: string): never {
  redirect(`/app/billing/checkout?plan=${plan}&interval=${interval}&error=${encodeURIComponent(message)}`);
}

function checkoutFailureMessage(error: unknown) {
  const isSandbox = process.env.STRIPE_SECRET_KEY?.trim().startsWith("sk_test_") ?? false;
  if (!isSandbox) return "Stripe Checkout konnte gerade nicht gestartet werden. Bitte versuche es erneut.";

  const candidate = error as { message?: unknown; code?: unknown; type?: unknown; requestId?: unknown };
  const message = typeof candidate?.message === "string" ? candidate.message : "Unbekannter Stripe-Fehler";
  const code = typeof candidate?.code === "string" ? ` [${candidate.code}]` : "";
  return `Stripe-Sandbox: ${message}${code}`.slice(0, 500);
}

async function createPortalUrl(customerId: string) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/app/settings`,
    locale: "de",
  });
  return session.url;
}

export async function createCheckoutAction(formData: FormData) {
  const user = await requireUser();
  const plan = paidPlan(value(formData, "plan"));
  const interval = billingInterval(value(formData, "interval"));
  if (!plan) pricingError("Ungültiger Tarif.");

  const termsAccepted = formData.get("termsAccepted") === "on";
  const withdrawalAcknowledged = formData.get("withdrawalAcknowledged") === "on";
  const earlyPerformanceRequested = formData.get("earlyPerformanceRequested") === "on";
  if (!termsAccepted || !withdrawalAcknowledged || !earlyPerformanceRequested) {
    reviewError(plan, interval, "Bitte bestätige alle Vertrags- und Verbraucherinformationen, bevor du zu Stripe wechselst.");
  }

  if (!user.email_verified_at) {
    await sendVerificationEmail(user).catch(() => undefined);
    reviewError(plan, interval, "Bitte bestätige zuerst deine E-Mail-Adresse. Wir haben dir eine Bestätigungs-Mail gesendet.");
  }

  if (!isStripeCheckoutConfigured(plan, interval)) {
    reviewError(plan, interval, "Dieser Tarif ist noch nicht für die Buchung konfiguriert.");
  }

  let verifiedPrice: Awaited<ReturnType<typeof validateStripePrice>> | null = null;
  try {
    verifiedPrice = await validateStripePrice(plan, interval);
  } catch (error) {
    console.error("NavoPass Stripe price validation failed", error);
  }
  if (!verifiedPrice?.valid) {
    console.error("NavoPass refused mismatching Stripe price", { plan, interval, reason: verifiedPrice?.reason });
    reviewError(plan, interval, "Die Stripe-Preiskonfiguration passt nicht zum gewählten NavoPass-Tarif. Es wurde keine Buchung gestartet.");
  }

  const billing = await getBillingState(user.id);
  if (shouldOpenPortal(billing) && billing.stripe_customer_id) {
    let portalUrl: string | null = null;
    try {
      portalUrl = await createPortalUrl(billing.stripe_customer_id);
    } catch (error) {
      console.error("NavoPass billing portal creation failed", error);
    }
    if (!portalUrl) redirect("/app/settings?billingError=Das%20Abo-Portal%20konnte%20gerade%20nicht%20geöffnet%20werden.");
    redirect(portalUrl);
  }

  const consent = await query<{ id: string }>(
    `INSERT INTO billing_consents (
      user_id,plan,billing_interval,terms_version,terms_accepted_at,withdrawal_acknowledged_at,early_performance_requested_at
     ) VALUES ($1,$2,$3,$4,now(),now(),now()) RETURNING id`,
    [user.id, plan, interval, PAID_TERMS_VERSION]
  );
  const consentId = consent.rows[0].id;

  let checkoutUrl: string | null = null;
  let checkoutError: string | null = null;
  try {
    const customerId = await getOrCreateStripeCustomer(user);
    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      submit_type: "pay",
      locale: "de",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: verifiedPrice.priceId, quantity: 1 }],
      success_url: `${appUrl()}/app/settings?billingSuccess=1`,
      cancel_url: `${appUrl()}/preise?billingCancelled=1`,
      metadata: {
        navopass_user_id: user.id,
        navopass_plan: plan,
        navopass_interval: interval,
        navopass_consent_id: consentId,
      },
      subscription_data: {
        metadata: {
          navopass_user_id: user.id,
          navopass_plan: plan,
          navopass_interval: interval,
          navopass_consent_id: consentId,
        },
      },
    });
    await query("UPDATE billing_consents SET stripe_checkout_session_id=$1 WHERE id=$2", [checkout.id, consentId]);
    checkoutUrl = checkout.url;
  } catch (error) {
    console.error("NavoPass Stripe checkout creation failed", error);
    checkoutError = checkoutFailureMessage(error);
  }

  if (!checkoutUrl) reviewError(plan, interval, checkoutError || "Stripe Checkout konnte gerade nicht gestartet werden. Bitte versuche es erneut.");
  redirect(checkoutUrl);
}

export async function openBillingPortalAction() {
  const user = await requireUser();
  const billing = await getBillingState(user.id);
  if (!billing.stripe_customer_id) redirect("/preise");

  let url: string | null = null;
  try {
    url = await createPortalUrl(billing.stripe_customer_id);
  } catch (error) {
    console.error("NavoPass billing portal creation failed", error);
  }
  if (!url) redirect("/app/settings?billingError=Das%20Abo-Portal%20konnte%20gerade%20nicht%20geöffnet%20werden.");
  redirect(url);
}
