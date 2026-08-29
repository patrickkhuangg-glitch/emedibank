# Exam-Prep Platform

A subscription web platform for medical-admissions exam prep. Long-term it covers
**UCAT, GAMSAT, and interview prep** — question banks, video courses, analytics,
and tutor feedback. We build the platform, not the question content.

**GAMSAT launches first.** UCAT and interview come later on the same foundation.

> The platform is **multi-exam from the schema up**. Every piece of content and
> access hangs off a row in the `exams` table — "GAMSAT" is data, never hardcoded.

## Stack

- **Next.js** (App Router, TypeScript) — Next 16, Turbopack
- **Supabase** — Postgres, Auth, Storage, Row-Level Security
- **Tailwind CSS v4** — styling
- **Vercel** — hosting

Stripe (payments) and Mux (video) arrive in later phases.

## Current status: Phase 0 — Foundations

A styled, empty shell with the core schema in place:

- Landing page and app layout with a neutral design system (`src/app/globals.css`).
- Typed Supabase clients (browser / server / admin) in `src/lib/supabase`.
- Initial schema migration in `supabase/migrations` (`exams`, `profiles`, RLS,
  new-signup trigger, seeded GAMSAT row).
- A `/status` health-check page that reads the `exams` table live from Supabase.

Auth flows, billing, courses, the question bank, analytics and the admin panel
are **not** part of Phase 0.

## Running it from a fresh clone

### Prerequisites
- Node.js 20+ and npm
- A Supabase project (see [`SETUP-ACCOUNTS.md`](./SETUP-ACCOUNTS.md))

### 1. Install
```bash
npm install
```

### 2. Configure environment
Copy the template and fill in your Supabase values:
```bash
cp .env.example .env.local
```
Then set the three variables (see `SETUP-ACCOUNTS.md` for where each lives in the
Supabase dashboard):

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, e.g. `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe publishable/anon key |
| `SUPABASE_SECRET_KEY` | Server-only secret/service_role key (never commit) |

### 3. Apply the database schema
The migration lives in [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
Apply it either way:

- **Supabase dashboard:** open the SQL Editor, paste the migration, run it.
- **Supabase CLI:** `npx supabase link --project-ref <ref>` then `npx supabase db push`.

It creates `exams` and `profiles`, enables Row-Level Security, wires the
new-signup trigger, and seeds the GAMSAT exam.

### 4. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). Visit
[http://localhost:3000/status](http://localhost:3000/status) — a green
"Database connected" pill and a table showing the **GAMSAT** row confirm the DB
connection works end to end. (Before env vars/migration are set, it shows a clear
diagnostic instead of crashing.)

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint with ESLint |

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it into Vercel (sign in with GitHub so they're linked).
3. Add the same three environment variables under **Project Settings →
   Environment Variables**.
4. Deploy. Pushes to `main` redeploy automatically.

## Project layout

```
src/
  app/
    layout.tsx        Root layout: header, footer, fonts, metadata
    page.tsx          Landing page
    globals.css       Design system (color tokens, light/dark)
    status/page.tsx   Health-check: reads exams live from Supabase
  components/         Shared UI shell (container, header, footer)
  lib/supabase/       Typed clients (client / server / admin), env, types
supabase/
  migrations/         SQL migrations (checked into the repo)
```
