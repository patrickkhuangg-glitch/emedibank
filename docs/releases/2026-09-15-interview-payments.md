# Interview payments staging release — 15 September 2026

This branch records the application source deployed to the Studocyte staging environment after the interview payment catalogue hotfix.

## Hosted release

- Staging domain: `https://staging.studocyte.emeducate.com.au`
- Vercel deployment: `dpl_4P94nqFTQ5gYKkKhLwqoDQjTzot5`
- Supabase project: `gwlplbtxmhgttsgywvky`
- Stripe account: Studocyte Staging sandbox (`acct_1UFZ6KBhqTAz8OkO`)
- Environment safeguards: `APP_ENV=staging`, `PAYMENTS_ENABLED=false` by default; payments must be deliberately enabled for the isolated staging environment.

## Interview catalogue

| Offer | Price | Credits | Access | Stripe lookup key |
| --- | ---: | ---: | ---: | --- |
| Interview Core | A$199 | 6 | 365 days | `studocyte_interview_core_aud_2026` |
| Interview Pro | A$349 | 18 | 365 days | `studocyte_interview_pro_aud_2026` |
| Interview Intensive | A$599 | 36 | 365 days | `studocyte_interview_intensive_aud_2026` |
| 6 review credits | A$99 | 6 | Existing paid access required | `studocyte_interview_credits_6_aud_2026` |
| 12 review credits | A$189 | 12 | Existing paid access required | `studocyte_interview_credits_12_aud_2026` |
| 24 review credits | A$359 | 24 | Existing paid access required | `studocyte_interview_credits_24_aud_2026` |

All offers are one-time Stripe prices. They do not create automatically renewing subscriptions. A full reviewed MMI or panel mock uses 12 credits. Interview purchases never grant GAMSAT essay-marking credits.

## Database changes

Apply migrations in order:

1. `0073_interview_purchase_entitlement_source.sql`
2. `0074_interview_one_off_purchases.sql`

The purchase ledger is idempotent by Stripe Checkout session. The security-definer grant function validates the catalogue again in the database and cannot be executed by students.

## Reproduction and verification

1. Configure the isolated staging environment variables and database.
2. Run `npm run seed:interview-offers` with the Stripe sandbox secret key.
3. Run `npm run test:p0` and `npm run test:interviews`.
4. Run `npm run build`.
5. Deploy to the Vercel `staging` target.
6. Run `npm run check:staging -- https://staging.studocyte.emeducate.com.au`.
7. From a paid staging account, verify each plan/add-on opens the matching Stripe sandbox Checkout amount. Do not complete a charge outside an authorised sandbox acceptance test.

The A$199 Core path was verified on the hosted staging deployment through to Stripe Checkout. No payment was submitted during release verification.
