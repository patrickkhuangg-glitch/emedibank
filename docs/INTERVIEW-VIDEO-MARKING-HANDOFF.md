# Interview video marking: final implementation handoff

> **8 September update:** Current-schema permission hardening and the signup-ticket gate are now live. Interview ownership, hidden draft feedback and all four credit/refund cases have passed hosted checks; shared test keys are revoked. See the [dated access and credits report](security/INTERVIEW-ACCESS-CREDITS-2026-09-08.md). Statements below describe the earlier release and should not be used to infer the current state of these specific items. Other release requirements remain separate.

**Current follow-up:** [Recording library and 2/1/12-credit pricing](MOCK-INTERVIEW-RECORDING-LIBRARY-HANDOFF.md) supersedes the earlier one-credit-per-response pricing below. Historical release details remain for reference.

**Whole-mock marking published:** the revised credit explanation and atomic whole-mock submission are live. See [the follow-up handoff](MOCK-INTERVIEW-FULL-MARKING.md) for pricing, migration 0038, checks and rollback.

**Upload repair published:** the Chrome duplicate-token failure is fixed in `dpl_JAdVn6qmSennFkGqNHdERaAKGzdH`. See [the incident and regression test](MOCK-INTERVIEW-UPLOAD-AUTH-FIX.md). The modes release ID below records its original publication; the current deployment is in the beta release manifest.

**Published follow-up:** student Bookings navigation has been removed and individual/full mock modes are live. See [the modes handoff](MOCK-INTERVIEW-MODES-HANDOFF.md). The user reviewed the question preview and explicitly authorised “Publish to public”. Hosted student/API smoke checks passed, temporary accounts were removed, and both public aliases were verified.

All seven engineering phases are implemented, and Mock Interviews is now enabled on the public beta. The user authorised its database and configuration updates. See `MOCK-INTERVIEWS-BETA-RELEASE.md` for the current deployment record. **The complete acceptance definition of done is not yet verified:** same-path upload concurrency, simultaneous global worker/retention races, provider-key acceptance and the physical browser matrix remain pending. Hosted transport, two-account privacy, submit/refund/approval races and recovery checks have now run; see `MOCK-INTERVIEWS-HOSTED-TESTS.md`. Unrelated shared-worktree changes were preserved; no paid service or plan upgrade was created.

## 1. Student and admin workflows

The user requested a dedicated **Mock Interviews** section. Its entry point is `/interviews/mock-interviews`, with `/session` for recording and `/review` for saved recordings and feedback. It appears beside Practice in the platform navigation and on the interview dashboard. Practice now provides timed, unrecorded rehearsal independently of the video flag. The old `/interviews/review` address redirects to the new recordings page, preserving access to all historical attempts. The separation introduces no database, credit or configuration changes.

Student: camera/microphone consent → live preview → timed preparation → bounded video plus audio-copy recording → local preview/discard → direct resumable private save → free transcript/self-review → optional one-credit human-reviewed marking → status only until human release → accessible approved scores, evidence, strengths, priorities and practice task.

Admin: oldest ready queue with filters, pagination and operational counts → private station/video/transcript/AI/audit workspace → correction notes and editable structured draft or fully manual mark → full-recording acknowledgement → atomic approval and optional next submission. Ungradable/refund, retries, draft conflicts, media renewal and private audit history are included. Only admins review; general tutors have no access.

## 2. Files changed for this task

The exact deployed source manifest is `MOCK-INTERVIEWS-BETA-RELEASE-MANIFEST.json`; `MOCK-INTERVIEWS-BETA-RELEASE.md` records the launch, scheduler and applied migrations. The following implementation file manifest excludes unrelated edits from other work. Shared files `package.json` and `src/lib/supabase/types.ts` also contain preserved independent changes. The supplied implementation-plan file was read, not rewritten.

- [.env.example](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/.env.example>)
- [docs/INTERVIEW-VIDEO-MARKING-HANDOFF.md](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/docs/INTERVIEW-VIDEO-MARKING-HANDOFF.md>)
- [docs/INTERVIEW-VIDEO-MARKING-RUNBOOK.md](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/docs/INTERVIEW-VIDEO-MARKING-RUNBOOK.md>)
- [next.config.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/next.config.ts>)
- [package-lock.json](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/package-lock.json>)
- [package.json](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/package.json>)
- [src/app/(app)/account/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/account/page.tsx>)
- [src/app/(app)/admin/interviews/[attemptId]/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/admin/interviews/[attemptId]/page.tsx>)
- [src/app/(app)/admin/interviews/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/admin/interviews/page.tsx>)
- [src/app/(app)/admin/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/admin/page.tsx>)
- [src/app/(app)/interviews/practice/session/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/interviews/practice/session/page.tsx>)
- [src/app/(app)/interviews/review/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/interviews/review/page.tsx>)
- [src/app/api/internal/interviews/cleanup/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/internal/interviews/cleanup/route.ts>)
- [src/app/api/internal/interviews/process/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/internal/interviews/process/route.ts>)
- [src/app/api/interviews/attempts/[attemptId]/finalise/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/interviews/attempts/[attemptId]/finalise/route.ts>)
- [src/app/api/interviews/attempts/[attemptId]/media/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/interviews/attempts/[attemptId]/media/route.ts>)
- [src/app/api/interviews/attempts/[attemptId]/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/interviews/attempts/[attemptId]/route.ts>)
- [src/app/api/interviews/attempts/[attemptId]/submit-marking/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/interviews/attempts/[attemptId]/submit-marking/route.ts>)
- [src/app/api/interviews/attempts/[attemptId]/transcript/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/interviews/attempts/[attemptId]/transcript/route.ts>)
- [src/app/api/interviews/attempts/initiate/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/interviews/attempts/initiate/route.ts>)
- [src/app/api/interviews/recordings/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/interviews/recordings/route.ts>)
- [src/components/interview-attempt-review.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interview-attempt-review.tsx>)
- [src/components/interview-practice-runner.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interview-practice-runner.tsx>)
- [src/components/interview-transcript.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interview-transcript.tsx>)
- [src/components/interviews/admin-review.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interviews/admin-review.tsx>)
- [src/components/interviews/feedback-editor.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interviews/feedback-editor.tsx>)
- [src/components/interviews/feedback-view.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interviews/feedback-view.tsx>)
- [src/components/interviews/media-player.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interviews/media-player.tsx>)
- [src/components/interviews/student-actions.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interviews/student-actions.tsx>)
- [src/lib/admin/student-actions.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/admin/student-actions.ts>)
- [src/lib/interviews/api.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/api.ts>)
- [src/lib/interviews/config.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/config.ts>)
- [src/lib/interviews/jobs.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/jobs.ts>)
- [src/lib/interviews/marking-actions.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/marking-actions.ts>)
- [src/lib/interviews/marking-data.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/marking-data.ts>)
- [src/lib/interviews/marking-rubric.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/marking-rubric.ts>)
- [src/lib/interviews/marking-validation.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/marking-validation.ts>)
- [src/lib/interviews/provider.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/provider.ts>)
- [src/lib/interviews/recording.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/recording.ts>)
- [src/lib/interviews/storage-cleanup.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/storage-cleanup.ts>)
- [src/lib/interviews/transcription.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/transcription.ts>)
- [src/lib/interviews/video-upload.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/video-upload.ts>)
- [src/lib/interviews/video-validation.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/video-validation.ts>)
- [src/lib/interviews/worker-auth.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/worker-auth.ts>)
- [src/lib/supabase/types.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/supabase/types.ts>)
- [supabase/migrations/0033_interview_video_marking.sql](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/supabase/migrations/0033_interview_video_marking.sql>)
- [tests/helpers/server-only.cjs](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/tests/helpers/server-only.cjs>)
- [tests/interview-api.test.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/tests/interview-api.test.ts>)
- [tests/interview-database.test.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/tests/interview-database.test.ts>)
- [tests/interview-validation.test.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/tests/interview-validation.test.ts>)
- [vercel.json](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/vercel.json>)

- [src/app/(app)/interviews/mock-interviews/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/interviews/mock-interviews/page.tsx>)
- [src/app/(app)/interviews/mock-interviews/session/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/interviews/mock-interviews/session/page.tsx>)
- [src/app/(app)/interviews/mock-interviews/review/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/interviews/mock-interviews/review/page.tsx>)
- [src/app/prototypes/interviews/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/prototypes/interviews/page.tsx>)
- [src/app/prototypes/interviews/practice/session/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/prototypes/interviews/practice/session/page.tsx>)
- [src/components/interview-practice-lobby.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interview-practice-lobby.tsx>)
- [src/components/site-nav.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/site-nav.tsx>)
- [src/components/interviews/mock-tabs.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interviews/mock-tabs.tsx>)
- [src/components/interviews/rehearsal-runner.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interviews/rehearsal-runner.tsx>)

`src/components/interview-practice-tabs.tsx` was moved to `src/components/interviews/mock-tabs.tsx` for the dedicated mock navigation.

## 3. Migration and RLS

Migration `0033_interview_video_marking.sql` extends existing attempts, retaining historical audio defaults; creates three private working/job/audit tables; adds service-only job, review, refund, cleanup and queue RPCs; and keeps the owner-read policy while revoking student writes. Upload paths must match a current owner shell. Primary/audio files are immutable. A 60-second server preflight permit gates the authenticated credit RPC. Credit spend/refund, release, lease-fenced completion and cleanup reservation are transactional. Reviewer IDs and AI/private notes remain in private tables. Signed playback expires after ten minutes. Video retention defaults to 90 days and protects unresolved submissions.

The actual migration passed isolated PGlite Postgres tests. Hosted role/RLS and bucket checks now pass, and the historical audio attempt has an identical before/after fingerprint across its original columns. Real TUS resume, two-account isolation and independent concurrent submit/refund/approval requests now pass. One same-path TUS concurrency criterion remains unresolved; global worker/retention races still require staging. Migration 0035 was also applied because the current worker depends on its transcription quota RPCs. The signup enforcement migration 0036 was not applied.

## 4. Dependencies and environment

- Production: `tus-js-client` 4.3.1.
- Development only: `tsx` 4.23.13 and `@electric-sql/pglite` 0.5.8. Node's built-in test runner is used; tests require Node 22.15+ / Node 24.
- Added configuration: `INTERVIEW_VIDEO_MARKING_ENABLED`, `INTERVIEW_WORKER_SECRET`, `CRON_SECRET`, `OPENAI_INTERVIEW_TRANSCRIPTION_MODEL`, `OPENAI_INTERVIEW_MARKING_API_KEY`, `OPENAI_INTERVIEW_MARKING_MODEL`, `OPENAI_INTERVIEW_AUDIT_MODEL`, `INTERVIEW_VIDEO_RETENTION_DAYS`.
- Reused: `OPENAI_TRANSCRIPTION_API_KEY` and existing Supabase configuration. Missing provider keys fail safely and allow manual marking.

## 5. Checks and results

The authorised hosted follow-up is recorded in `MOCK-INTERVIEWS-HOSTED-TESTS.md`. Most targeted acceptance checks passed, including cleanup and preservation of original rows. Both simultaneous same-path TUS uploads reported completion, so that criterion remains failed. Credentials were used only in memory. The operator harness and `.vercel` lint exclusion were added; full lint passes with its existing warning.

After separating Mock Interviews: all nine interview test groups and the full lint/webpack production build passed again. Rendered-component checks verified distinct rehearsal/mock destinations, MMI and panel rehearsal entry states, the disabled-recording message, and the active recordings navigation. The build includes all three new Mock Interviews routes. These checks do not replace the pending browser/device and hosted staging acceptance below.

- `npm run test:interviews`: **9 groups passed** (unit, route/action adapters, provider failure drills, actual local SQL/RLS, credits, leases, refunds, approvals and retention).
- `npm run lint`: **passed, zero errors**. One unrelated existing image optimisation warning in `src/app/(app)/practice/review/[sessionId]/past-session-review.tsx:80`.
- `npx tsc --noEmit`: passed; the final production build also runs TypeScript validation.
- `git diff --check`: passed.
- `npm run build`: the hosted Vercel production build passed with Next.js 16.3.3/Turbopack, including TypeScript and all 32 generated pages. Earlier local Turbopack attempts were blocked by the environment's denied local port (`EPERM`).
- `npm run build -- --webpack`: **complete production build passed**, including TypeScript, static generation and route tracing, using the existing local environment.
- One intermediate verification build encountered a shared-output `ENOTEMPTY` conflict; no unrelated build output was reset.
- `npm run start -- --port 3107`: denied by local-port policy. An isolated synthetic browser fixture was also blocked by browser local-file URL policy. No bypass was attempted and no live browser result is claimed.

The initial automated tests used isolated fixtures and did not send student content to providers. Subsequent authorised release checks verified hosted role permissions, historical-data preservation and empty worker/cleanup operations. PGlite is single-connection; repeat/concurrent Promise idempotency tests do not replace independent hosted-connection race testing.

## 6. Manual Supabase, Vercel and OpenAI steps

The authorised public-beta setup and its exact verification status are recorded in `MOCK-INTERVIEWS-BETA-RELEASE.md`. A restricted `OPENAI_INTERVIEW_MARKING_API_KEY` is still required for AI draft/audit generation; manual human marking remains available without it. The existing transcription key is configured but real-provider acceptance is pending. Complete real TUS/privacy/concurrency and failure drills, ten internal cross-browser recordings, then the staffed 50–100 response pilot. The existing Supabase scheduler supplies minute processing; Vercel runs daily cleanup. No paid upgrade is needed.

## 7. Browser limitations and external verification

WebM VP8/Opus is preferred, with supported MP4 fallback. Dual-recorder reliability on Safari/iPhone remains unverified. Audio-copy failure preserves video and manual marking. Pause/retry retains an in-memory recording in the open tab; closing/reloading loses those local bytes. Hiding a response tab intentionally stops recording to avoid background timer suspension. Arbitrary uploaded videos, extraction/transcoding and adaptive streaming are out of scope. Portrait/landscape and the Chrome, Safari, Edge, iPhone Safari and Android Chrome matrix are documented as **pending**, not passed.

## 8. Remaining product decisions

The user chose the existing public beta as the rollout environment and authorised its database/configuration updates. No additional product decision is required. Operational acceptance remains: actual device support, real upload/privacy/concurrency acceptance and staffed human review. These are separate from the completed engineering work. Default retention is configurable; changing it does not restore deleted media.

## 9. Safe rollback

Disable the feature flag and, for an immediate hard stop, revoke the authenticated submit RPC until re-enabled. Pause affected cron schedules while preserving the durable queue. Keep the new compatible read/review/deletion paths, private bucket, migration, credit/event ledgers, audio attempts, transcripts and approved feedback. Do not drop tables, delete student data, restore broad student writes, or revert to the old synchronous upload route. Resolve/refund existing eligible submissions through the idempotent admin actions and resume after fixing the issue.
