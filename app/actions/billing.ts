"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBillingState, getOrCreateStripeCustomer, shouldOpenPortal } from "@/lib/billing";
import { sendVerificationEmail } from "@/lib/email-verification";
import type { Plan } from "@/lib/plan-config";
import { appUrl, getStripe, isStripeCheckoutConfigured, priceIdFor, type BillingInterval } from "@/lib/stripe";

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

  if (!user.email_verified_at) {
    await sendVerificationEmail(user).catch(() => undefined);
    redirect("/app/settings?billingError=Bitte%20bestätige%20zuerst%20deine%20E-Mail-Adresse.%20Wir%20haben%20dir%20eine%20Bestätigungs-Mail%20gesendet.");
  }

  const priceId = priceIdFor(plan, interval);
  if (!priceId || !isStripeCheckoutConfigured(plan, interval)) {
    pricingError("Dieser Tarif ist noch nicht für die Buchung konfiguriert.");
  }

  const billing = await getBillingState(user.id);
  if (shouldOpenPortal(billing) && billing.stripe_customer_id) {
    try {
      const url = await createPortalUrl(billing.stripe_customer_id);
      redirect(url);
    } catch (error) {
      console.error("NavoPass billing portal creation failed", error);
      redirect("/app/settings?billingError=Das%20Abo-Portal%20konnte%20gerade%20nicht%20geöffnet%20werden.");
    }
  }

  const customerId = await getOrCreateStripeCustomer(user);
  let checkoutUrl: string | null = null;
  try {
    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl()}/app/settings?billingSuccess=1`,
      cancel_url: `${appUrl()}/preise?billingCancelled=1`,
      metadata: {
        navopass_user_id: user.id,
        navopass_plan: plan,
        navopass_interval: interval,
      },
      subscription_data: {
        metadata: {
          navopass_user_id: user.id,
          navopass_plan: plan,
          navopass_interval: interval,
        },
      },
    });
    checkoutUrl = checkout.url;
  } catch (error) {
    console.error("NavoPass Stripe checkout creation failed", error);
  }

  if (!checkoutUrl) pricingError("Stripe Checkout konnte gerade nicht gestartet werden. Bitte versuche es erneut.");
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
