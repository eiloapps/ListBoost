# ListBoost

ListBoost is a Vite + React + TypeScript app that generates Etsy SEO listings with Gemini, authenticates users with Supabase Auth, and upgrades plans through Lemon Squeezy subscriptions.

## Environment Variables

Create a local `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
LEMONSQUEEZY_API_KEY=your_lemonsqueezy_api_key_here
LEMONSQUEEZY_STORE_ID=your_lemonsqueezy_store_id_here
LEMONSQUEEZY_WEBHOOK_SECRET=your_lemonsqueezy_webhook_secret_here
LEMONSQUEEZY_PRO_VARIANT_ID=your_pro_variant_id_here
LEMONSQUEEZY_UNLIMITED_VARIANT_ID=your_unlimited_variant_id_here
```

Required:

- `GEMINI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- all `LEMONSQUEEZY_*` variables

## Plans

- `free`: 3 credits total for the lifetime of the account
- `pro`: 50 credits per billing month
- `unlimited`: unlimited generations per billing month

Free credits never reset. Pro credits reset to 50 when a new paid billing cycle succeeds. Unlimited never decrements credits while the subscription is active.

## Supabase

The billing table and webhook idempotency table are created in:

- [supabase/migrations/20260417_listboost_billing.sql](C:/Users/ilayd/Downloads/listing-boost-engine-main/supabase/migrations/20260417_listboost_billing.sql)

That migration:

- creates `public.user_credits`
- creates `public.webhook_events`
- preserves lifetime free credits with `free_credits_remaining`
- inserts a default Free row for every new auth user
- enables RLS for user-facing reads and updates

## Backend Routes

These routes are mounted through the existing Vite middleware setup in:

- [vite.config.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/vite.config.ts)

Routes:

- `/api/generate-listing`
- `/api/create-checkout`
- `/api/lemonsqueezy-webhook`

Main server files:

- [server/api-middleware.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/api-middleware.ts)
- [server/create-checkout-middleware.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/create-checkout-middleware.ts)
- [server/lemonsqueezy-webhook-middleware.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/lemonsqueezy-webhook-middleware.ts)
- [server/lemonsqueezy.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/lemonsqueezy.ts)
- [server/credits.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/credits.ts)

## Gemini Generation

Gemini generation still runs through:

- [server/generate-listing.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/generate-listing.ts)
- [server/gemini.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/gemini.ts)
- [server/prompts.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/prompts.ts)

The frontend sends the uploaded image as a base64 data URL, and the backend forwards it to Gemini as `inline_data`.

## Lemon Squeezy Integration

Checkout creation happens in:

- [server/create-checkout-middleware.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/create-checkout-middleware.ts)

The checkout request sends `user_id`, `email`, and `plan` as custom data so the webhook can map the purchase back to the correct ListBoost account.

Webhook verification and subscription syncing happen in:

- [server/lemonsqueezy-webhook-middleware.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/lemonsqueezy-webhook-middleware.ts)
- [server/lemonsqueezy.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/lemonsqueezy.ts)

Handled events:

- `subscription_created`
- `subscription_updated`
- `subscription_payment_success`
- `subscription_cancelled`
- `subscription_expired`

## Frontend Billing UI

Pricing UI:

- [src/components/landing/PricingSection.tsx](C:/Users/ilayd/Downloads/listing-boost-engine-main/src/components/landing/PricingSection.tsx)

Dashboard credit status:

- [src/pages/Dashboard.tsx](C:/Users/ilayd/Downloads/listing-boost-engine-main/src/pages/Dashboard.tsx)

Behavior:

- Free button goes to `/dashboard`
- Pro and Unlimited buttons create a real Lemon Squeezy checkout
- Generate is blocked when Free or Pro credits reach zero
- Unlimited skips credit decrement

## Run

```bash
npm run dev
```

## Production Notes

- On Vercel, set all environment variables in Project Settings -> Environment Variables.
- Set the Lemon Squeezy webhook URL to `https://your-domain.com/api/lemonsqueezy-webhook`.
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is server-only and never exposed as a `VITE_` variable.
