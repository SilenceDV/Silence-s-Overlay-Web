# Production setup

## 1. Supabase

1. Create a Supabase project. Copy its Project URL, anon key, and service-role key into the matching environment variables.
2. Install/login to the Supabase CLI, link the repository (`supabase link --project-ref YOUR_REF`), then apply `supabase/migrations/202607270001_subscription_app.sql` with `supabase db push`. The migration creates profiles, projects, overlays, subscriptions, Stripe event receipts, assets, ownership indexes, the signup profile trigger, and RLS policies.
3. In Authentication → URL Configuration, set the production Site URL and add `http://localhost:3000/api/auth/callback` and `https://YOUR_DOMAIN/api/auth/callback` as redirect URLs. Enable email/password auth and email confirmation.
4. Create a **private** Storage bucket named `overlay-assets`. Add policies scoped to `(storage.foldername(name))[1] = auth.uid()::text`. Keep the 8 MB application limit and allow PNG, JPEG, and WebP only. (The current editor stores image data in validated project snapshots; use this bucket before increasing image limits.)

## 2. Stripe

1. In Stripe test mode create a product named **Silence Overlay Maker Pro** and a recurring monthly or annual Price. Set its `price_...` identifier as `STRIPE_PRO_PRICE_ID`; the browser cannot choose a price.
2. Enable Customer Portal and allow payment-method updates, cancellation at period end, and subscription renewal. Checkout Sessions are created by `/api/billing/checkout` in subscription mode.
3. Install Stripe CLI. Run `stripe login`, then `stripe listen --forward-to localhost:3000/api/billing/webhook`. Put the displayed `whsec_...` in `STRIPE_WEBHOOK_SECRET`.
4. In production, create a webhook endpoint `https://YOUR_DOMAIN/api/billing/webhook` for: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `charge.refunded`, `charge.dispute.created`, and `charge.dispute.closed`. Store its production signing secret.

## 3. Environment and Vercel

Copy `.env.example` to `.env.local` and set all values. In Vercel → Project → Settings → Environment Variables, add the same names separately for Preview and Production. `NEXT_PUBLIC_APP_URL` must be the exact HTTPS origin with no path. `PAYMENT_GRACE_PERIOD_DAYS` is normally `3`. Never prefix service-role or Stripe secrets with `NEXT_PUBLIC_`. Redeploy after changing variables.

## 4. Acceptance testing

1. Sign up at `/signup`, follow the verification email, log in at `/login`, and confirm signed-out access to `/dashboard` redirects to login.
2. Create a project, edit it, wait for “Saved,” reload it, rename/duplicate/delete it, and verify a second free slide shows the upgrade prompt and a direct two-slide API save returns `PRO_REQUIRED`.
3. From `/billing`, start Checkout with Stripe test card `4242 4242 4242 4242`. Wait for the webhook (the success redirect itself grants nothing), then confirm the page reports Pro.
4. Publish from `/dashboard`, copy `/o/{publicId}`, and add it as a browser source. Modify and republish to update the same URL. Disable it and regenerate its ID to confirm the old ID becomes transparent.
5. In Customer Portal cancel at period end. Confirm Pro remains active until `current_period_end`. Use a Stripe test clock to advance beyond it and confirm the public overlay becomes transparent on its five-minute status recheck while the project remains stored.
6. With Stripe test clocks or test payment methods, trigger `invoice.payment_failed`; confirm grace access and its warning, advance beyond `grace_period_end`, and confirm deactivation. Pay the invoice/resubscribe and confirm the same public link recovers after revalidation.
7. Trigger test refund and dispute webhooks and verify suspension policy. Close a dispute and send a subsequent subscription update to restore authoritative state.

## 5. Deploy

Run `npm install`, `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`. Push the committed branch connected to Vercel, apply the migration to production, configure the production webhook, deploy, and repeat the acceptance tests against the deployed HTTPS routes.

## Billing concurrency migration and dispute policy

Apply all pending migrations with `supabase db push`, including `202607270002_billing_concurrency.sql`. It adds atomic Checkout/event claims, retry leases, and atomic project rename support. A new dispute suspends access immediately. A closed dispute restores access only when Stripe reports `won`; all other outcomes remain suspended for manual review.
