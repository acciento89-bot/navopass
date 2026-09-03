import Stripe from "stripe";
import { PLAN_CONFIG, type Plan } from "@/lib/plan-config";

export type BillingInterval = "monthly" | "yearly";

const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";

const priceEnv: Record<Exclude<Plan, "FREE">, Record<BillingInterval, string>> = {
  PLUS: {
    monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY?.trim() || "",
    yearly: process.env.STRIPE_PRICE_PLUS_YEARLY?.trim() || "",
  },
  FAMILY: {
    monthly: process.env.STRIPE_PRICE_FAMILY_MONTHLY?.trim() || "",
    yearly: process.env.STRIPE_PRICE_FAMILY_YEARLY?.trim() || "",
  },
  BUSINESS: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY?.trim() || "",
    yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY?.trim() || "",
  },
};

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export function getStripeWebhookSecret() {
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return webhookSecret;
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function priceIdFor(plan: Plan, interval: BillingInterval) {
  if (plan === "FREE") return null;
  return priceEnv[plan][interval] || null;
}

export async function validateStripePrice(plan: Exclude<Plan, "FREE">, interval: BillingInterval) {
  const priceId = priceIdFor(plan, interval);
  if (!priceId) return { valid: false as const, reason: "Price-ID fehlt." };

  const price = await getStripe().prices.retrieve(priceId);
  const expectedAmount = interval === "yearly" ? PLAN_CONFIG[plan].yearlyCents : PLAN_CONFIG[plan].monthlyCents;
  const expectedStripeInterval = interval === "yearly" ? "year" : "month";
  const valid = Boolean(
    price.active &&
    price.currency.toLowerCase() === "eur" &&
    price.unit_amount === expectedAmount &&
    price.recurring?.interval === expectedStripeInterval &&
    (price.recurring?.interval_count ?? 1) === 1
  );

  if (!valid) {
    return {
      valid: false as const,
      reason: `Stripe-Preis ${priceId} passt nicht zu ${plan}/${interval}: erwartet ${expectedAmount} EUR-Cent pro ${expectedStripeInterval}.`,
    };
  }
  return { valid: true as const, priceId, price };
}

export function planForPriceId(priceId: string | null | undefined): Exclude<Plan, "FREE"> | null {
  if (!priceId) return null;
  for (const plan of ["PLUS", "FAMILY", "BUSINESS"] as const) {
    if (priceEnv[plan].monthly === priceId || priceEnv[plan].yearly === priceId) return plan;
  }
  return null;
}

export function intervalForPriceId(priceId: string | null | undefined): BillingInterval | null {
  if (!priceId) return null;
  for (const plan of ["PLUS", "FAMILY", "BUSINESS"] as const) {
    if (priceEnv[plan].monthly === priceId) return "monthly";
    if (priceEnv[plan].yearly === priceId) return "yearly";
  }
  return null;
}

export function isStripeCheckoutConfigured(plan?: Plan, interval?: BillingInterval) {
  if (!secretKey) return false;
  if (plan && interval) return Boolean(priceIdFor(plan, interval));
  return (["PLUS", "FAMILY", "BUSINESS"] as const).every(
    (item) => Boolean(priceEnv[item].monthly && priceEnv[item].yearly)
  );
}

export function isStripeWebhookConfigured() {
  return Boolean(secretKey && webhookSecret);
}

export function isStripeBillingConfigured() {
  return isStripeCheckoutConfigured() && isStripeWebhookConfigured();
}

export function stripeCustomerId(customer: Stripe.Subscription["customer"] | Stripe.Checkout.Session["customer"]) {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  return customer.id;
}

export function stripeSubscriptionId(subscription: Stripe.Checkout.Session["subscription"]) {
  if (!subscription) return null;
  if (typeof subscription === "string") return subscription;
  return subscription.id;
}

export function subscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id || null;
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  return item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
}

export function subscriptionHasAccess(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing" || status === "past_due";
}
