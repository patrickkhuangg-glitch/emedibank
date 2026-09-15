# Account email repair — 6 September 2026

The public beta now uses branded Studocyte invitation, password recovery, sign-in and signup confirmation emails. The email button opens a branded confirmation page; only a deliberate Continue submission verifies the single-use link. A preview/scanner GET cannot consume it. Password setup opens the existing password form, and sign-in selects the account’s student, tutor or admin home.

## Cause and changes

The live invitation template used a token-hash callback, while recovery, magic-link and signup templates still used Supabase’s default ConfirmationURL. Those links can return fragment credentials that a server callback cannot read, or a PKCE code dependent on the originating browser. The previous callback also verified token hashes immediately on GET and sent every failure to a generic login error.

- `src/app/auth/confirm/route.ts` serves a standalone, no-script confirmation page and verifies on same-origin POST. No-store and no-referrer headers prevent caching and referrer leakage. POST bodies are bounded, email purposes are allowlisted and destinations are restricted to existing account routes. Existing PKCE callbacks remain supported when the original verifier cookie is present.
- `src/lib/auth/email-links.ts` contains the email-link parser, destinations and branded page. Invalid, expired or already-used links offer a fresh password email and a sign-in link.
- `supabase/templates/` contains four email templates and their subjects. They use `TokenHash` links that work across devices, a text wordmark, purple button, mobile-friendly table layout and the EMeducate support address. No image download is required for the branding.
- `scripts/configure-auth-emails.mjs` patches and verifies only those four templates and subjects. It checks that the existing SMTP and redirect settings are preserved. SMTP credentials, sender address, existing email-change/security notification templates and production environment variables are untouched.
- `tests/auth-email-links.test.ts` and `scripts/verify-auth-email-links.mjs` cover the link flow. The hosted script generates links without sending emails and deletes its disposable accounts.

## Verification

- Four local email test groups and all 33 interview test groups pass.
- Full lint in the main and isolated release directories passes with no errors; the existing image-optimisation warning in `past-session-review.tsx` remains.
- Full local webpack production build and hosted default Turbopack production build pass.
- Hosted tests verify new invitation -> actual website password form -> password sign-in; recovery of a newly created unconfirmed admin -> actual password form -> password sign-in, preserving its role; fresh-browser student/tutor/admin sign-in and correct destinations; and signup confirmation.
- Each hosted flow tests repeated GET previews, foreign-origin POST rejection before token use, successful session cookies and destination access, and replay rejection. Malformed/oversized POSTs are also rejected.
- Invitation email layout inspected in a browser using a dummy preview link. The branded confirmation page and explicit expired-link recovery were also checked on the public custom domain. This is not a claim of rendering in every email client.
- No real recipient emails were sent in testing, and no real user password or role was changed. Actual inbox delivery is not independently verified; the existing SMTP transport remains in use.

## Operator use and configuration

Resend the account email after this release, or request a fresh email at https://studocyte.emeducate.com.au/reset-password. Previously delivered messages keep their old appearance and links. The recipient should open the newest message, select its button, select Continue on Studocyte, then choose a password if prompted.

To reapply the templates, sign in to the Supabase CLI, then run:

```sh
node scripts/configure-auth-emails.mjs --project=ghxwyfiemvyhijpmrhgf --apply
```

The script reads the management token in memory from the CLI’s macOS keychain, or from an operator-provided `SUPABASE_ACCESS_TOKEN`. It does not print or save credentials. The existing project needs its configured custom SMTP sender, site URL `https://studocyte.emeducate.com.au`, allowed public-site redirects, and the application’s existing Supabase credentials. No new paid service or environment variable is required.

If a valid newly requested email still fails, capture the time, recipient address and which action sent it, then inspect the auth/SMTP logs. Do not paste the full one-use URL into logs or support messages. Previously issued fragment links cannot be repaired inside an already delivered message.

## Release and rollback

The active deployment and exact file hashes are recorded in `MOCK-INTERVIEWS-BETA-RELEASE-MANIFEST.json`. This update uses the existing isolated release directory and preserves unrelated main-worktree changes. No Git push, database migration or production environment change was made. Reconcile the release with the production Git branch before its next automatic deployment.

The prior template subjects/content are archived in `AUTH-EMAIL-TEMPLATES-PREVIOUS.json`; this contains no credentials. If rollback is required, patch only those eight fields through Supabase’s management API. Do not restore an entire auth configuration or overwrite SMTP settings. The previous application deployment is `dpl_Ey6hJKFcHd8EYPFGD4wdAZgCkUxW`. It can process the new token-hash emails on GET, but loses the scanner-safe confirmation step and helpful error page. Restore the application and templates deliberately; reverting to the old default emails reintroduces the reported failure risk.
