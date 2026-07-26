# Production setup

## Supabase
1. Create a Supabase project and set the public URL, anon key, and server-only service-role key.
2. Create `projects`, `overlays`, `subscriptions`, and `stripe_events` tables. Store project/overlay snapshots as `jsonb`; make `overlays.public_id` unique.
3. Enable RLS on every table. Owners may read/write only rows whose `owner_id = auth.uid()`. Do not add a public SELECT policy for overlays; fetch public overlays through a server function/service role after entitlement checks.
4. Create a private `overlay-assets` bucket with user-scoped upload/read policies. Validate MIME magic bytes, size, and image dimensions in an upload route.
5. Configure the application URL and authentication redirect URLs. Apply migrations through the Supabase CLI in each environment.

## Stripe
1. Create the Pro recurring Price and put its ID in deployment configuration.
2. Create Checkout and Customer Portal configurations, with return URLs under `NEXT_PUBLIC_APP_URL`.
3. Register `/api/billing/webhook` for checkout, customer subscription, invoice, refund, and dispute events; save its signing secret as `STRIPE_WEBHOOK_SECRET`.
4. Persist webhook event IDs transactionally for idempotency. Synchronize subscription status, current paid-period end, and cancellation state into Supabase.
5. Keep Stripe secrets server-only. Test active, cancel-at-period-end, payment grace, recovery, refund, and expired-link cases with Stripe test clocks before launch.
