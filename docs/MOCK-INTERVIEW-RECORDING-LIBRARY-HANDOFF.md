# Recording library and marking prices — 6 September 2026

Public beta deployment: `dpl_3toQeHSCCVgtgvu95rXYUSk3GHZQ`.

## 1. Student and reviewer workflows

Recordings & feedback now shows ten sessions per page, with search, format and marking-status filters. Full mocks occupy one row. Opening a response loads its private player and released report; transcripts and the self-review guide are collapsed. The library itself loads no players, signed media URLs, transcripts or reports. Return links preserve filters and pagination. The design was checked with 50 synthetic responses at desktop and mobile sizes.

Individual MMI marking costs **2 credits**; an individual panel response costs **1 credit**. Either complete full mock costs **12 credits**. The full-mock button remains available after saving every response and in the mock's review view. Students explicitly submit using a button showing the quoted price. Saving and self-review remain free. The explanation describes an EMeducate review and a comprehensive report on strengths, weaknesses and improvement.

A reviewer receives the existing linked response-level marking tasks, can watch recordings, write or edit feedback, and release each report after human review. No automated draft is exposed to students. The full mock still produces individual response reports rather than a combined score.

## 2. Files changed

The complete task file list and hashes are in `MOCK-INTERVIEW-RECORDING-LIBRARY-MANIFEST.json`. Main areas:

- `src/components/interview-attempt-review.tsx` and `src/lib/interviews/review-library.ts`.
- `src/app/(app)/interviews/mock-interviews/review/page.tsx`.
- `src/components/interviews/student-actions.tsx` and `mock-marking-actions.tsx`.
- `src/components/interviews/mock-lobby.tsx` and `mock-session-runner.tsx`.
- `src/lib/interviews/mock-marking.ts` and the one updated RPC argument type in `src/lib/supabase/types.ts`.
- Individual and whole-mock marking API routes.
- Migration 0039, interview tests, and the existing hosted verification scripts.

Only these changes were copied to the isolated public-release source. Unrelated work in the main checkout was preserved. No Git push was made.

## 3. Database migration and access rules

Applied **only** `0039_interview_marking_prices.sql`. This replaces pricing/submission functions and adds an internal enqueue helper; it does not rewrite historical balances, charges, recordings or reports. Table/storage RLS is unchanged. The helper has no executable grant to public, anonymous, authenticated or service roles. Authenticated entry points enforce owner, saved media, recent preflight, quoted cost and balance.

Single-response calls now require an expected price. The old one-argument function refuses unsubmitted attempts with `quote_changed`, preventing older tabs from silently charging the new price. Batch submission checks the current quote inside the transaction after locking the complete owner-bound response set. Failure rolls back all debits, jobs, marking rows and audit events. Retry is idempotent.

Previous non-refunded spending within a partially submitted full mock counts toward 12 credits: the remaining charge is `max(0, 12 - sum(credits_spent))`. Fully submitted historical mocks incur no new charge. Prior spend above 12 is preserved, not retrospectively refunded. The remaining charge is allocated evenly across newly submitted responses, with integer remainders assigned in response order. `credits_spent` and audit events record each allocation, so an ungradable refund returns exactly that response's allocated charge once. New panel bundles therefore allocate 2 credits to the first two responses and 1 to the other eight; new MMI bundles allocate 2 to the first four and 1 to the other four.

## 4. Dependencies and environment variables

No new dependencies, secrets, paid services or production environment changes. Existing recording, storage and worker configuration is reused. Admin keys used for hosted checks were held in memory, not displayed or saved.

## 5. Validation

- `npm run test:interviews`: **25 tests passed**. Includes actual SQL execution, rollback after a late response failure, owner/role boundaries, the 2/1/12 prices, partial-session pricing, refunds, retries, stale-price rejection, upload regression, 50-response pagination/filtering/grouping, and zero library players versus one selected player.
- `npm run lint`: passed with the existing `past-session-review.tsx:80` image warning; zero errors.
- Isolated `npm run build -- --webpack`: passed with safe local build substitutes.
- Hosted Vercel `npm run build` (Turbopack): passed.
- Impeccable detector: no findings. Desktop and 390px mobile visual inspection: readable controls and no horizontal overflow. Synthetic preview data was not deployed.
- Live database rollback-only verification: permissions, insufficient balance, 12-credit MMI transaction, retry and owner checks passed. Temporary rows were rolled back before workers could see them.
- Hosted disposable-account checks: both full-mock quotes, signed-in library/detail views, insufficient balance, unavailable media, old single-response prices and cross-account boundaries passed. No real student's credits or recordings were touched. All fixture accounts and attempts were removed.

Evidence is under `.vercel/review-pricing-*`; hosted API evidence is `.vercel/full-marking-hosted-api.json`.

## 6. Operator configuration remaining

No configuration is required for this update. Earlier optional AI-draft configuration remains: `OPENAI_INTERVIEW_MARKING_API_KEY` is not configured; human manual marking remains available. Follow the existing operator runbook if enabling AI drafting.

Reconcile manually applied migrations 0033, 0035, 0038 and 0039 with migration history before using a blanket migration push. Do not apply unrelated pending migrations. Reconcile this isolated release with the production Git branch before its next automatic deployment.

## 7. Browser limitations

This update does not change capture or upload. The earlier Chrome duplicate-Authorization fix is retained. Full-duration physical-device recording/codec coverage and the previously documented unfinished same-path upload concurrency limitation remain separate acceptance work. Only the opened response receives a signed URL; the existing Renew playback control handles expiry.

## 8. Product decisions

Completed: the explicitly requested 2/1/12 pricing and grouped whole-mock submission. Full panel marking is 12 credits even though ten independently submitted panel responses would total 10; this follows the user's stated full-exam price. Existing partial spend is credited toward the bundle without altering historical charges. A combined whole-exam score/report remains a separate product choice, not part of this request.

## 9. Safe rollback

The immediately preceding deployment is `dpl_9gmpouoQD1CRCEq8VnJt5boSX7uV`, which already has the new library and price-aware routes; only two labels differ. Restore that deployment if necessary and leave migration 0039 and all student data intact.

For a rollback further back to `dpl_FxDgHnYFPsYGwkzqeNob49jz4Qx9`, retain migration 0039. That older application's single-response calls safely refuse obsolete prices, and mismatched full-mock quotes also refuse without charging. Marking may be unavailable until the current routes/UI are restored. Prefer a UI-only rollback that keeps the new price-aware routes. Never restore balances, remove marking records, delete media or drop tables to roll back the interface.
