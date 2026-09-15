# Studocyte staging environment

The staging environment is a long-lived, production-shaped test system with its
own Vercel target and Supabase database. It must never use production data,
production service credentials or live payment keys.

## Architecture

| Layer | Staging choice | Isolation rule |
|---|---|---|
| Application | Vercel custom environment `staging` | `APP_ENV=staging`; production target is rejected |
| URL | `https://staging.studocyte.emeducate.com.au` | Never used as a production callback |
| Database/Auth/Storage | Dedicated, data-less Supabase project in Sydney | URL must differ from `PRODUCTION_SUPABASE_URL` |
| Payments | Stripe test mode, disabled by default | Live keys fail validation |
| Analytics and outbound providers | Disabled by default | Add only isolated test credentials |
| Search | `noindex`, `nofollow`, no sitemap | Enforced in metadata, `robots.txt` and response headers |

Vercel Pro includes one custom environment per project. A separate Supabase Micro
project has ongoing compute usage; confirm its current price and account budget
before creating it.

## Provisioning

1. Create a fresh Supabase project named `studocyte-staging` in
   `ap-southeast-2`. Do not clone production data.
2. Link the project temporarily and apply every checked-in migration in order.
   Keep the production project reference recorded separately and re-link local
   development afterward if needed.
3. In Supabase Auth, set the site URL to the staging origin and allow only the
   staging auth callback URLs. Use a non-production SMTP sender or keep outbound
   email disabled until one exists.
4. Create a Vercel custom environment named `staging`. Track only the persistent
   `staging` Git branch and attach the staging domain.
5. Add every value from `.env.staging.example` to that target. Supabase secret
   keys and provider credentials must be marked sensitive. Keep payments,
   recording/marking workers and outbound integrations disabled initially.
6. Add the staging hostname in Cloudflare as the exact DNS record Vercel requests,
   with Vercel terminating TLS.
7. Deploy to the custom target, then run:

   ```sh
   npm run check:staging -- https://staging.studocyte.emeducate.com.au
   ```

## Required acceptance

- `/api/health` returns HTTP 200 with environment, isolation and database checks
  all `ok`; it never returns credentials or provider errors.
- The page has the persistent staging strip, `X-Robots-Tag: noindex`, and a
  crawler-blocking `robots.txt` without a sitemap.
- Sign in, password recovery and OAuth return only to the staging origin.
- Synthetic student A cannot read student B's profile, attempts, recordings,
  essays, notes or feedback. Anonymous users cannot read private rows or media.
- Stripe uses test mode only. No live charge, production email, Zoom booking,
  calendar write, AI call, alert or backup job is possible while its staging
  feature flag/credential is absent.
- A fresh schema rebuild from `supabase/migrations` succeeds before staging is
  considered reproducible.

## Promotion discipline

Staging is a verification target, not a source of truth. Commit schema changes as
new migration files, test them against staging, then promote the reviewed code and
migrations to production. Never copy staging users or test records into production,
and never move a built artifact between environments: Next.js freezes
`NEXT_PUBLIC_*` values during the build. Each target must build from source with
its own variables.
