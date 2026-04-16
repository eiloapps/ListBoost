# ListBoost AI Generator

This project now uses a backend-powered Gemini AI flow to generate Etsy SEO listings from:

- uploaded product image
- selected product type
- structured seller inputs

## Setup

1. Create a local `.env` file in the project root.
2. Add:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

`GEMINI_API_KEY` is required. `GEMINI_MODEL` is optional.
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required for auth.
Backend helpers also support `SUPABASE_URL` and `SUPABASE_ANON_KEY`, and fall back to the `VITE_` versions when needed.

## Run

```bash
npm run dev
```

The app UI stays the same, but the generator now calls a server-side route during Vite dev/preview.

## Supabase Auth

The current auth flow now uses Supabase Auth with persistent sessions.

Files changed for auth:

- [src/lib/supabase.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/src/lib/supabase.ts)
- [src/components/AuthProvider.tsx](C:/Users/ilayd/Downloads/listing-boost-engine-main/src/components/AuthProvider.tsx)
- [src/components/ProtectedRoute.tsx](C:/Users/ilayd/Downloads/listing-boost-engine-main/src/components/ProtectedRoute.tsx)
- [src/components/AuthModal.tsx](C:/Users/ilayd/Downloads/listing-boost-engine-main/src/components/AuthModal.tsx)
- [src/components/Navbar.tsx](C:/Users/ilayd/Downloads/listing-boost-engine-main/src/components/Navbar.tsx)
- [src/App.tsx](C:/Users/ilayd/Downloads/listing-boost-engine-main/src/App.tsx)
- [src/pages/Dashboard.tsx](C:/Users/ilayd/Downloads/listing-boost-engine-main/src/pages/Dashboard.tsx)

Where to configure email auth:

1. Open your Supabase dashboard.
2. Go to `Authentication` -> `Providers` -> `Email`.
3. Enable email/password auth.
4. Turn on email confirmation so new users must verify before logging in.
5. In `Authentication` -> `URL Configuration`, set your site URL and local redirect URL.

## One-Time Free Trial

Each authenticated user gets exactly 1 free generation for the lifetime of the account.

Database table expected in Supabase:

```sql
create table if not exists public.user_free_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  has_used_free_trial boolean not null default false
);

alter table public.user_free_trials enable row level security;

create policy "users can view own trial row"
on public.user_free_trials
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert own trial row"
on public.user_free_trials
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can update own trial row"
on public.user_free_trials
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Behavior:

- first successful generation sets `has_used_free_trial` to `true`
- future generations are blocked with:
  `You’ve used your free listing. Upgrade to continue.`
- this is tied to the authenticated user account and does not reset daily or monthly

## Main AI Prompt Location

The main AI prompts are stored in:

- [server/prompts.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/prompts.ts)

This file contains the Gemini Etsy SEO prompt.

## Backend Route

The backend route is mounted at:

- `/api/generate-listing`

Implementation files:

- [server/api-middleware.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/api-middleware.ts)
- [server/generate-listing.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/generate-listing.ts)
- [server/gemini.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/gemini.ts)
- [vite.config.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/vite.config.ts)

## Gemini API Call

The Gemini API call is made in:

- [server/gemini.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/gemini.ts)

The listing request is assembled in:

- [server/generate-listing.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/server/generate-listing.ts)

## How The Image Is Sent

The frontend reads the uploaded file as a base64 data URL and sends it to the backend route.

The backend converts that data URL into Gemini `inline_data` and sends the image together with the structured text prompt in a single `generateContent` request.

The AI returns structured JSON only in this format:

```json
{
  "seo_title": "",
  "description": "",
  "tags": ["", "", "", "", "", "", "", "", "", "", "", "", ""]
}
```

## Validation

Output validation lives in:

- [src/lib/etsy-listing.ts](C:/Users/ilayd/Downloads/listing-boost-engine-main/src/lib/etsy-listing.ts)

It validates:

- non-empty title
- non-empty description
- exactly 13 tags
- normalized Etsy-friendly tags
- title length trimming

## Notes

- The selected product type is authoritative.
- The uploaded image is sent to Gemini as inline base64 image data when available.
- The API key stays server-side and is never exposed to the browser.
