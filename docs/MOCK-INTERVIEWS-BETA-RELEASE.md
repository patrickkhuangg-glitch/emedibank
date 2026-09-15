# Mock Interviews public beta release — 6 September 2026

> **8 September update:** Current-schema permission hardening and the signup-ticket gate are now live. Interview ownership, hidden draft feedback and all four credit/refund cases have passed hosted checks; shared test keys are revoked. See the [dated access and credits report](security/INTERVIEW-ACCESS-CREDITS-2026-09-08.md). Statements below describe the earlier release and should not be used to infer the current state of these specific items. Other release requirements remain separate.

**Published follow-up:** student Bookings navigation has been removed and individual/full mock modes are live. See [the modes handoff](MOCK-INTERVIEW-MODES-HANDOFF.md). The user reviewed the question preview and explicitly authorised “Publish to public”. Hosted student/API smoke checks passed, temporary accounts were removed, and both public aliases were verified.

Mock Interviews is enabled at https://studocyte.emeducate.com.au/interviews/mock-interviews. The user explicitly authorised using the existing public beta, applying the required interview database update and configuring that site. This supersedes the original prohibition on those production actions for this release. No paid service or plan upgrade was created.

## Deployment and preserved work

- Vercel project: `emedibank-x1uw`, existing `em-educate` team.
- Active deployment: `dpl_C3LqUoNBf1xJbANE8AcKW6YrP7M4`.
- Previous deployment: `dpl_Ey6hJKFcHd8EYPFGD4wdAZgCkUxW`. It retains the final tour transition and Stories/library performance fixes, before the account-email repair.
- Deployment URL: https://emedibank-x1uw-1iptmn2sq-em-educate.vercel.app.
- Both `studocyte.emeducate.com.au` and `emedibank-x1uw.vercel.app` were verified through the Vercel alias API as pointing to that deployment.
- Source baseline was the previous public release, commit `aaa357a52bd11c6a0d28c62384ccbb659415f1bf`. A separate release directory at `.vercel/mock-interviews-public-release` added the interview feature without publishing unrelated shared-worktree changes.
- Exact deployed changes and hashes are in `MOCK-INTERVIEWS-BETA-RELEASE-MANIFEST.json`. The patch at `.vercel/mock-interviews-public-release.patch` describes the preceding release; use the current manifest plus the modes candidate manifest for the published follow-up. The broader working directory still contains other unfinished work. No Git push was performed. Reconcile the release changes with the production branch before its next automatic Git deployment, so it does not overwrite this CLI release.
- The isolated release includes the existing exam-runner lint fix and a checkout guard respecting `PAYMENTS_ENABLED=false`. It does not publish the concurrent signup, pricing, trial, analytics, or broader security redesign. Existing signup/invite behaviour and the narrow Zoom-webhook firewall rule were preserved.
- The first candidate failed because a broad upload-ignore pattern excluded `src/lib/supabase`. Root-anchored ignore patterns corrected this. The failed candidate was not promoted.

## Database, storage and configuration completed

The existing Supabase project is `ghxwyfiemvyhijpmrhgf`, on its existing Pro plan. Its latest completed physical backup was confirmed before applying updates.

Applied the actual `0033_interview_video_marking.sql` and `0035_security_hardening.sql` files. The latter supplies transcription quota RPCs used by the worker; its signup-authorisation machinery remains dormant because migration 0036 was not applied. Migrations 0034, 0036 and 0037 were not applied by this release. The project did not have a `supabase_migrations.schema_migrations` ledger; these were executed using authenticated management queries, with local receipts and file hashes. Do not blindly run all pending migrations or reapply 0033. Reconcile migration history with the operator before future automated migration pushes.

The existing historical audio attempt's count and MD5 fingerprint across all original columns match before and after the updates. No historical attempt was rewritten or removed. The `interview-recordings` bucket remains private with its video/audio MIME allowlist and a 157,286,400-byte limit. The global Storage limit was raised from 52,428,800 to 157,286,400 bytes and read back successfully.

Production values configured:

- `INTERVIEW_VIDEO_MARKING_ENABLED=true` and `INTERVIEW_VIDEO_RETENTION_DAYS=90`.
- Matching strong `INTERVIEW_WORKER_SECRET` and `CRON_SECRET`.
- `APP_ENV=production`, `PAYMENTS_ENABLED=false`, `P0_RELEASE_APPROVED=false`.
- `PRODUCTION_SUPABASE_URL` and `SUPABASE_EXPECTED_URL` identify the existing project.
- Existing Supabase and transcription credentials were preserved. Sensitive values returned by Vercel environment export are placeholders; never copy those over working credentials.

The previous staging preparation left only safe Preview variables (`APP_ENV=staging`, payments/release approval/video flags false, production-project identifier). No staging database, paid project or preview deployment was created. Those values do not establish an independent staging environment.

## Background processing and retention

The existing Vercel Hobby plan does not support every-minute cron. Supabase `pg_cron` and `pg_net` provide processing in the existing database, without adding a paid service:

- Vault contains `studocyte_interview_worker_secret`, matching the Vercel worker secret.
- `studocyte-interview-processing` is active every minute and invokes the public worker only when a job is due or a lease is stale.
- The Vault-backed HTTP call returned 200 with `{"processed":false}`; there were no jobs to process. A subsequent actual minute-scheduled run completed successfully with zero due jobs.
- Vercel registered the daily cleanup route on the promoted deployment at `0 17 * * *` (subject to Hobby's scheduling window).
- Before manually testing cleanup, a read-only query confirmed zero video attempts and zero removable transcription copies. The subsequent no-op request returned 200 with `{"queued":0}`. No media was deleted.

Setup and pause/activation instructions are in `supabase/operations/mock-interviews-scheduler.sql` and `INTERVIEW-VIDEO-MARKING-RUNBOOK.md`. Keep the worker credentials private; their values are not in this document or the source manifest. Daily cleanup preserves pending reviews and historical audio.

## Verification completed

- All nine interview test groups passed (`npm run test:interviews`).
- Full lint passed with zero errors and one pre-existing image-optimisation warning in `past-session-review.tsx`.
- Local webpack production build passed, including TypeScript and route generation (`npm run build -- --webpack`).
- Hosted Next.js 16.3.3 production build passed with the default Turbopack builder (`npm run build`), TypeScript, and all 32 generated pages.
- Candidate HTTP checks: unauthenticated interview initiation 401; unauthorised worker 401; authorised worker 200; logged-out Mock Interviews redirects to sign-in.
- Hosted database checks ran in a rolled-back transaction. Interview RLS is enabled; student writes to attempts are revoked; private marking/job/event reads and worker RPC execution are denied; the authorised submit grant exists; an unrelated authenticated identity cannot read attempts or recording objects.
- The signed-in live browser rendered the dedicated MMI and panel choices, panel recording consent/setup screen, saved recordings and the historical audio player, and the admin Mock Interview reviews queue. Camera and microphone were not activated, and student media was not played.
- Direct Python requests to the custom domain encountered Cloudflare 403/1010. No firewall was changed. Normal browser access and the actual Supabase-to-public-worker request succeeded. The daily cleanup check used Vercel's registered deployment endpoint.

## Remaining acceptance and operator work

The beta launch is complete. Full end-to-end acceptance is not yet complete:

1. Set a restricted `OPENAI_INTERVIEW_MARKING_API_KEY` in the existing Vercel project and redeploy to enable AI assessment and evidence audit. Do not reuse another workflow's restricted key silently. The existing transcription key is configured; its actual model permissions and transcription quality still need a non-sensitive recording test. Missing keys fail safely and allow manual human marking; no AI feedback is automatically released.
2. Complete physical Chrome, Safari, Edge, iPhone Safari and Android Chrome recording tests, including permission denial/recovery, orientation, dual audio/video recording, local preview/discard, interrupted TUS upload/resume, playback and release.
3. The user subsequently authorised admin-key use in memory only. Hosted two-student API/TUS privacy, concurrent submit/refund/approval, targeted lease fencing, account-deletion recovery and rolled-back retention checks now pass. A simultaneous same-path upload criterion remains unresolved: both distinct TUS sessions report success. See `MOCK-INTERVIEWS-HOSTED-TESTS.md` for evidence, cleanup verification and remaining global worker/retention races. No key was displayed or saved.
4. Staff human review and complete the ten-recording internal check followed by the 50–100-response pilot, tracking failure rates, review time, storage and egress.

No further product decision is required: the user chose a separate Mock Interviews section and the existing public beta as the release environment. These outstanding acceptance/configuration items must not be represented as passed.

## Safe rollback

Disable `INTERVIEW_VIDEO_MARKING_ENABLED` on the existing project and redeploy compatible code. Pause only the named Supabase processing job if required; preserve its queued rows and Vault configuration. For an immediate submission stop, revoke authenticated execution of `submit_interview_for_marking(uuid)` as documented in the runbook. Pause the cleanup schedule if retention must stop temporarily. Resolve/refund eligible submissions through the existing idempotent admin actions.

Keep migration 0033, its private tables and credit/event records, the compatible saved-recording views, and all historical attempts. Do not restore the previous app wholesale: its legacy synchronous upload flow depends on student write policies that the new migration correctly revoked. Do not drop tables, clear the bucket, restore broad grants or delete student data.

## Browser upload repair

The upload authentication fix is published in `dpl_JAdVn6qmSennFkGqNHdERaAKGzdH`. It removes a duplicate Authorization assignment that Chrome combined into an invalid credential. See `MOCK-INTERVIEW-UPLOAD-AUTH-FIX.md`. The 17 interview test groups, full lint and local/hosted production builds passed. No database, environment or storage-policy change was needed.

## Whole-mock marking and revised explanation

Published in `dpl_FxDgHnYFPsYGwkzqeNob49jz4Qx9`. Students can submit all saved full-mock responses together at the existing rate (8 MMI credits / 10 panel credits), with atomic submission and retry safety. The explanation now describes comprehensive review of strengths, weaknesses and improvements. Reviewers can navigate between responses from the same mock. Only additive migration 0038 was applied; no existing records or environment values changed. Local 21-group tests, lint, both production builds, hosted rollback-only SQL and disposable-account API checks passed. All test fixtures were removed. See `MOCK-INTERVIEW-FULL-MARKING.md`.

## Recording library and new pricing

The [recording-library handoff](MOCK-INTERVIEW-RECORDING-LIBRARY-HANDOFF.md) records the current public follow-up: a searchable, paginated library for 20–50 responses, grouped full mocks, and 2/1/12-credit pricing. Migration 0039 was applied without rewriting existing student data. Both public aliases were verified. Twenty-five interview tests, full lint (one existing warning), local and hosted production builds, rollback-only SQL and hosted disposable-account checks passed. No production environment variables or services were changed.

## Matching account credit cards

The interview credit balance now matches the Section II essay credit balance: a separate uppercase heading, identical bordered white card, spacing and purple “N credits” badge. The description shows the current 2/1/12-credit rates. Only `src/app/(app)/account/page.tsx` changed in the isolated application release. Desktop and 390px mobile previews confirmed matching card styles and no horizontal overflow. Full lint passed with the existing image warning; local and hosted production builds passed. No database, balance, environment or dependency changes. Both public aliases were verified. Roll back to `dpl_3toQeHSCCVgtgvu95rXYUSk3GHZQ` if necessary; data and pricing are unaffected.


## Optional introduction and private story bank

Published in `dpl_DCW9J7ZZwXtBkJLyGAaykPzkLijo`. Students receive a one-time invitation to a seven-step tour spanning dashboard, notes, practice, Stories, Mock Interviews and recordings/feedback. Skip, replay, progress resume and timed-session suppression are implemented. Stories now supports private saved context/actions/reflections, search, themes, editing, draft recovery and confirmed deletion. Only additive migration 0040 was applied; no environment, dependencies or services changed. Thirty interview tests, full lint (one existing warning), local/hosted production builds, interactive desktop/mobile previews and disposable-account hosted privacy/API tests passed. Test accounts and stories were removed. Both public aliases were verified. See [the complete nine-part handoff](INTERVIEW-INTRODUCTION-STORY-BANK-HANDOFF.md), including safe rollback and the distinction between completed checks and the broader recording acceptance work.


## Walkthrough spotlight and smoother transitions

Published in `dpl_ELPF9HcsYNUbcJJ6LrLwtzFmYdw4`. The blue outline and fixed corner explanation are replaced by a rounded clear spotlight through a dimmed, lightly blurred backdrop. The explanation sits beside or beneath its target with a pointer. Short eased scrolling, a moving callout and text transitions connect the steps, with reduced-motion handling. Positioning follows page layout, scrolling and resizing; mobile and short-screen layouts keep the explanation outside the visible spotlight, with scrollable copy when necessary. Escape ends the tour. First-visit preferences, story privacy, tour content and timed-session exclusion remain unchanged.

Changes are limited to `src/components/interviews/introduction.tsx`, new `src/components/interviews/tour-spotlight.tsx`, `src/lib/interviews/tour-position.ts` and `tests/interview-tour-position.test.ts`. All 31 interview tests, full lint (one existing warning), local webpack production build and hosted Turbopack build passed. Browser checks used actual components with production styles and synthetic local data at desktop and 390px mobile widths. A positioning test covers desktop, mobile and short landscape viewports. The small pointer deliberately uses a 3px corner radius, recorded as a design-detector advisory. No migrations, environment variables, dependencies or services changed. Roll back this visual refinement by promoting `dpl_DCW9J7ZZwXtBkJLyGAaykPzkLijo`; retain all student data and schema.


## Full spotlight correction

Published in `dpl_2b8qaSFKCYDm69f68P8veXZpuEjv` after the user reported that the lower half of the highlighted dashboard was blurred. The previous positioning fallback shortened the clear window to make space for the explanation. Spotlight bounds now preserve the entire padded target, including portions beyond the viewport; scrolling no longer manufactures a clear patch over unrelated content when the target is offscreen. The normal page width and layout are preserved. The card uses adjacent space where available and otherwise stays at the viewport edge; on constrained screens it can overlap part of the target, but it never crops the spotlight or blurs the target to create space.

Changed only `src/lib/interviews/tour-position.ts`, `src/components/interviews/tour-spotlight.tsx` and `tests/interview-tour-position.test.ts`. All 32 interview tests passed, including full-target coverage across desktop, mobile, short screens and scrolled targets. Full lint passed with the existing image warning; local webpack and hosted Turbopack production builds passed. The desktop preview confirmed that the full dashboard target (bottom 657.55px) sits inside the clear window (bottom 665.55px). At 390px mobile width, the target bottom at 1490.16px remains inside the clear window ending at 1498.16px, beyond the screen rather than artificially cropped. The pre-existing dashboard heatmap can widen the mobile document to 660px; the tour card itself stays inside the viewport. No database, environment, dependencies, services or student data changed. Roll back by promoting `dpl_ELPF9HcsYNUbcJJ6LrLwtzFmYdw4` if necessary, understanding that it restores this visual defect; retain all schema and data.


## Faster interview navigation

Published in `dpl_FQehn2WGDkoFjqSVYT3Xe6pH6QZr`. The five main interview page shells now opt into full Next.js prefetching through desktop/mobile navigation, so they can open from the browser's memory instead of starting server work on every click. The walkthrough preloads its next distinct safe page. An interview `loading.tsx` boundary allows immediate transitions and accessible loading feedback when a destination is not ready. Mobile menu icons now show the same pending feedback as desktop. The recordings page fetches the profile/credit balance and attempt metadata concurrently after authentication, avoiding a serial database wait.

Only dashboard, Practice, Mock Interviews setup, Stories and Resources are eligible for full prefetching. Recording libraries, selected attempts/signed URLs, account balances, API endpoints and timed sessions are excluded. Private Stories and study notes continue fetching fresh data when opened; writes, authentication, RLS and marking quotes remain authoritative. No shared server cache of student content was added. The first visit or an unprepared route still depends on the network; this is not a promise of instant navigation on every connection.

A local Next.js 16.3.3 production fixture used the actual updated navigation and allowlist, with every server page deliberately delayed by 1,100ms. Practice and Stories opened in 8ms and 9ms after preloading, versus 1,116ms for an uncached control. These are controlled fixture measurements, not a live-site performance benchmark. The loading boundary was also observed. The fixture and its timing instrumentation remain under ignored `.vercel/navigation-preview`, excluded from deployment.

All 33 interview tests, full lint (zero errors and the existing image warning), local webpack production build and hosted Turbopack build passed. Hosted disposable-account checks passed for preference persistence, private story isolation/CRUD and all five signed-in tour pages; both accounts and their stories were removed. No database migration, environment change, dependency or new service. Roll back by promoting `dpl_2b8qaSFKCYDm69f68P8veXZpuEjv`; no data rollback is needed.

Files changed:
- `src/lib/interviews/navigation.ts`
- `src/app/(app)/interviews/loading.tsx`
- `src/components/site-nav.tsx`
- `src/components/interviews/mock-tabs.tsx`
- `src/components/interviews/introduction.tsx`
- `src/app/(app)/interviews/mock-interviews/review/page.tsx`
- `tests/interview-navigation.test.ts`

## Stories and recording-library loading follow-up

Published `dpl_CXDwhT9GYV9qo49TUbQqTjXy1Uxz` from the isolated release directory. The change addresses the remaining blank content wait after navigation:

- Stories now includes the owner's initial saved stories in its authenticated server page, so the existing full-page prefetch can warm content as well as the shell. A no-store background request updates the snapshot on entry/focus; aborted or superseded reads cannot overwrite later local saves/deletes. Drafts and version-conflict safeguards remain intact. Saves/deletes also refresh the current route snapshot.
- The recording-library tab now fully prefetches its authenticated list. On entry/focus a client transition refreshes server data while keeping the list visible, with a brief updating status. Selected response URLs remain excluded from prefetch; media links are signed only when a response is opened. The server still authoritatively validates marking eligibility and credit charges.
- The metadata query projects only `station_snapshot->mock_session`, instead of fetching the entire question snapshot for every response. Full-mock grouping is preserved.
- Snapshots use Next's in-memory browser router cache, not a shared server cache or new persistent browser storage. The initial snapshot can briefly precede a recent change until the background refresh completes. Cold connections and opening individual videos still depend on network/service latency.

Validation: all 33 interview tests pass, including 50-response pagination and rendering only one selected player. Full lint has zero errors and the existing unrelated past-session-review image warning. The isolated production webpack build and hosted Turbopack production build both pass. Local browser checks using the actual changed client components confirmed immediate prefetched story content, its subsequent fresh replacement, and the recording list staying visible during a background refresh. These were controlled behaviour checks, not live latency measurements.

Hosted disposable-account checks confirmed server-rendered story ownership, story CRUD/version conflicts, a ten-response library containing a full eight-station MMI plus singles, grouping/search, exclusion of private transcripts/snapshot content/signed media from the list, account isolation, and fresh deletion results. The attempted fifty-row fixture was correctly rejected by the existing recording quota; the transaction rolled back and no limit was changed. Fifty-response pagination remains covered locally. All disposable accounts, stories and recording rows were removed and verified.

Receipts: `.vercel/interview-data-loading-{tests,lint,build,deploy,promote}.log`, `.vercel/interview-data-loading-{browser-checks,hosted-checks,aliases,deployment}.json`; file scope is `.vercel/interview-data-loading-files.json`. The current manifest records exact deployed hashes; the prior manifest is archived under its deployment ID. No migration, production environment change, paid service, or unrelated-work publication was required. Rollback is promotion of `dpl_FQehn2WGDkoFjqSVYT3Xe6pH6QZr`.

## Final introduction-step transition follow-up

Published `dpl_Ey6hJKFcHd8EYPFGD4wdAZgCkUxW`. The spotlight previously reset its card transform to a lower-corner fallback when changing steps/routes, then animated towards continuously changing coordinates during guided scrolling. The final recordings page made both movements especially apparent.

The card now retains its parking position while the target is unavailable, remains hidden/inert, and fades in over 160 ms only after the destination scroll and geometry measurement. Scrolling/resizing tracks the anchor without a competing CSS transform transition. A delayed loading notice retains an End tour action; Escape still closes the tour. Focus moves to the heading after the card becomes ready. Reduced-motion styling removes the fade transition. The final spotlight target now encloses the recordings section instead of only its heading/credit row.

Validation: all 33 interview tests, full lint (zero errors, one existing unrelated image warning), isolated webpack production build and hosted Turbopack production build pass. A local production Next.js fixture using the real introduction and spotlight components exercised all seven steps, a delayed final route, final CTA navigation, and desktop 1280×720/mobile 390×844 layouts. Representative target content was used for visual checks; a signed-in hosted visual recheck was not performed. Browser viewport was restored and temporary tab/server closed. Receipt: `.vercel/interview-tour-transition-browser-checks.json`; build/test/lint/deployment/promotion logs and alias receipt use the same prefix.

Only `src/components/interviews/tour-spotlight.tsx` and `src/components/interview-attempt-review.tsx` changed in the isolated source. No database, environment, credit, recording, or unrelated-work changes. Exact hashes are in the updated manifest. Rollback: promote `dpl_CXDwhT9GYV9qo49TUbQqTjXy1Uxz`.

## Account email repair — 6 September 2026

Published the scanner-safe account confirmation page and applied four branded Supabase templates (invitation, recovery, magic-link sign-in and signup confirmation). Hosted generated-link tests pass for invitation/password setup, new unconfirmed admin recovery, student/tutor/admin sign-in, signup confirmation, repeated previews, cross-origin/replay rejection and oversized requests. All fixtures were removed; no test emails were sent. Full lint and production builds pass. SMTP settings and production environment variables were preserved. See [the account-email handoff](AUTH-EMAIL-HANDOFF.md) for configuration, test evidence and coordinated template/application rollback. Recipients must request or receive a fresh email to see the new templates.
