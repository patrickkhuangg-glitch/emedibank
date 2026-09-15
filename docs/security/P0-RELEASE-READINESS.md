# Payment release readiness — 6 September 2026

> **9 September Zoom update:** The signature-first webhook handler is live. Removed the obsolete temporary containment rule, verified unsigned requests return 401, and completed and saved a fresh successful validation from Zoom Marketplace. The firewall remains enabled. The Zoom pause and vulnerable-handler statements below are historical; see [restoration evidence and remaining meeting verification](ZOOM-WEBHOOK-RESTORATION-2026-09-09.md).

> **8 September update:** Current-schema permission hardening and the signup-ticket gate are now live. Interview ownership, hidden draft feedback and all four credit/refund cases have passed hosted checks; shared test keys are revoked. See the [dated access and credits report](INTERVIEW-ACCESS-CREDITS-2026-09-08.md). Statements below describe the earlier release and should not be used to infer the current state of these specific items. Other release requirements remain separate.

**Release decision: NOT READY to accept payments.** The repository contains tested fixes. EMeducate website fixes and policies are deployed; Studocyte application/database fixes are not yet deployed. The independent security test and hosted recovery drill remain outstanding. Keep `PAYMENTS_ENABLED=false` and `P0_RELEASE_APPROVED=false` until every requirement below has evidence and an accountable owner.

## Live action completed

An unsigned Zoom validation request returned an HMAC from the deployed application. No forged meeting event was sent and no student record was changed. A narrow Vercel deny rule now blocks `/api/zoom/webhook` (including its trailing slash) on the project. Both public domains return 403 with `x-vercel-mitigated: deny`; the homepage and login return 200 with a browser user agent.

**Automatic Zoom lesson synchronization is paused.** Reconcile meetings that end during the pause before restoring automation. The underlying deployed code remains vulnerable until replaced.

- Rule: `rule_p0_temporary_zoom_webhook_containment_SIPDQn`
- Configuration: `waf_8bXCZYfnze1S`, version 1
- Project: `emedibank-x1uw` / `prj_8V3gHxGJPlXmPx4JvwPZIUq4RGEp`
- Evidence: [zoom-containment.live.json](zoom-containment.live.json)
- Removal: deploy and verify the signature-first handler on a protected staging deployment; deploy that reviewed fix to production; remove only this named rule in Vercel Firewall; immediately verify unsigned challenges return 401 and a genuine signed Zoom validation succeeds. Reapply the rule if verification fails. Never disable the entire firewall as rollback.

## EMeducate website publication completed

Published source commit `2647cc7` to the existing website repository and Cloudflare version `1f42af50-3540-491d-bd71-7fdba6b1b4cf`. Live checks on `emeducate.com.au` confirmed all five policy pages return 200 with the approved business details, and the homepage and policies return all required security headers. The retired public AI endpoint returns 410; a cross-site enquiry request returns 403. The subscription policy renders in a browser without reported console errors. See [emeducate-release.live.json](emeducate-release.live.json). No support email or payment was sent.

## Required evidence

| Requirement | Completed in this checkout | Still required before release |
| --- | --- | --- |
| Environment separation | Three environment templates, local development validation, payment mode/project guards | Configure isolated local development and dedicated production services; staging database declined by owner, so any staging preview must use mock data; verify data isolation |
| External security test | Local regression suite and limited benign live probes | Independent tester, written report, remediation and retest; see [test brief](EXTERNAL-SECURITY-TEST.md) |
| Database permissions | All migrations tested locally; inventory of 33 application tables and 27 application functions; restricted grants and RLS migration | Run hosted inventory and Advisor; apply reviewed migrations; test every exposed operation with anonymous, A, B and admin accounts |
| Supabase account hardening | Configuration procedure documented | Owner MFA, SSL, network restrictions feasibility, confirmed email, OTP expiry, custom SMTP and delivery tests |
| Exposed secrets | Source, reachable Git history and client bundle pattern scan: no matches | Inspect Vercel scopes, old deployments/logs/screenshots, connected providers; rotate any potentially exposed credential |
| HTTP security | Nonce CSP, framing restrictions and security headers implemented | EMeducate deployed and verified; deploy Studocyte and verify authenticated browser flows |
| Recovery | Synthetic local database dump/restore passes | Restore a hosted backup and storage bytes into isolated non-production; approve RTO/RPO and owners |
| Legal pages | Privacy, tutoring terms, subscription terms, refunds and acceptable use prepared; approved business details included | EMeducate pages published and verified; legal review of coverage, wording, overseas processing and retention still required |
| Billing identity and process | Entity, ABN, support, descriptor and no-GST treatment in website source; checkout requires terms | Configure Stripe/invoices/emails/portal, support forwarding and operational refund handling consistently |

## Accountable owner

Patrick has accepted ownership of security testing and recovery. This means coordinating the independent tester, reviewing findings and ensuring recovery drills are completed; it does not replace the independent test. A recovery deputy remains to be nominated.

## Approved addresses

Patrick approved these addresses on 6 September 2026:

| Environment | Address | Provisioning status |
| --- | --- | --- |
| Development | `http://localhost:3000` | Local app address; isolated database still to be configured |
| Staging | `https://staging.studocyte.emeducate.com.au` | Address reserved; hosted staging database declined; any preview must use mock data |
| Production | `https://studocyte.emeducate.com.au` | Existing live address; production configuration still requires audit |

Address approval does not establish database separation or payment readiness.

Supabase dashboard access was verified. The existing EMeducate organization is on Pro and has one project. Patrick declined the additional hosted staging database on 6 September 2026. No project was created and no staging database charge was incurred. The prepared dashboard form must not be submitted. Development will use a separate local Supabase instance. The staging address remains reserved for a possible mock-data preview; never reuse production database credentials there. Hosted staging provisioning requires a new user instruction.

This changes the original three-environment plan. A mock-data preview cannot validate hosted Auth, RLS, Storage, webhooks or recovery. Independent testing and the hosted restore requirement still need an isolated non-production target agreed with Patrick before those checks can be completed.

## Observed environments

The current local `.env.local` is a production Vercel export pointing at `ghxwyfiemvyhijpmrhgf.supabase.co`. It must not be used for development. The new `predev` check intentionally rejects it. Preserve credentials privately while replacing local configuration with dedicated development values.

Read-only Vercel inspection found 21 variables scoped to production and no separate development/staging variables. The configured public domains are `studocyte.emeducate.com.au` and `emedibank-x1uw.vercel.app`. The locally exported Stripe publishable key is test mode. These observations do not establish that live Stripe billing is configured correctly.

The addresses are approved above, but the staging database is explicitly declined. Configure the local development database before provisioning development app credentials. Use synthetic data; do not clone production students into developer environments. Preview deployments must use staging/test services and deployment protection. Never place `service_role`, webhook secrets, private API keys or database passwords in `NEXT_PUBLIC_*` variables.

## Rollout order

1. Confirm project/domain ownership; Patrick is the security testing and recovery owner. Configure isolated local development using the supplied template. Do not provision a hosted staging database. Keep payments closed.
2. Capture the actual production migration history and a recoverable backup. Compare hosted objects with `supabase/security-inventory.sql`; investigate drift before applying changes.
3. In the isolated local development database, rehearse prerequisites through migration 0035. Deploy the ticket-aware signup/invitation application, then activate 0036. Verify signup and invitations before proceeding. Apply 0037 and exercise all app workflows, including admin and service jobs. Do not apply 0036 ahead of its compatible application.
4. Configure `APP_ENV`, canonical site origin and expected Supabase URLs before deploying the new app. Stripe webhook mode now follows `APP_ENV`; do not deploy production mode against a test Stripe configuration. Test webhook retries, refunds and entitlement changes against isolated local services and Stripe test mode. Hosted verification still needs an agreed isolated target.
5. Complete the independent test and hosted restore drill. Resolve findings and collect evidence in this folder without credentials or personal information.
6. Review the exact release diff. This checkout also contains interview feature work and database changes; do not deploy it blindly as a webhook-only hotfix. Publish the matching reviewed code and migrations, then perform live smoke checks.
7. Align Stripe business details and portal policies, publish the legal pages on `emeducate.com.au`, verify support delivery, and test checkout/cancellation in test mode. The separate `chatgpt.site` deployment is not evidence that the custom domain was updated.
8. Record the approver, deployment identifiers, migration versions and evidence. Only then set the production payment flags true. Existing billing portal access remains available when new checkout is disabled.

## Checks and their limits

`npm run test:audit`, `npm run test:interviews`, `npm run test:security`, and `npm run test:p0` passed (22 tests). Type checking, targeted linting and production builds passed. The local inventory and synthetic restore are repeatable through `npm run audit:database` and `npm run test:p0`.

The database fixture models Supabase roles/auth/storage, but does not reproduce hosted Auth, Storage HTTP, Realtime, extensions or platform configuration. The tests cover grant/RLS structure and representative ownership cases, not every hosted allow/deny combination. The limited live probes are not an independent penetration test; a 404 for an undeployed interview route is not proof of access control. See the individual JSON evidence files for scope.

Secret scans are pattern based and cannot prove absence of exposure. They exclude ignored local environment files and do not inspect historical deployment output, private screenshots or provider logs. Do not copy secrets into evidence files.

## Primary references

- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase backups and limitations](https://supabase.com/docs/guides/platform/backups)
- [Vercel firewall API](https://vercel.com/docs/vercel-firewall/firewall-api)
- [OAIC privacy policy guidance](https://www.oaic.gov.au/privacy/your-privacy-rights/your-personal-information/what-is-a-privacy-policy)
- [ACCC consumer rights and guarantees](https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees)
