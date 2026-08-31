# EMediBank — Pre-launch checklist

Things to do before opening the platform to the public. Checked items are done and
verified; the rest are outstanding.

## Infrastructure & performance
- [x] **Co-locate Vercel functions with Supabase (Sydney / `syd1`).** Set in
      `vercel.json` (`regions: ["syd1"]`). Verified live: `x-vercel-id: syd1::syd1`.
      Cut pricing TTFB from ~2s to ~0.5s.
- [ ] **Supabase Pro (~US$25/mo).** The free tier **auto-pauses the database after
      inactivity**, so the first request after an idle period is a 5–10s cold start.
      Pro removes the pause and adds compute headroom, higher API limits, and daily
      backups. **Do this before launch.**
- [ ] **Vercel Pro (~US$20/mo).** Higher concurrency, Fluid Compute (fewer cold
      starts under load), longer function limits, and Speed Insights.
- [ ] **Enable Vercel Speed Insights / Web Analytics** to watch real-user latency
      once traffic arrives, and optimise with data.
- [ ] *(Optional, further crispness)* Make marketing pages static/ISR instead of
      `force-dynamic` (near-instant homepage); turn the per-question session fetch
      into a single bulk query (helps session start under concurrency).

## Payments (Stripe) — currently SANDBOX
- [ ] Switch to **LIVE** keys (`pk_live` / `sk_live`) in Vercel env.
- [ ] Create a **LIVE webhook** endpoint → `/api/stripe/webhook`; set
      `STRIPE_WEBHOOK_SECRET`.
- [ ] Reseed products/prices in LIVE mode (`npm run seed:stripe` against live).
- [ ] Test a real subscribe → unlock and cancel → revoke against the live webhook.

## Video (Mux) — currently SANDBOX
- [ ] Add `MUX_*` env vars to Vercel (copy from `.env.local`).
- [ ] Point the Mux webhook at the prod domain.
- [ ] Confirm a video explanation plays in production for a subscriber.

## Content
- [ ] Fill the UCAT bank: **Decision Making, Quantitative Reasoning, Situational
      Judgement** (Verbal Reasoning is done — 20 questions).
- [ ] Add **GAMSAT** and **ISAT** content.
- [ ] Verify official UCAT section question **counts + timings**; reconcile
      `lib/practice/timing` (VR 22) vs `lib/mock/config` (VR 21).
- [ ] Assemble the free full **mock exams** once sections are populated.

## Deferred features (need a small persistence table)
- [ ] Streak-freeze / repair tokens (dashboard already has the UI slot).
- [ ] Interactive skill tree (mastery map is read-only today).

## Security (from the pre-launch review)
- [x] **DONE — ran `supabase/migrations/0008_lock_profile_role.sql`** (2026-08-31).
      Closed a confirmed privilege-escalation hole (a signed-in user could
      self-promote to `admin` via the public key). Verified: escalation now fails
      with `42501 permission denied`; role stays `student`; legitimate `full_name`
      edits still succeed. NOTE: the first version (a column-level `REVOKE UPDATE
      (role)`) was a no-op against Supabase's table-wide UPDATE grant; the shipped
      fix revokes table-level UPDATE and re-grants UPDATE on only `full_name`.
- [x] `server-only` guard added to the service-role client; baseline security
      headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
      Permissions-Policy) added in `next.config.ts`.
- [ ] Add a tuned **Content-Security-Policy** (left out for now to avoid breaking
      Mux/Supabase and inline styles).
- [ ] After launch, review Supabase Auth rate-limits / email-confirmation settings.

## Pre-flight
- [ ] Remove leftover comp entitlements / test data from the DB.
- [ ] Confirm Supabase auth redirect URLs + email templates point at the prod domain.
- [ ] Legal: terms, privacy, and refund-policy pages linked in the footer.
