import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { ACTIVE_CONFLICT, blocksCheckout, stripeBlocksCheckout } from "@/lib/billing/checkoutGuards";
import { getStripe } from "@/lib/billing/stripe";
import { serverEnv } from "@/lib/env";
import { apiError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const user = await requireUser(); const db = createSupabaseAdminClient(); const stripe = getStripe();
    const { data: subscription, error } = await db.from("subscriptions").select("stripe_customer_id,stripe_subscription_id,status,cancel_at_period_end,current_period_end").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (blocksCheckout(subscription)) return NextResponse.json(ACTIVE_CONFLICT, { status: 409 });
    if (subscription?.stripe_subscription_id) {
      const latest = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      if (stripeBlocksCheckout(latest)) return NextResponse.json(ACTIVE_CONFLICT, { status: 409 });
    }
    const { data: claimed, error: claimError } = await db.rpc("claim_checkout", { p_user_id: user.id });
    if (claimError) throw claimError;
    if (!claimed) return NextResponse.json({ code: "CHECKOUT_IN_PROGRESS", message: "A Checkout is already in progress. Please finish it or manage billing in the portal." }, { status: 409 });
    let customer = subscription?.stripe_customer_id;
    if (!customer) {
      const created = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } }, { idempotencyKey: `customer-${user.id}` }); customer = created.id;
      const { error: upsertError } = await db.from("subscriptions").upsert({ user_id: user.id, stripe_customer_id: customer, status: "free" }, { onConflict: "user_id" }); if (upsertError) throw upsertError;
    }
    const env = serverEnv();
    const session = await stripe.checkout.sessions.create({ mode: "subscription", customer, line_items: [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }], success_url: `${env.NEXT_PUBLIC_APP_URL}/billing?checkout=success`, cancel_url: `${env.NEXT_PUBLIC_APP_URL}/billing?checkout=canceled`, client_reference_id: user.id, metadata: { supabase_user_id: user.id }, subscription_data: { metadata: { supabase_user_id: user.id } }, allow_promotion_codes: true }, { idempotencyKey: `checkout-${user.id}-${Math.floor(Date.now() / 900000)}` });
    return NextResponse.json({ url: session.url });
  } catch (error) { return apiError(error, 401); }
}
