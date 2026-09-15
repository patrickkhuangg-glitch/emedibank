# Interview introduction and private story bank — 6 September 2026

Published on the existing public beta at https://studocyte.emeducate.com.au/interviews.

The visual follow-up is now live in `dpl_ELPF9HcsYNUbcJJ6LrLwtzFmYdw4`: smooth scrolling and attached explanations with pointers replace the blue outline; a dimmed, lightly blurred backdrop makes the target clear. See the latest section of `MOCK-INTERVIEWS-BETA-RELEASE.md` for the four changed files, 31-test/build results and data-safe rollback to the original introduction release. The original introduction release details below remain the implementation record.

- Active deployment: `dpl_DCW9J7ZZwXtBkJLyGAaykPzkLijo`.
- Deployment URL: https://emedibank-x1uw-e1apvedvd-em-educate.vercel.app.
- Previous deployment: `dpl_GtwoyXj7BPY41y2RbYDqkKnxfmGv`.
- Both public aliases were verified through the Vercel API. The candidate was tested before promotion.
- The release was built from the existing isolated release directory. Unrelated main-worktree changes were preserved and excluded. No Git push was performed.

## 1. Student and admin workflows

On a student's first safe visit to Interviews, an accessible dialog offers “Yes, show me around” or “I’ll explore on my own”. The seven-step introduction highlights actual page sections: dashboard, study notes, question selection, preparing/rehearsing/recording, Stories, Mock Interviews, and recordings/feedback. Back, Next, End tour and Show introduction let students control it. Completing the tour opens Practice. Starting from any supported page returns to the dashboard first.

Practice is an unrecorded rehearsal. The introduction accurately directs students to Mock Interviews for recording and back to dashboard Study notes for reflections. It explains individual stations, the eight-station MMI, 30-minute panel and the existing 2/1/12-credit rates. It does not start timers, request camera/microphone access, play a recording, spend credits or submit marking. Both timed-session routes exclude the welcome, replay and active tour; navigating into them ends active guidance.

Started, skipped or completed status is saved in the student's existing Auth metadata (`interview_intro_v1`). The preference is presentation-only and never grants permissions. An account-scoped local fallback avoids repeated prompts if persistence fails; progress resumes within the same browser tab after reload. Existing students without this preference also receive the one-time invitation. Staff do not receive the student tour.

Stories is now a working private bank: Add a story → choose a theme → write Context, Your actions and Reflection → Save story. Students can search, filter themes, browse ten stories per page, reopen, edit and explicitly confirm deletion. Drafts survive navigation/reload within the tab. Stale edits are refused with an option to preserve the draft as a new story. Admin marking and student recording workflows remain as documented in the earlier interview handoffs; personal stories are not sent to marking or AI and have no staff-facing bank.

## 2. Files changed

The following are this follow-up's source, migration and verification files. In existing pages/components, tour anchors are the only additions unless identified as the new layout or replacement Stories page. Only the new story-table types were added to the isolated Supabase types file.

- `src/lib/interviews/introduction.ts`
- `src/lib/interviews/stories.ts`
- `src/components/interviews/introduction.tsx`
- `src/components/interviews/story-bank.tsx`
- `src/app/api/interviews/introduction/route.ts`
- `src/app/api/interviews/stories/route.ts`
- `src/app/api/interviews/stories/[storyId]/route.ts`
- `src/app/(app)/interviews/layout.tsx`
- `src/app/(app)/interviews/stories/page.tsx`
- `src/app/prototypes/interviews/page.tsx`
- `src/components/interview-study-notes.tsx`
- `src/components/interview-practice-lobby.tsx`
- `src/components/interviews/mock-lobby.tsx`
- `src/components/interview-attempt-review.tsx`
- `supabase/migrations/0040_interview_story_bank.sql`
- `tests/interview-introduction-api.test.ts`
- `tests/interview-introduction-stories.test.ts`
- `src/lib/supabase/types.ts`
- `scripts/verify-interview-introduction.mjs`

Release documentation: this handoff, `MOCK-INTERVIEWS-BETA-RELEASE.md`, the current release manifest and the archived manifest for `dpl_GtwoyXj7BPY41y2RbYDqkKnxfmGv`. Exact release hashes are in `MOCK-INTERVIEWS-BETA-RELEASE-MANIFEST.json`. Local synthetic browser fixtures and verification receipts remain under ignored `.vercel/`; they are not deployed as application routes.

## 3. Database migration and RLS

Applied only `supabase/migrations/0040_interview_story_bank.sql` to the existing Supabase project `ghxwyfiemvyhijpmrhgf`, using the user's authorised public-beta database scope. It creates `interview_stories` with bounded text, known themes, owner reference, timestamps and an edit version. Owner-only SELECT/INSERT/UPDATE/DELETE policies apply to authenticated students. Anonymous access and writes to ownership/version/timestamp columns are denied. A trigger increments version and preserves creation time. Deleting an account cascades its stories.

APIs authenticate each request, force ownership from the signed-in identity, validate content and reject stale versions. Create retries reuse a UUID; identical retries return the existing story. The metadata endpoint updates only the whitelisted preference and preserves unrelated metadata and role. No existing attempts, recordings, balances or story records were rewritten by the migration.

The earlier project's migration-ledger caveat still applies. Migration 0040 has already run; do not rerun it or blindly push all pending migrations. Reconcile recorded migration history before introducing automated migration deployment.

## 4. Dependencies and environment

No new runtime dependencies, environment variables, secrets, paid services or plan upgrades. This uses existing authenticated Supabase connections. The admin key was used only in memory for the authorised disposable-account tests; it was never displayed or saved. The student feature never receives the admin key.

## 5. Tests and builds

- `npm run test:interviews`: 30 tests passed, including introduction state/path validation, API ownership and retry behaviour, real migration RLS in PGlite, protected columns, concurrent-edit versions and account-delete cascade.
- `npm run lint`: zero errors, one pre-existing `@next/next/no-img-element` warning at `src/app/(app)/practice/review/[sessionId]/past-session-review.tsx:80`.
- `npm run build -- --webpack`: passed in the isolated release with safe local build substitutes, including TypeScript and route generation.
- Hosted `npm run build` with Next.js 16.3.3/Turbopack: passed with the existing production configuration.
- Interactive browser checks with actual components and synthetic local data: initial prompt, skip/reload persistence, replay, all seven steps, Back/Next, resumed progress, finish to Practice, protected-session suppression, draft reload and save. Desktop and 390×844 mobile previews passed; the final mobile highlight was adjusted and confirmed inside the page gutters.
- `node scripts/verify-interview-introduction.mjs --authorised-public-beta-test https://emedibank-x1uw-e1apvedvd-em-educate.vercel.app`: passed. Two disposable student accounts verified hosted preference persistence, metadata preservation, create/retry/read/edit/delete, owner isolation, forged ownership rejection, stale edit/delete rejection and all five signed-in tour destinations. Both accounts and their stories were removed and cleanup verified.
- Both `studocyte.emeducate.com.au` and `emedibank-x1uw.vercel.app` point to `dpl_DCW9J7ZZwXtBkJLyGAaykPzkLijo`.

Local evidence: `.vercel/introduction-tests.log`, `introduction-lint.log`, `introduction-build.log`, `introduction-deploy.log`, `introduction-hosted-checks.json`, `introduction-ui-checks.json`, `introduction-aliases.json`, and `introduction-design-check.json` (no detector findings).

## 6. Remaining operator configuration

None for the introduction or story bank on this beta. For a separate environment, apply migration 0040 after the existing schema and configure the project's normal authenticated Supabase connection. No OpenAI configuration is required for Stories or the introduction. Before the next Git-driven deployment, reconcile the isolated release with the production branch so a stale branch does not overwrite the CLI release.

The earlier video-marking feature still has the separately documented restricted OpenAI marking-key configuration, physical recording device matrix, internal review/pilot and storage-concurrency acceptance items. This follow-up does not claim those were completed. See `MOCK-INTERVIEWS-BETA-RELEASE.md` and `MOCK-INTERVIEWS-HOSTED-TESTS.md`.

## 7. Browser limitations

Draft preservation is tab-local, not a cross-device draft sync. Saved stories and the successfully saved introduction preference belong to the account. Browser storage restrictions can prevent local fallback/draft persistence; server-saved stories are unaffected. No native recording was started for these onboarding checks.

The in-app browser's direct public dashboard navigation encountered `ERR_CONNECTION_CLOSED` before this release. Browser interaction tests therefore used actual components in a local synthetic-data preview; hosted APIs and signed-in server-rendered pages were tested separately on the candidate. No firewall or browser security policy was bypassed. Physical Safari/Edge/mobile-device acceptance remains part of the broader recording checklist.

## 8. Product decisions

Completed: the user chose a private saved story bank in addition to the optional introduction. No further product decision blocks these features. Story sharing, importing and AI suggestions were not requested. The dashboard's existing starter readiness guidance remains guidance; this change does not implement new progress analytics.

## 9. Safe rollback

Promote the preceding verified deployment `dpl_GtwoyXj7BPY41y2RbYDqkKnxfmGv` in the existing Vercel project if this follow-up needs to be withdrawn. Keep migration 0040, its RLS policies, saved stories and Auth preference metadata. They are additive and do not affect the earlier application. Do not drop tables, delete stories, alter recording/marking policies, restore broad grants or change credits. Returning to this release restores the saved bank without losing student content. No environment rollback is required.
