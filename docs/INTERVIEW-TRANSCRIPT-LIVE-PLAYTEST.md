# Live practice recording and transcript playtest

7 September 2026. Public release tested: `c33dc58f8db164ff27129e9d7721e824087b6e4c` at https://studocyte.emeducate.com.au.

## Original playtest result

Recording and transcription passed for a controlled spoken sample. Question grouping failed on the live site, so question-by-question marking readiness is not established.

The test signed a temporary student into the normal public login form using isolated Chrome. A synthetic microphone supplied four spoken answers to the live **Working through disagreement** MMI station. The full two-minute preparation timer ran unchanged. Recording started automatically; all four question transitions worked; the resulting 105-second recording played back and saved through the real upload/finalisation endpoints. The hosted worker transcribed its audio without manual queue intervention, taking approximately 61 seconds after saving.

## Transcript quality

The source and resulting transcript both contained 263 words under the comparison's normalisation rules. Four word differences were spelling or inflection variants: summarise/summarize, practise/practice, realised/realized, and learnt/learned. No substantive wording was omitted or invented in this sample. The raw word error rate was 1.52%, entirely explained by those variants.

This was clean synthetic speech. It does not establish accuracy for accents, background noise, overlapping speech, quiet microphones or eight-minute spontaneous answers.

## Original findings (repaired below)

1. **Live question grouping does not complete.** The student page showed “Question grouping is currently unavailable” and retained one full transcript block. A separate disposable fixture reusing the exact transcript reproduced the failure. The endpoint returned HTTP 200 with `status: unavailable`; the private cache showed `status: failed`, `attempt_count: 1`, and no layout. The database claim and failure-write path therefore works; failure occurs within the grouping operation. The hosted error is deliberately generic, so these checks do not distinguish provider authentication, model access, malformed output or another grouping exception. Check the hosted Responses API/model permissions and capture safe provider status/error codes before claiming a fix. The local transcription credential was rejected by the provider, but it is not evidence about the currently deployed credential; live audio transcription succeeded.
2. **The tutor marking screen still renders a single original-transcript block.** `src/app/(app)/admin/interviews/[attemptId]/page.tsx` has not adopted the new grouped display. Even after the student grouping failure is corrected, the tutor interface needs its own authorised grouped read/display with the full original available. The marking provider currently receives the original transcript and saved questions; this playtest did not submit for paid marking or validate an assessment.

## Preservation and cleanup

No marking submission was made. Temporary accounts, synthetic attempt rows, audio objects, usage rows and dependent transcript-layout caches were removed. No production configuration, application source, migration or deployment was changed during this playtest. Administrative credentials and test passwords stayed in memory.

## Evidence

Artifacts are under `.vercel/transcript-questions-release/.vercel/transcript-playtest/` in the main workspace:

- `receipt.json`: real recording, playback, upload, transcription, failure and cleanup observations.
- `source.json` and `accuracy.json`: exact synthetic source and word comparison.
- `failure.png`: live student transcript page showing the grouping fallback.
- `diagnostic.json`: isolated grouping reproduction and private cache status.

The recording/transcription result is positive, but the overall playtest must remain a failure until live grouping and the tutor-facing presentation are verified.


## Repair verification — 7 September 2026

Published repair: `3338fe283c107fd3078dbcb020a061cbe43e7ec1`, deployment `dpl_5jvGBdaVXNxPTBUxwfWmXpsqCvhU`.

The live four-question sample now groups correctly: **17/17 sentences, all four complete answers, no unassigned passages**. This was verified through the existing authenticated admin's fixed synthetic grouping check using `gpt-4.1-mini`. Each heading contains its answer and supporting details; expanding the original transcript shows the complete recording-order text. The check uses the exact transcript from the earlier real microphone/transcription playtest, the production grouping provider, and the same presentation component as students and reviewers.

The first repair established provider connectivity but produced poor semantic assignments. It was superseded by explicit sentence-unit IDs, contextual answer-boundary instructions, and a stronger default text model. The quality check now compares every assignment to independent expected boundaries; a successful API call alone does not pass it. Expected answers are never sent to the model. Original speech is never rewritten by grouping.

The admin marking page now uses the shared grouped-transcript component with a separate, same-origin, admin-only endpoint restricted to submitted markings. Safe provider diagnostics are visible to admins. Legacy presentation caches refresh when their authorised recording is opened; processing jobs and current retry limits are preserved. Original recordings, transcripts and feedback remain intact.

**Validation:** 62 interview tests pass; full lint has no errors and one pre-existing image warning; the production build passes. The published student grouping, admin grouping and admin check endpoints all reject unauthenticated requests with HTTP 401. Deployment is Ready and the public site served the revised model and quality result.

**Limits:** The admin queue had no existing submissions. Automatic approval review rejected a script that would create temporary production accounts and grant an admin role; it was not run. The replacement live check uses existing admin access and creates no accounts or database rows. Reviewer authorisation and submitted-only gating were tested automatically, but a fresh submitted-marking browser walkthrough was not performed. This repair did not repeat the microphone capture or submit for marking; the original recording/transcription result remains as recorded above. Clean synthetic speech is not proof of accuracy for every real response.

No environment variables, schema, account permissions or marking credits were changed. Unrelated workspace changes were preserved. Repair receipt: `.vercel/transcript-questions-release/.vercel/transcript-playtest/fix-receipt.json`.
