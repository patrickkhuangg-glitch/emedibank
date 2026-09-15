# Studocyte staging release acceptance — 15 September 2026

## Release identity

- Release branch: `codex/staging-release-2026-09-15`
- Reproducible source baseline: `4aaae5c`
- Current staging deployment: `dpl_L2QrMSvjbqz8UAtKhRArw2ypeSvg`
- Staging origin: `https://staging.studocyte.emeducate.com.au`
- Production was not changed during this acceptance pass.

## Completed checks

| Area | Result | Evidence |
| --- | --- | --- |
| Staging isolation | Pass | Health reports staging and its dedicated database; crawler blocking and staging banner verified. |
| Single-device sign-in | Pass | A disposable account signed in from two independent sessions. The second session became current; the first was immediately redirected to `login?error=session_replaced`. The account and session fixture were removed. |
| Two-student privacy | Pass | Candidate, examiner and outsider fixtures verified hashed invite codes, owner-only room access, hidden prompts before preparation, and direct-table isolation. All fixtures were removed. |
| Bounded public-page load | Pass | 120 requests at concurrency 8: 0 failures, 9.75 requests/second, p50 748 ms, p95 1,272 ms, p99 2,021 ms, maximum 2,184 ms. This is a smoke/load check, not a capacity forecast. |
| Billing lifecycle | Pass | In Stripe sandbox, **Manage billing** opened the correct customer portal; cancellation delivered `customer.subscription.deleted` with HTTP 200 and removed paid access; a forced failed payment delivered `invoice.payment_failed` with HTTP 200 and did not grant access; a successful resubscription delivered `customer.subscription.created` with HTTP 200 and restored full interview access. Interview credits remained 25 and no essay credits were added. |
| Subscription display | Pass | Cancelled, incomplete, expired-incomplete and unpaid subscriptions now show **No renewal** instead of the misleading **Renews** label. A regression test covers the status mapping, and the corrected active/cancelled labels were verified in the deployed staging account UI. |
| Billing lifecycle logic | Pass | Tests cover active, trialling, past-due, cancelled, unpaid, incomplete, expired-incomplete and paused status mapping. Created, updated, deleted and failed-payment webhooks all fetch current Stripe state before recomputing entitlements. Resubscription after a cancelled subscription remains allowed. |
| Interview regressions | Pass | 216 interview tests passed, including the new lifecycle tests. |
| Mock/workspace regressions | Pass | 28 mock-analysis, workspace-entry and subscription-display tests passed. |
| Security regressions | Pass | 6 P0 tests and 4 security tests passed. Cross-account RLS, webhook signatures, origin checks, single-device functions, worker authentication and backup restore are covered. |
| Dependencies | Pass | `npm audit --omit=dev` reported zero known vulnerabilities. |
| Secret scan | Pass | No credential pattern was found in the isolated checkout or its reachable Git history. |
| Local backup restoration | Pass | The synthetic PGlite recovery drill restored 75 application tables, accounts, private data and access controls. |
| Hosted backup restoration | Pass | A staging-only encrypted backup was restored into a disposable Supabase Micro project. All 75 included application/Auth tables matched counts and content digests; two private media objects (122 bytes) matched hashes; restored accounts signed in; student A, student B, anonymous and admin access boundaries passed. Recovery was usable in 362 seconds. The target project, source fixtures and temporary private archives were deleted. Recorded compute estimate: US$0.01344 for the successful run and less than US$0.05 across all attempts. |
| Worker and cron authentication | Configured | Matching 48-byte random secrets were installed as sensitive variables only in Vercel's staging environment. The release was rebuilt and the staging alias now points to the refreshed deployment. |

## Provider-dependent checks still open

These remain fail-closed in staging; no fake credential was installed.

1. **OpenAI transcription and marking:** staging has no restricted transcription or marking key. Add staging-only keys, then enable video marking and run one synthetic audio transcription plus one human-approved marking draft.
2. **TURN relay:** staging currently returns public STUN only. Add a staging TURN URL, username and credential from a relay provider, then test Chrome/Safari and Wi-Fi/mobile-data combinations.
3. **Recording backups:** the staging backup queue is disabled and has never completed a copy. Add bucket-scoped R2 credentials, run the hosted audio/video copy-and-restore check, then enable `interview_backup_health`.
4. **Operational alerts:** staging has no Resend key or private alert webhook. Configure one isolated destination and send the built-in `setup_test` alert before enabling notifications.
5. **Physical media matrix:** the desktop Live Practice UI and server-side ICE/privacy flow were exercised, but real camera/microphone capture still needs Safari on iPhone, Chrome on Android and at least one desktop browser with two actual people/devices.
6. **MFA:** provider-owner MFA and Studocyte admin MFA remain incomplete. Enrollment needs the owner to scan and retain authenticator/recovery material privately; those secrets must not be handled in this repository or chat.
7. **Independent security review:** local dependency, secret and regression checks passed. Strix is installed and its sandbox is available, but the configured model provider is Anthropic. Sending the isolated checkout to Anthropic through Strix needs explicit approval separate from the approved Strix budget.

## Re-run commands

```sh
npm run test:p0
npm run test:security
npm run test:interviews
npm audit --omit=dev
npm run scan:secrets
node scripts/verify-single-device-staging.mjs --authorised-staging-session-test
node scripts/verify-live-practice-hosted.mjs --authorised-staging-privacy-test
node scripts/verify-staging-load.mjs --authorised-bounded-staging-load
node scripts/hosted-recovery-drill.mjs --authorised-isolated-drill-usd1 --staging-source
```

Hosted recovery receipt: `artifacts/release-retention-recovery/restore-75c33dd5-8e93-4f9f-96e9-d5344e342122.json`.
