import "server-only";
import type Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const iso = (seconds?: number | null) => seconds ? new Date(seconds * 1000).toISOString() : null;

export async function synchronizeSubscription(subscription: Stripe.Subscription, event: Stripe.Event) {
  const db = createSupabaseAdminClient();
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const { data: existing, error: lookupError } = await db.from("subscriptions").select("user_id,grace_period_end").eq("stripe_customer_id", customerId).maybeSingle();
  if (lookupError) throw lookupError;
  const userId = subscription.metadata.supabase_user_id || existing?.user_id;
  if (!userId) throw new Error(`No user mapped to Stripe customer ${customerId}`);
  const periodStart = (subscription as Stripe.Subscription & { current_period_start?: number }).current_period_start;
  const periodEnd = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const delinquent = ["past_due", "unpaid"].includes(subscription.status);
  const recovered = ["active", "trialing"].includes(subscription.status);
  const firstFailure = new Date(event.created * 1000 + serverEnv().PAYMENT_GRACE_PERIOD_DAYS * 86_400_000).toISOString();
  const grace = delinquent ? (existing?.grace_period_end ?? firstFailure) : recovered || subscription.status === "canceled" ? null : existing?.grace_period_end;
  const { error } = await db.from("subscriptions").upsert({
    user_id: userId, stripe_customer_id: customerId, stripe_subscription_id: subscription.id,
    price_id: subscription.items.data[0]?.price?.id ?? null, status: subscription.status,
    current_period_start: iso(periodStart), current_period_end: iso(periodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end, canceled_at: iso(subscription.canceled_at),
    trial_end: iso(subscription.trial_end), grace_period_end: grace, suspended: false,
    last_event_created: event.created, last_stripe_event_id: event.id, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function retrieveAndSynchronize(subscriptionId: string, event: Stripe.Event, stripe: Stripe) {
  // Event timestamps have second precision. Always retrieve current Stripe state so out-of-order,
  // equal-timestamp lifecycle events cannot restore an older embedded snapshot.
  const current = await stripe.subscriptions.retrieve(subscriptionId);
  await synchronizeSubscription(current, event);
}
