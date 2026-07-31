# Silence's Overlay Maker

A production-oriented Next.js subscription app for designing and publishing animated browser-source overlays. It uses Supabase Auth/Postgres with RLS as authoritative storage and Stripe Checkout, Customer Portal, and signed webhooks for billing.

## Local development

Follow [the complete setup guide](docs/setup.md), copy `.env.example` to `.env.local`, apply `supabase/migrations/202607270001_subscription_app.sql`, then run `npm install && npm run dev`.

## Validation

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Continuous integration

GitHub Actions automatically checks pull requests to `main` with the repository's typecheck, lint, unit-test, production-build, and whitespace checks. A green CI result validates the application code only; it does not replace the separate Supabase database verification still required for PR #13.

Never expose the Supabase service role or Stripe secret in browser code. Checkout redirects do not grant access; verified Stripe webhooks update subscription state.
