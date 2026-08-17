import type Stripe from "stripe";
import { applyStripeSubscriptionEvent } from "@/lib/billing";
import {
  getStripe,
  getStripeWebhookSecret,
  planForPriceId,
  stripeSubscriptionId,
  subscriptionHasAccess,
  subscriptionPriceId,
} from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentSubscription(event: Stripe.Event) {
  const stripe = getStripe();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = stripeSubscriptionId(session.subscription);
    if (!subscriptionId) return null;
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const incoming = event.data.object as Stripe.Subscription;
    try {
      return await stripe.subscriptions.retrieve(incoming.id);
    } catch {
      return incoming;
    }
  }

  return null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe-Signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (error) {
    console.error("NavoPass Stripe webhook signature failed", error);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  try {
    const subscription = await currentSubscription(event);
    if (!subscription) return Response.json({ received: true, ignored: true });

    const priceId = subscriptionPriceId(subscription);
    const mappedPlan = planForPriceId(priceId);
    const isNavoPassTagged = Boolean(subscription.metadata?.navopass_user_id);

    if (subscriptionHasAccess(subscription.status) && isNavoPassTagged && !mappedPlan) {
      console.error("NavoPass Stripe webhook has an unmapped active price", { eventId: event.id, priceId });
      return new Response("Active NavoPass price is not configured", { status: 500 });
    }

    const result = await applyStripeSubscriptionEvent({
      eventId: event.id,
      eventType: event.type,
      eventCreated: event.created,
      subscription,
    });

    return Response.json({ received: true, state: result.state });
  } catch (error) {
    console.error("NavoPass Stripe webhook processing failed", { eventId: event.id, error });
    return new Response("Webhook processing failed", { status: 500 });
  }
}
