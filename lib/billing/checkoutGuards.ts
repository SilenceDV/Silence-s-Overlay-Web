import "server-only";
import type Stripe from "stripe";

export const ACTIVE_CONFLICT = { code: "SUBSCRIPTION_ALREADY_ACTIVE", message: "You already have an active subscription. Manage it from the billing portal." };
export function blocksCheckout(subscription: { status?: string; cancel_at_period_end?: boolean; current_period_end?: string | null } | null, now = Date.now()) {
  if (!subscription) return false;
  if (["active", "trialing", "past_due"].includes(subscription.status ?? "")) return true;
  return Boolean(subscription.cancel_at_period_end && subscription.current_period_end && new Date(subscription.current_period_end).getTime() > now);
}
export function stripeBlocksCheckout(subscription: Stripe.Subscription, now = Date.now()) {
  const end = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  return ["active", "trialing", "past_due"].includes(subscription.status) || Boolean(subscription.cancel_at_period_end && end && end * 1000 > now);
}
