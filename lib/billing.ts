import type Stripe from "stripe";
import { query, transaction } from "@/lib/db";
import type { Plan } from "@/lib/plan-config";
import {
  getStripe,
  intervalForPriceId,
  planForPriceId,
  stripeCustomerId,
  subscriptionHasAccess,
  subscriptionPeriodEnd,
  subscriptionPriceId,
  type BillingInterval,
} from "@/lib/stripe";

export type BillingState = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: Date | string | null;
  subscription_cancel_at_period_end: boolean;
  stripe_event_created: number;
};

export async function getBillingState(userId: string): Promise<BillingState> {
  const result = await query<BillingState>(
    `SELECT stripe_customer_id,stripe_subscription_id,stripe_price_id,subscription_status,
      subscription_current_period_end,subscription_cancel_at_period_end,stripe_event_created
     FROM users WHERE id=$1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? {
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    subscription_status: null,
    subscription_current_period_end: null,
    subscription_cancel_at_period_end: false,
    stripe_event_created: 0,
  };
}

export async function getOrCreateStripeCustomer(user: { id: string; email: string; name: string }) {
  const state = await getBillingState(user.id);
  if (state.stripe_customer_id) return state.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create(
    {
      email: user.email,
      name: user.name,
      metadata: { navopass_user_id: user.id },
    },
    { idempotencyKey: `navopass-customer-${user.id}` }
  );

  const updated = await query<{ stripe_customer_id: string | null }>(
    `UPDATE users SET stripe_customer_id=COALESCE(stripe_customer_id,$1)
     WHERE id=$2 RETURNING stripe_customer_id`,
    [customer.id, user.id]
  );
  return updated.rows[0]?.stripe_customer_id || customer.id;
}

function validUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function applyStripeSubscriptionEvent({
  eventId,
  eventType,
  eventCreated,
  subscription,
}: {
  eventId: string;
  eventType: string;
  eventCreated: number;
  subscription: Stripe.Subscription;
}) {
  const customerId = stripeCustomerId(subscription.customer);
  const priceId = subscriptionPriceId(subscription);
  const mappedPlan = planForPriceId(priceId);
  const interval = intervalForPriceId(priceId);
  const periodEnd = subscriptionPeriodEnd(subscription);
  const metadataUserId = subscription.metadata?.navopass_user_id || null;
  const effectivePlan: Plan = subscriptionHasAccess(subscription.status) && mappedPlan ? mappedPlan : "FREE";

  return transaction(async (client) => {
    const claimed = await client.query<{ id: string }>(
      `INSERT INTO stripe_events (id,type,created) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [eventId, eventType, eventCreated]
    );
    if (!claimed.rows[0]) return { state: "duplicate" as const, userId: null, plan: null, interval: null };

    let userId: string | null = null;
    if (validUuid(metadataUserId)) {
      const byMetadata = await client.query<{ id: string }>("SELECT id FROM users WHERE id=$1 LIMIT 1", [metadataUserId]);
      userId = byMetadata.rows[0]?.id ?? null;
    }
    if (!userId) {
      const bySubscription = await client.query<{ id: string }>(
        "SELECT id FROM users WHERE stripe_subscription_id=$1 LIMIT 1",
        [subscription.id]
      );
      userId = bySubscription.rows[0]?.id ?? null;
    }
    if (!userId && customerId) {
      const byCustomer = await client.query<{ id: string }>(
        "SELECT id FROM users WHERE stripe_customer_id=$1 LIMIT 1",
        [customerId]
      );
      userId = byCustomer.rows[0]?.id ?? null;
    }

    if (!userId) {
      await client.query("DELETE FROM stripe_events WHERE id=$1", [eventId]);
      return { state: "orphan" as const, userId: null, plan: effectivePlan, interval };
    }

    await client.query(
      `UPDATE users SET
        stripe_customer_id=COALESCE($1,stripe_customer_id),
        stripe_subscription_id=$2,
        stripe_price_id=$3,
        subscription_status=$4,
        subscription_current_period_end=$5,
        subscription_cancel_at_period_end=$6,
        stripe_event_created=GREATEST(stripe_event_created,$7),
        plan=$8
       WHERE id=$9`,
      [
        customerId,
        subscription.id,
        priceId,
        subscription.status,
        periodEnd,
        Boolean(subscription.cancel_at_period_end),
        eventCreated,
        effectivePlan,
        userId,
      ]
    );

    return { state: "processed" as const, userId, plan: effectivePlan, interval };
  });
}

export function shouldOpenPortal(state: BillingState) {
  if (!state.stripe_customer_id) return false;
  if (!state.stripe_subscription_id) return false;
  return state.subscription_status !== "canceled" && state.subscription_status !== "incomplete_expired";
}

export function billingIntervalLabel(interval: BillingInterval | null) {
  return interval === "yearly" ? "jährlich" : interval === "monthly" ? "monatlich" : null;
}
