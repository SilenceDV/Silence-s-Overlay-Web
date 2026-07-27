import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { retrieveAndSynchronize } from "@/lib/billing/subscriptionSync";
import { getStripe } from "@/lib/billing/stripe";
import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

async function subscriptionIdFromEvent(event: Stripe.Event) {
  if (event.type.startsWith("customer.subscription.")) return (event.data.object as Stripe.Subscription).id;
  if (event.type.startsWith("invoice.")) {
    const invoice = event.data.object as unknown as { subscription?: string | { id: string } | null };
    return typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  }
  return null;
}

async function setSuspension(customerId: string, suspended: boolean, event: Stripe.Event) {
  const db = createSupabaseAdminClient();
  const { error } = await db.from("subscriptions").update({ suspended, last_event_created: event.created, last_stripe_event_id: event.id, updated_at: new Date().toISOString() }).eq("stripe_customer_id", customerId);
  if (error) throw error;
}

async function handleRiskEvent(event: Stripe.Event, stripe: Stripe) {
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const customer = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
    if (customer) await setSuspension(customer, true, event);
    return;
  }
  const dispute = event.data.object as Stripe.Dispute;
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
  const charge = await stripe.charges.retrieve(chargeId);
  const customer = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
  if (!customer) throw new Error(`Disputed charge ${chargeId} has no customer`);
  if (event.type === "charge.dispute.created") await setSuspension(customer, true, event);
  // Policy: only a dispute Stripe marks won restores access. Lost, warning_closed, or
  // otherwise closed disputes stay suspended for manual review.
  else if (dispute.status === "won") await setSuspension(customer, false, event);
}

async function processEvent(event: Stripe.Event) {
  const stripe = getStripe(); const db = createSupabaseAdminClient();
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id || session.client_reference_id;
    const customer = typeof session.customer === "string" ? session.customer : null;
    if (userId && customer) { const { error } = await db.from("subscriptions").upsert({ user_id: userId, stripe_customer_id: customer, checkout_pending_until: null }, { onConflict: "user_id" }); if (error) throw error; }
    if (session.subscription) await retrieveAndSynchronize(typeof session.subscription === "string" ? session.subscription : session.subscription.id, event, stripe);
    return;
  }
  const subscriptionId = await subscriptionIdFromEvent(event);
  if (subscriptionId) { await retrieveAndSynchronize(subscriptionId, event, stripe); return; }
  if (["charge.refunded", "charge.dispute.created", "charge.dispute.closed"].includes(event.type)) await handleRiskEvent(event, stripe);
}

export async function POST(request: Request) {
  const raw = await request.text(); const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(raw, signature, serverEnv().STRIPE_WEBHOOK_SECRET); }
  catch { return NextResponse.json({ message: "Invalid signature" }, { status: 400 }); }
  const db = createSupabaseAdminClient();
  const { data: claim, error: claimError } = await db.rpc("claim_stripe_event", { p_event_id: event.id, p_event_type: event.type, p_created: event.created });
  if (claimError) return NextResponse.json({ message: "Webhook storage failed" }, { status: 500 });
  if (claim === "processed") return NextResponse.json({ received: true, duplicate: true });
  if (claim === "busy") return NextResponse.json({ message: "Webhook is already processing" }, { status: 409 });
  try {
    await processEvent(event);
    const { error } = await db.from("stripe_events").update({ state: "processed", processed: true, processed_at: new Date().toISOString(), error: null }).eq("event_id", event.id); if (error) throw error;
    return NextResponse.json({ received: true });
  } catch (original) {
    const message = original instanceof Error ? original.message : "Processing failed";
    const { error: recordError } = await db.from("stripe_events").update({ state: "failed", processed: false, error: message }).eq("event_id", event.id);
    if (recordError) console.error("Webhook processing and error recording failed", { original: message, recording: recordError.message });
    return NextResponse.json({ message: "Webhook processing failed" }, { status: 500 });
  }
}
