# Mock Interviews hosted acceptance — 6 September 2026

The user explicitly authorised using the existing Supabase admin key **in memory only**, without displaying or saving it. The tests used disposable accounts and labelled synthetic transport bytes. Credentials, passwords, auth cookies, signed playback URLs and upload URLs stayed in process memory. No student media was sent to providers.

**Result: the main API/privacy/credit tests and recovery tests passed. One simultaneous-upload acceptance criterion failed and remains unresolved. Full acceptance must not be marked complete.**

## Passed on the existing beta

- Anonymous attempt creation is denied. Student and general-tutor access to the admin queue redirects away without rendering its protected contents. Next.js streaming can deliver this redirect inside an HTTP 200 page; the harness checks the streamed redirect and absence of protected page content.
- A 7 MiB synthetic file uploaded through the hosted TUS endpoint in separate requests, resumed from the persisted 6 MiB offset, and downloaded with an identical SHA-256 hash.
- Another student cannot upload to the owner's shell, read its database row, download its object, obtain its signed playback URL, or delete the attempt. Anonymous downloads fail.
- Serial duplicate uploads to an existing path are rejected. A finalised recording also rejects a new upload to its path.
- Missing primary media prevents finalisation. Concurrent finalisation is idempotent. Missing transcription audio preserves the video, leaves transcription failed, and spends no credit.
- Independent concurrent HTTP marking submissions spend exactly one credit. Students cannot directly increase their credit balance or release an attempt.
- Students and general tutors cannot read private markings, jobs or audit events, or execute the worker claim RPC.
- Approval requires the full-review acknowledgement and the current version. Concurrent approval releases once, persists reviewer identity, and exposes only approved feedback; private working notes stay private.
- Independent concurrent refund RPC requests return a credit exactly once. Refunded work cannot subsequently be approved.
- A worker's completion/failure calls with the wrong lease owner are rejected. An owned exhausted failure becomes `needs_attention`, without publishing feedback.
- The actual hosted retention RPC protected pending review and historical audio, and reserved an expired unfinished upload. All retention mutations occurred inside a rolled-back transaction; no storage deletion ran as part of this test.
- Owner attempt deletion through the deployed API removes the object and cascades private markings, jobs and events.
- The deployed account-deletion implementation was loaded with real hosted database/storage clients and a fixture admin context. A simulated storage failure preserved the account and recording pointers. Retrying removed video, transcription audio, a nested residual object, an unfinished upload's saved object, a synthetic historical audio attempt and dependent rows. Next.js cache invalidation was stubbed; this was not a browser form test.
- The issued signed media URL returned the original bytes. Following attempt deletion, that same URL no longer returned the object. This does not revoke bytes already downloaded into a browser.
- Original attempt rows matched their before/after fingerprints on each run. Disposable accounts and saved test objects were removed; there were no reported cleanup failures.

## Unresolved: simultaneous uploads to one unfinished path

Two distinct 1 KiB payloads were uploaded concurrently to the same owner-created, unfinalised recording path, without upsert. Both requests returned HTTP 201 with `Upload-Offset: 1024`, using **different upload resource URLs**. This reproduced with both raw TUS requests and the installed `tus-js-client` 4.3.1 using the application's creation-with-upload settings. Retries were disabled in the client reproduction to avoid masking a failed response.

There was one readable saved object matching one submitted payload. Once the attempt was finalised, a further upload to that path was rejected. The signed URL stopped serving media after deletion. No cross-account access or overwrite of a finalised recording was observed.

Nevertheless, the intended “one succeeds, the other conflicts” guarantee did not pass. Supabase's [resumable upload documentation](https://supabase.com/docs/guides/storage/uploads/resumable-uploads#concurrency) says that uploads using different URLs for one path should have one winner and a conflict for the other. Do not report this concurrency criterion as verified. Investigate the hosted Storage service's creation-with-upload completion behaviour in staging and resolve the discrepancy before full acceptance. No provider support message was sent and no live storage policy was weakened to make the test pass.

## Reproduction and receipts

The operator-only harness is `scripts/verify-interview-hosted.mjs`. It is not part of automatic tests, lint or builds, and requires explicit authorisation via its argument. It obtains the key through the already authenticated Supabase CLI and keeps it in memory. It records only test IDs, check names and sanitised outcomes in `.vercel` receipts. The CLI path and known beta project/host are explicit in the script and must be reviewed before reuse on another machine or environment.

```sh
# Main hosted transport/API/privacy/credit/approval tests: passed.
node scripts/verify-interview-hosted.mjs --authorised-public-beta-test

# Targeted recovery/rolled-back retention/account cleanup: passed.
node scripts/verify-interview-hosted.mjs --authorised-public-beta-test --recovery-only

# Simultaneous uploads and signed playback/deletion: one criterion fails.
node scripts/verify-interview-hosted.mjs --authorised-public-beta-test --media-only --actual-tus-client
```

Final receipts:

- Main: `.vercel/interview-hosted-67a394d7-fb0e-4c1d-9e71-ab8ecc36ff53.json` — no test failure or cleanup error.
- Recovery: `.vercel/interview-hosted-929b5cba-aa6e-4c94-b96e-992de6f7ce2e.json` — no test failure or cleanup error.
- Actual TUS client: `.vercel/interview-hosted-6fa4773f-9dcf-44f8-8e8f-6a64bcf0371e.json` — simultaneous-upload criterion unresolved; remaining checks and cleanup passed.

Earlier runs corrected harness mistakes around streamed redirects and a local variable shadowing the URL constructor. Their cleanup completed. One aborted transport run had already sent a partial TUS chunk; saved-object deletion and account deletion do not prove immediate purging of provider-managed temporary upload sessions. Supabase documents a maximum 24-hour upload-URL validity. No student data was in these temporary bytes, and the deleted fixture shell prevents finalising that recording.

## Remaining acceptance

- Resolve the simultaneous-upload result above.
- Test actual browser camera/microphone capture, codec/container validity, playable video, dual recording and the full desktop/mobile permission/orientation matrix. The transport fixtures were deliberately not playable recordings.
- Configure the dedicated AI marking key and test real transcription/assessment/audit with a non-sensitive recording, including model restrictions and provider failures. No provider keys were changed and no provider requests were deliberately made by this harness.
- Use isolated staging for simultaneous global worker claims and retention-versus-submission races. The claim/retention routines select across the global queue, so these tests did not mutate or claim unrelated live work. Targeted lease fencing and rolled-back retention passed separately.
- Exercise the complete human-review browser flow and the staffed internal/pilot programme.

## Local verification and changed files

`node --check scripts/verify-interview-hosted.mjs` and ESLint checks passed. Full `npm run lint` passed with zero errors and the existing `past-session-review.tsx:80` image warning. The first full lint attempt also traversed the local Vercel release snapshot's generated build output; `eslint.config.mjs` now excludes `.vercel/**`. Application source remains linted. No runtime application changes or redeployment were required for these tests.

Changed files: the operator harness, `eslint.config.mjs`, this report, and the linked release/handoff/runbook documentation. The prior successful production build remains recorded in the release handoff; it was not rerun for test-harness and documentation-only work.
