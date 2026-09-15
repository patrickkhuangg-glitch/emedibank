# Browser upload authentication fix

## Incident and cause

A real Chrome recording reached partial upload progress and failed. Chrome's response body reported `Invalid Compact JWS` (HTTP 400, storage status 403). The local recording remained available in the review screen.

`uploadInterviewMedia` assigned Authorization both in the initial tus headers and in `onBeforeRequest`. The installed tus-js-client browser transport forwards each assignment to `XMLHttpRequest.setRequestHeader`, which combines repeated values. Storage therefore received two bearer tokens as one malformed credential. The Node transport used by earlier hosted transport tests did not reproduce this browser behaviour.

## Change

Only `onBeforeRequest` now sets Authorization, exactly once per request, using the current session. Token refresh between chunks is retained. Error messages distinguish authentication rejection from a generic interruption and do not expose raw tokens, paths or service responses. No database, storage policy, environment or dependency changes.

Implementation: `src/lib/interviews/video-upload.ts`.
Regression tests: `tests/interview-upload.test.ts`.

## Verification

The regression loads the actual installed tus browser transport and simulates XHR header combination. Before the change it failed with the same upload error. After the change a 7 MiB fixture completes POST and PATCH with a single, refreshed Authorization value on each request. Authentication-error redaction also passes.

All 17 interview test groups pass. Full lint passes with the pre-existing image warning. Local production build and hosted Vercel Turbopack build passed. Deployment `dpl_JAdVn6qmSennFkGqNHdERaAKGzdH` is promoted to both public beta aliases. The previous deployment is `dpl_8xfhqx5mto3zqaCryViNuEVbYmo4`.

The original user recording tab remains open. Recovery used a fresh Chrome tab on the same origin/account to load the fixed application and the existing IndexedDB draft. The original 32-second response uploaded successfully and the interface reached Session finished. The Recordings & feedback page then showed one saved Working through disagreement attempt, private self-review status, question timestamps and a rendered video player. No new recording, marking submission or credit spend was needed. The original tab remains open.

## Scope and limits

This fixes malformed browser upload credentials. It does not resolve the previously recorded separate same-path TUS concurrency behaviour. Earlier hosted acceptance limitations remain documented in `MOCK-INTERVIEWS-HOSTED-TESTS.md`.
