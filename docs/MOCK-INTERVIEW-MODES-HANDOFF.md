# Mock interview modes: implementation handoff — 6 September 2026

**Whole-mock marking published:** the revised credit explanation and atomic whole-mock submission are live. See [the follow-up handoff](MOCK-INTERVIEW-FULL-MARKING.md) for pricing, migration 0038, checks and rollback.

**Upload repair published:** the Chrome duplicate-token failure is fixed in `dpl_JAdVn6qmSennFkGqNHdERaAKGzdH`. See [the incident and regression test](MOCK-INTERVIEW-UPLOAD-AUTH-FIX.md). The modes release ID below records its original publication; the current deployment is in the beta release manifest.

**Status: published on the existing public beta.** The user reviewed the question preview and explicitly authorised “Publish to public”. Vercel built deployment `dpl_8xfhqx5mto3zqaCryViNuEVbYmo4` successfully with Turbopack. Hosted student/API smoke checks passed before promotion, and both public aliases were verified afterward. No database migration, environment change or paid service was required.

## 1. Student and admin workflows

The student header no longer contains Bookings in either the interview or general study workspace. Bookings remains available through Study Plan; staff navigation remains intact.

Mock Interviews offers:

- An individual MMI station, selected by topic: 2 minutes of timed reading, then 8 minutes of recording.
- An individual panel question, selected by topic and number: 30 seconds of timed reading, then 3 minutes of recording. All 12 questions are individually selectable, with self-contained wording.
- A full MMI: eight distinct stations, each with 2 minutes of reading and 8 minutes of response; 80 minutes total.
- A full panel: ten distinct questions selected from the bank, 3 minutes per question; 30 minutes total, without separate reading breaks.

The setup page contains no question/scenario text. Students grant camera/microphone access and check the preview before clicking Start timed mock. The server reveals only the currently timed section. Full mocks advance automatically without untimed pauses. MMI follow-up questions are revealed during the response period. The scenario is available during timed reading. Server time determines section access; supplying a future index or client time cannot reveal a future station.

Recordings are separate per response, stored in IndexedDB between sections to bound memory use. Review, download or discard occurs after the mock ends. Leaving the tab ends the mock; reload recovers completed segments, not extra exam time. A response still recording can be lost on browser closure. If local storage fills, the last completed response is retained in memory for preview/download/save while the tab remains open.

Save uploads responses sequentially through the existing private resumable flow. Retries use a stable server-derived attempt ID for each mock response. A failed transcription-audio upload does not discard the video. Partially saved mocks retain unsaved segments on the device. Recovery tickets are valid for seven days. Saving is free, subject to the existing 10-response rolling daily quota and 2 GiB storage quota; limits do not consume marking credits. The UI explains those limits and retrying later. Capacity is enforced when saving, not reserved at the start of a mock.

Students optionally submit each saved response for one marking credit. Admin review, private AI working data, manual marking and human approval retain the existing workflow. Full mocks are separate responses in review, rather than one overall score or combined video.

## 2. Files changed

This follow-up changes only the following implementation/test files. The isolated release directory received the same files; unrelated working-tree changes were preserved. Exact hashes are in `MOCK-INTERVIEW-MODES-CANDIDATE.json`.

- [src/components/site-nav.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/site-nav.tsx>)
- [src/lib/interviews/stations.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/stations.ts>)
- [src/lib/interviews/mock-types.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/mock-types.ts>)
- [src/lib/interviews/mock-plan.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/mock-plan.ts>)
- [src/lib/interviews/mock-session.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/mock-session.ts>)
- [src/lib/interviews/mock-local.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/mock-local.ts>)
- [src/lib/interviews/media-validation.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/media-validation.ts>)
- [src/lib/interviews/video-validation.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/video-validation.ts>)
- [src/lib/interviews/video-upload.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/lib/interviews/video-upload.ts>)
- [src/app/api/interviews/mock-session/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/interviews/mock-session/route.ts>)
- [src/app/api/interviews/attempts/initiate/route.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/api/interviews/attempts/initiate/route.ts>)
- [src/components/interviews/mock-lobby.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interviews/mock-lobby.tsx>)
- [src/components/interviews/mock-session-runner.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/components/interviews/mock-session-runner.tsx>)
- [src/app/(app)/interviews/mock-interviews/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/interviews/mock-interviews/page.tsx>)
- [src/app/(app)/interviews/mock-interviews/session/page.tsx](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/src/app/(app)/interviews/mock-interviews/session/page.tsx>)
- [tests/interview-api.test.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/tests/interview-api.test.ts>)
- [tests/interview-mock.test.ts](</Users/patrick/Documents/ChatGPT/EMeducate/studocyte/tests/interview-mock.test.ts>)

Operator test harness: `scripts/verify-mock-modes-hosted.mjs` (credentials and cookies in memory; temporary fixtures removed).

Documentation: this handoff, the candidate manifest, and status notes in the existing release and main handoff documents.

## 3. Database migration and RLS

No new migration or RLS changes are required. Existing applied interview migrations 0033 and 0035 remain in use. Selected panel question index, actual timing and mock session identity/order are included in the existing server-generated JSON snapshot. Signed tickets are account-bound. Future response uploads are rejected until that response has started. Existing recordings and historical audio rows are untouched.

## 4. Dependencies and environment

No new dependencies or environment variables. Timed sessions reuse `INTERVIEW_WORKER_SECRET` for purpose-prefixed HMAC signing; it must be at least 32 characters and is already configured on the public beta. A missing signing key safely prevents starting a mock. Rotating it invalidates unsaved session tickets; allow students to save first where possible. Local Blob downloads remain possible after token expiry.

## 5. Checks and results

- `npm run test:interviews`: 15 test groups pass, including exact full-mock timing, distinct selection, each panel question, prompt boundaries, rendered lobby/setup without question text, signed-ticket tampering/ownership/expiry, API authentication, ignored client time/index, future-response rejection and retryable canonical saving. Existing database/RLS, credits, queue and provider-failure tests still pass.
- `npx tsc --noEmit --incremental false`: passed after implementation.
- `npm run lint`: passed with the existing image warning in `past-session-review.tsx:80`; no new lint errors.
- `npm run build -- --webpack`: passed for the workspace and the isolated production release. Local build uses existing safe configuration substitutes; it does not verify live provider credentials.
- Isolated release interview tests: all 15 groups passed.
- `git diff --check`: passed.
- Hosted Vercel `npm run build` (Turbopack): passed.
- `node scripts/verify-mock-modes-hosted.mjs --authorised-public-beta-test <deployment-url>`: six smoke-check groups passed, including fixture cleanup.
- Read-only Vercel alias verification: both public domains target the new deployment.
- Browser read of the custom public domain: new lobby, all eight MMI choices and hidden question wording confirmed. The existing admin session correctly retains staff Bookings navigation; a disposable student check verified its removal from student navigation.

The public site now has these changes. Hosted checks verified the student header, panel camera setup without question text, eight-station timing, full panel timing, selected question, rejection of future access and account isolation. Temporary student accounts were removed. These were API/rendered-page checks; no physical camera recording was made. Physical camera/audio capture, an uninterrupted 80-minute device run, browser-storage pressure and recovery across reloads still need browser acceptance. Unit and rendered-component checks do not substitute for those checks. Existing same-path TUS concurrency and other outstanding hosted acceptance findings remain recorded in `MOCK-INTERVIEWS-HOSTED-TESTS.md`; this change does not claim to resolve them.

## 6. Operator steps remaining

Publication is complete: deployment `dpl_8xfhqx5mto3zqaCryViNuEVbYmo4` is promoted to `studocyte.emeducate.com.au` and `emedibank-x1uw.vercel.app`. The isolated release preserved unrelated workspace changes. The source manifest and deployment record are updated. No new database migration or production environment edit was needed. Preserve the isolated release in the production source branch before a later automatic Git deployment. Do not overwrite live secrets with local/Vercel placeholder values.

The separate optional OpenAI marking key remains an operator configuration item from the original release. Manual marking remains available without it. Hosted browser acceptance should check a normal student header, individual panel selection, no prompt before Start, automatic full-mock transitions and successful playback of saved responses.

## 7. Browser limitations

Camera recording requires a secure origin, a supported MediaRecorder codec, permission and enough local storage. Long MMI mocks may use hundreds of megabytes. This implementation keeps the active section in memory and archives completed ones to IndexedDB. Backgrounding ends the exam; it does not pause the timer. Clearing site data deletes unsaved recordings. Safari/iOS/Android physical capture and long-running memory/storage behaviour are not yet verified.

## 8. Product decisions

Completed: the requested individual/full modes and hidden prompts are implemented with the timings stated above. Seven original MMI stations and a fourth panel topic were added to give enough distinct content; the shared unrecorded Practice bank also includes them.

Optional future decisions: university-specific timing presets, a panel that dynamically follows up based on answers, grouped full-mock reports and bundled marking prices. The current 2+8 MMI and 10×3 panel formats are explicit practice presets, not a claim that every university uses identical exam conditions.

## 9. Safe rollback

Retain the previous public deployment `dpl_4723aQ5FCsmABUYpQUs6vxL2bDgs`. Restore that deployment's aliases if necessary; do not delete or roll back database tables, media, credits or historical audio. Saved snapshots remain readable by the existing review/admin workflow. Students with unsaved new local mock drafts need this runner available long enough to save or download them; a full application rollback can hide the recovery UI, so prefer disabling new starts while preserving draft recovery where practical. Keep the signing secret unchanged during that recovery window.
