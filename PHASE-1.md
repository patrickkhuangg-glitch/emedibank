# PHASE 1 — Accounts & the Paywall (EMediBank)

Build spec for Claude Code. Read `CLAUDE.md` first, then this. Do not start until
Phase 0's definition of done is met and I've confirmed.

## Product context (recap)

**EMediBank** is a subscription platform for medical/health admissions exam prep.
It covers four exams: **UCAT, GAMSAT, ISAT, and Interviews**. Each exam will eventually
offer a **question bank, timed mock exams, video courses, and analytics** (and, later,
tutor feedback). We build the platform; content comes later, exam by exam.

Phase 1 builds none of that content. Phase 1 builds the **commercial core**: people can
create an account, use a **free tier**, or pay, and access is correctly gated —
**down to the subtest level**. Everything else plugs into this entitlement layer later.

## Access model (confirmed)

- **Free tier** — a signed-up user gets access to a **limited set of subtests**, chosen
  per exam by an **admin** (customisable, not hardcoded). Everything else shows an
  upgrade prompt.
- **Paid** — **monthly and yearly** subscriptions that unlock the **full exam** (all its
  subtests). Per-exam plans + an **all-access bundle** across all four exams.
- A **free trial** of a paid plan (time-boxed full access) can layer on via Stripe's
  trial period — architecture is the same; confirm trial length before Products are made.

> The single access question the app answers is:
> **"Can this user reach this subtest?"** → *yes if the subtest is flagged free, OR the
> user has an active entitlement covering that subtest's exam.*

---

## First, extend the Phase 0 seed

**Exams** — populate all four so the dimension is complete (which are `active` for launch
is a separate content decision):

| name | slug | kind |
|---|---|---|
| UCAT | ucat | mcq |
| GAMSAT | gamsat | mcq |
| ISAT | isat | mcq |
| Interviews | interviews | interview |

**Subtests** — new table, because free-tier access is granted at this level. Each row:
`id`, `exam_id →`, `name`, `slug`, `is_free` (bool, **admin-customisable**), `sort_order`.
Ask me to confirm each exam's exact subtest list before seeding (structures change) —
e.g. GAMSAT = Section 1 / Section 2 / Section 3; ISAT = its two reasoning sections;
UCAT = its cognitive subtests; Interviews = station categories. Seed with all
`is_free = false`; admins turn free ones on.

> `kind` still drives later behaviour (mcq → bank + mocks; interview → recording).
> `is_free` on a subtest is what the free tier reads.

---

## Build

### 1. Authentication
- Supabase Auth: **email/password** + **Google OAuth**.
- Sign up, log in, log out, password reset, email verification.
- Confirm the Phase 0 trigger creates a `profiles` row on signup (role defaults to
  `student`). Add it here if not already done.
- Protected routes redirect unauthenticated users to login. **Signing up is free** and
  immediately grants the free-tier subtests — no card required.

### 2. Subscription & entitlement model
Tables that record *what a user can access*:

- **products** — mirrors Stripe: `id`, `stripe_product_id`, `name`, `kind`
  (`exam` | `bundle`), optional `exam_id →` (null for all-access).
- **subscriptions** — `user_id`, `stripe_customer_id`, `stripe_subscription_id`,
  `status` (`trialing`|`active`|`past_due`|`canceled`), `current_period_end`,
  `price_id`, `product_id →`.
- **entitlements** (derived — the paid access the app checks) — `user_id`, `exam_id →`,
  `source` (`subscription`|`bundle`|`comp`), `expires_at`. A helper resolves an active
  subscription into exam entitlements (per-exam sub → that exam; bundle → all exams).

Free access is **not** stored per user — it's read live from `subtests.is_free`, so an
admin toggling a subtest instantly changes what every free user sees.

### 3. Access helper (the heart of Phase 1)
One server-side function, used everywhere, never trusted from the client:

```
canAccessSubtest(userId, subtestId):
    subtest = load(subtestId)
    if subtest.is_free: return true
    return hasActiveEntitlement(userId, subtest.exam_id)
```

Also expose `canAccessExam(userId, examId)` for exam-level gates. Locked content shows an
**upgrade prompt**, not a 404.

### 4. Stripe integration
- Create Products/Prices (Stripe dashboard or a seeding script — ask me which). One
  Product per exam + one All-Access; **monthly + yearly** Prices each; optional trial.
- **Checkout**: server route creates a Checkout Session for the chosen Price, tied to the
  user's `stripe_customer_id` (create the customer on first checkout).
- **Billing portal**: route opens the Stripe customer portal (upgrade, cancel, card).
- **Webhook** (`/api/stripe/webhook`): verify signature; handle
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`. Each updates
  `subscriptions` and recomputes `entitlements`. Idempotent on retries.

### 5. Row-Level Security (enforce, don't just enable)
- `subscriptions`, `entitlements`: user reads **only their own**; only the service role
  (webhook) writes them.
- `exams`, `subtests`, `products`: readable by anyone (public catalogue + free flags);
  writable by **admin** only.
- Verify each policy with a test as a non-owner and as a free vs paid user.

### 6. Screens for this phase
- **Pricing page** (public): four exams + all-access bundle, **monthly/yearly toggle**,
  what the free tier includes, "Start free" (signup) and "Subscribe" (checkout).
- **Auth screens**: sign up, log in, reset.
- **Account & billing**: current plan(s), which exams/subtests are unlocked, "Manage
  billing" → portal.
- **Admin: free-tier control** — per exam, toggle each subtest's `is_free`. Minimal but
  real; this is how you tune the free offering without a developer.
- **Gated placeholders** per exam/subtest proving gating works: free subtests open, paid
  ones show the upgrade prompt. No real content yet.

---

## Do NOT build in Phase 1
Video courses, the question bank, the **mock exam engine**, analytics, tutor feedback,
interview recording, essay submissions. Phase 1 ends the moment access control — free
tier + paid, at subtest granularity — is correct. Resist wiring content in.

## Definition of done
- A new user signs up free and can reach exactly the **admin-flagged free subtests**,
  nothing more.
- An admin toggles a subtest's `is_free`; free users' access changes immediately.
- A user subscribes (monthly or yearly, per-exam or bundle) and gains full access to the
  right exam(s); cancelling via the portal revokes it automatically (verify with a real
  Stripe test-mode webhook event).
- A non-entitled user cannot reach paid subtests **via the API**, not just the UI (test
  directly).
- All new tables have RLS with policies verified across free/paid/admin.
- `.env.example` updated with every Stripe var; secrets only in `.env.local` / Vercel.
- Works on mobile.

## What I (the human) will provide — ask when you need them
- **Stripe** (test mode): publishable key, secret key, webhook signing secret.
- **Confirmed subtest lists** per exam, and which are free by default.
- **Pricing numbers + trial length** before Products are created.
- **Google OAuth** credentials for Supabase Auth (client id + secret), or the redirect
  URLs to whitelist.

New env vars expected:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

When the definition of done is met, stop, summarise what a user can now do end to end
(free and paid), and wait for me before Phase 2 (course delivery).
