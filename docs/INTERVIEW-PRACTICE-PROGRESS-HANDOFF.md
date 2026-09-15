# Interview practice calendar and self-ratings

## Behaviour

The interview dashboard replaces the placeholder focus map with two calendar months (current month and previous month by default). Earlier months can be browsed. Calendar dates and Monday–Sunday weeks use Australia/Sydney, including daylight-saving transitions. Day selection immediately updates the day detail and weekly theme table; the visible calendar data is already loaded, so these interactions do not request another page.

Completed rehearsals and saved mock responses count once each. Each MMI station counts as one practice; each panel response counts as one practice. A full MMI contributes eight saved responses and a full panel contributes its saved responses individually. A station is assigned its main theme (the first theme in its existing category); historical unknown station IDs appear as Other rather than being misclassified. Existing ready recordings are backfilled at their recorded save-start timestamp. Previous unrecorded rehearsals cannot be reconstructed.

Students can optionally rate a completed rehearsal or selected saved recording from 1 to 5, change the rating, or remove it. Weekly averages use only rated responses and show the number rated. Unrated responses still contribute to practice counts. These are self-ratings; tutor feedback, tutor scores and marking credits are not involved.

The next-practice suggestions use the last 28 Sydney calendar days, prioritising lower self-ratings, missing theme coverage and longer gaps. Each suggestion gives its reason and links to an available station’s preparation screen. Recommendations remain current when the student browses historical calendar months. They are practice prompts, not predicted interview scores.

## Persistence and failure states

Migration `0041_interview_practice_progress.sql` creates `interview_practice_logs` with owner-only reads and server-only writes. Starting a rehearsal creates an unfinished log. Completion requires the preparation window to have passed and some response time, and stamps completion once; retries do not duplicate a session or change its date. Stopping during preparation does not count. The student may continue without tracking if starting the tracking request fails; the page clearly identifies that session as untracked. Completion and rating failures offer retry without claiming success.

A database trigger logs ready recordings within their save transaction. Repeated finalisation does not create another log or overwrite a self-rating. Historical ready recordings are backfilled without copying transcripts, audio/video, question text or feedback. Deleting a recording deletes its practice log; normal media expiry retains the attempt and therefore retains practice history. Account deletion cascades to all logs. Unfinished logs are excluded from every progress calculation.

The dashboard loads a bounded two-month window plus its complete boundary weeks; historical views load current recommendation data separately. Reads are paginated so Supabase’s default row cap does not silently truncate counts. A failed/missing database query shows an unavailable state rather than fabricated zeros. No additional paid service, AI call, production environment variable or SMTP change is required.

## Verification

- Local tests cover Sydney midnight, DST, leap years, week/month/year boundaries, retry deduplication, unrated averages, theme mapping and recommendation reasons.
- An executable local PostgreSQL-compatible migration test verifies backfill, insert/finalisation triggers, row ownership, write grants, rating bounds and deletion cascades.
- API tests verify authentication, foreign-origin rejection, forged ownership/fields, preparation-only rejection, completion idempotency, rating validation/removal, cross-account denial and unavailable persistence.
- Desktop and mobile previews use clearly labelled synthetic history. Calendar day selection and the resulting historical-week counts were checked in the browser. No real recording was played or altered.
- All 39 interview tests pass. Full lint passes with one existing image warning in `past-session-review.tsx`; the production build passes. Results are recorded in `.vercel/practice-progress-*.log`.
- Independent Impeccable review returned **ship** for the scoped desktop/mobile UI. Screenshots and the as-built surface contract are under `.impeccable/`. Hosted persistence and cross-account isolation now pass on the public release.

## Published release

Published at https://studocyte.emeducate.com.au/interviews from GitHub main commit `4d1c2ab567972fc954e74750f700658967fd142b`. Deployment `dpl_9yKD9voCyN5v48eWgJzEgVkTmj3V` is READY and both public aliases were verified. The source now includes the dashboard and previously released interview workflows, preserving the newer carousel/marketing source and the email-origin fix. The publishing tree is clean; the unrelated main workspace was not committed or pushed.

The user explicitly approved the private practice-history migration and publication. Migration 0041 is applied; one existing ready recording was backfilled. The verification fingerprint confirmed existing recording rows were unchanged. Owner-only reads and server-only writes were verified. Earlier wrapper attempts rolled back cleanly; the wrapper’s literal dollar quoting was corrected before successful application.

All 39 interview tests and 3 email regression tests pass. Full lint passes with one existing image warning. The previously released exam-runner loading fix was restored to resolve its reintroduced lint error. Local and hosted production builds pass. Hosted checks verify rehearsal completion and retry handling, optional 1–5 ratings and removal, cross-account isolation, full-mock response counts, recording deletion semantics, and unchanged roles/credits. All disposable accounts and practice rows were removed.

The public illustrative preview was checked in the browser: selecting 14 August immediately showed that week’s four practices and 3.7/5 average. Automatic approval review blocked the optional authenticated browser walkthrough through a local fixture redirect. That route was not retried or bypassed; the fixture was deleted and the public preview was used for visual verification. Authenticated hosted API/database and server-rendered dashboard tests passed separately.

Evidence: `.vercel/practice-progress-migration.json`, `.vercel/practice-progress-hosted-checks.json`, `.vercel/practice-progress-public-aliases.json`, and `.vercel/practice-progress-{integrated,public}-*.log`. Earlier candidate `dpl_9fPbm52ScXnCcqSgtBceXzNjewVp` is historical and must not be promoted.

No new paid service, SMTP update or production environment change was made. Self-ratings remain separate from tutor marking. Prior unrecorded rehearsals cannot be reconstructed; new completed practices and existing saved recordings populate history.

## Rollback

An application rollback can leave the private practice table in place, retaining student history. Do not drop a table containing real history as a routine rollback. Preserve the current publishing source and email fix when choosing a rollback; do not restore an old isolated release wholesale. Disabling the recording trigger would create a gap in activity history and needs explicit assessment.
