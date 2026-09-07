# Question-based transcript review

Prepared 7 September 2026, based on public release `0a799c6`.

## Student experience

A selected recording displays the saved question wording and its response in separate sections. Single-question panel responses use the entire transcript directly, without another provider call. Multi-question responses are grouped by meaning when a saved response is opened. Students can expand the full transcript in its original recording order. Unclear or unrelated speech stays visible under “Other parts of your response”; a question with no assigned passage is labelled “No matching passage was identified”. These headings are navigation aids, not marks or a claim that an answer was correct.

The grouping applies to older saved recordings as well as new ones. It uses the recording's saved questions, not the current question bank. Newly saved transcripts are checked automatically for about two minutes; students can also select Check transcript or return later. Missing configuration, unavailable schema, provider errors, refusals or invalid grouping keep the original transcript readable.

## Preservation and privacy

The existing audio-to-text model, original transcript column, recording, transcription queue and marking pipeline are unchanged. A separate Responses request returns only one question index or null per sentence unit. It cannot supply replacement wording. Server validation requires exactly one assignment per unit; spans cover every original character once without gaps or overlaps. Long sentences are divided at word boundaries. Unicode, whitespace, repeated answers and uncertain passages are preserved. Grouping is approximate and can be mistaken; the original remains available for checking.

Owner-authenticated, same-origin POST requests use the saved transcript and questions. No client-supplied text or question list is sent to the provider. The cache uses original-content fingerprints, per-attempt locking, a 90-second lease, fenced result writes and at most three provider attempts per source version. Changes to the original text or saved questions invalidate the cache. Deleting a recording cascades to its grouping cache. Marking credits are not consumed. The provider call uses `store:false`; this does not promise zero retention outside the API account's configured data policy.

## Required release step

Apply only `supabase/migrations/0043_interview_transcript_layouts.sql` before publishing this release. It creates a private presentation-cache table and two service-only functions; it does not backfill or modify existing recordings/transcripts. Anonymous and authenticated database clients cannot read or write the cache directly. Existing owner checks precede every API read. No production migration or deployment has been performed for this prepared change.

The default grouping model is `gpt-4o-mini`, using `OPENAI_TRANSCRIPTION_API_KEY`. That key must permit Responses API calls and the selected model. If the transcription key is restricted, the operator can supply `OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY`. Optional `OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_MODEL` overrides the grouping model. This is an additional small text-processing request for multi-question transcripts, cached thereafter; it is separate from audio transcription limits and marking credits. No new paid service is created and no environment settings have been changed.

Official implementation references: [GPT-4o mini model support](https://developers.openai.com/api/docs/models/gpt-4o-mini) and [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Local Next.js 16.3.3 route-handler and client-component documentation was read before editing.

## Validation

Tests cover exact wording/whitespace preservation, uncertain and repeated passages, invalid or incomplete provider results, single-question and raw fallbacks, owner isolation, cross-origin rejection, cache hits, missing configuration/schema, stale and parallel jobs, bounded retries, no transcript mutation and deletion cleanup. Provider requests use synthetic transcripts in tests; no student data was submitted to OpenAI during implementation.

Release logs are in the parent `.vercel` directory: `transcript-sections-tests.log`, `transcript-sections-lint.log`, and `transcript-sections-build.log`. Publish only the isolated `codex/transcript-question-sections` release, preserving unrelated work in the main workspace.

Final verification: the local component preview displayed three question sections and the full-transcript disclosure correctly. No live provider invocation or production database change was performed. The 59-test interview suite, full lint (one pre-existing image warning) and production build with Webpack passed.
