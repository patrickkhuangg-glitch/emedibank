# Whole-mock marking and student copy

**Current follow-up:** [Recording library and 2/1/12-credit pricing](MOCK-INTERVIEW-RECORDING-LIBRARY-HANDOFF.md) supersedes the earlier one-credit-per-response pricing below. Historical release details remain for reference.

Published to the existing public beta: `dpl_FxDgHnYFPsYGwkzqeNob49jz4Qx9`. Both public aliases were verified. The exact follow-up manifest is `MOCK-INTERVIEW-FULL-MARKING-MANIFEST.json`.

The marking explanation now reads: “Use Interview marking credits for an EMeducate reviewer to assess your responses and provide a comprehensive report on your strengths, weaknesses and how to improve.” It no longer displays the former zero-balance/AI explanation.

After all responses from a full mock are saved, the completion screen offers submission of the entire MMI or panel for marking. The same option appears for complete mocks in Recordings & feedback. The displayed price keeps the existing one-credit-per-response rate: eight credits for a full MMI and ten for a full panel. Previously submitted responses are excluded from the remaining price. Saving/self-review remains free. Incomplete mocks can still be submitted response by response.

Submission is atomic. The owner, complete response set, saved media, recent server preflight, quoted cost and balance are checked. A single database transaction queues all remaining responses and spends their credits; a failure rolls back all changes. Repeated submission cannot double-charge. A changed quote requires a refresh. Missing configuration or unavailable media fails without spending credits.

Reviewers see links between the submitted responses from the same mock. Existing response-level reports cover strengths, weaknesses and improvement priorities; reports become visible as each response is reviewed and released. This release does not introduce a single combined score or a discounted whole-mock price.

## Files and configuration

The task-specific manifest is `.vercel/full-marking-files.json`. Only those files and the single added RPC type were copied into the isolated beta release. Unrelated shared-worktree changes were preserved.

Migration `0038_mock_interview_batch_marking.sql` adds one authenticated RPC. It changes no existing records, storage policies, environment variables or dependencies. Do not run unrelated pending migrations. Existing migrations 0033 and 0035 remain in place. Migration 0038 was applied to the existing beta database after local tests; no other pending migrations were applied. The existing database migration ledger still requires operator reconciliation before any blanket migration push.

## Checks

All 21 interview test groups pass, including the actual SQL/RLS tests, owner isolation, missing-media and insufficient-balance failures, a forced failure at the final MMI response with rollback of earlier writes, quote changes, retry safety, both 8/10 response formats, browser upload regression and the replacement copy. Full lint passes with the pre-existing image warning. The isolated production build and hosted Vercel Turbopack build pass. The real beta database rollback-only test passed for RPC privileges, insufficient credits, eight-response submission, retry and ownership; every fixture change was rolled back. Its operator script is `supabase/operations/verify-mock-batch-rollback.sql`.

Physical full-length recording tests and previously documented hosted concurrency limitations remain separate acceptance work. The current whole-mock reports use the existing human review/release workflow.

## Rollback

Restore the preceding application deployment if necessary. Leave recordings, credits, reports and the additive batch function in place. Do not undo charged submissions or delete interview data. The preceding application can still review every response individually.

Hosted API smoke checks use `scripts/verify-full-mock-marking.mjs` with disposable accounts, in-memory credentials and cleanup. They never submit real recordings or spend a student’s credits.

Hosted API checks passed for MMI and panel full-mock quotes, new review controls/copy, insufficient-credit and missing-media refusal without charges, and cross-account isolation. All disposable fixture accounts and attempts were removed.
