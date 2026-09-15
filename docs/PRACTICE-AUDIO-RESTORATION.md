# Practice audio restoration — 7 September 2026

## Student experience

Practice offers **Record audio & begin preparation** and **Practise without recording**. Only microphone access is requested. Preparation is not recorded; the response is. Leaving the tab ends the recording and releases the microphone. After the response, students can play or download the local audio and select **Save audio & transcribe**. Interrupted saves resume without creating a second recording. Local audio survives failed saves while the tab remains open; closing/reloading the page loses unsaved audio, with a leave warning provided.

The Practice lobby links to `/interviews/practice/recordings`. This private, paginated library shows audio and transcripts together with self-rating and study notes. Only a selected recording loads its signed playback URL and transcript. New practice audio is excluded from the Mock Interview library; historical mock and audio entries remain accessible there as before. Existing historical audio also appears in Practice recordings.

## Existing transcription pipeline

The new initiation route creates an idempotent, owner-bound `media_kind=audio` upload shell with a canonical station snapshot. It uses the existing direct resumable Storage uploader and shared finalisation endpoint. Finalisation validates audio MIME/size and atomically queues the existing transcription job. The worker uses the original recording path for audio, the existing transcription provider/model and existing quota checks. It retains the original audio for playback. No marking request is created and no marking credits are spent.

The existing practice-history trigger logs each saved recording once. Recorded practice does not also create an unrecorded rehearsal entry. Preparation-only attempts do not count. The existing cleanup endpoint now removes abandoned practice-audio shells older than 24 hours, rechecking status atomically so concurrent successful saves are protected. Saved audio retains its existing retention policy.

## Operator configuration

No new migration, paid service or environment variable is required. Transcription uses the existing `OPENAI_TRANSCRIPTION_API_KEY`, optional `OPENAI_INTERVIEW_TRANSCRIPTION_MODEL` (default `gpt-4o-mini-transcribe`), and scheduled interview worker authenticated with `INTERVIEW_WORKER_SECRET`. Keep the existing processing and cleanup schedules active. Existing rolling recording/storage/transcription limits still apply.

Missing provider credentials or provider failures preserve saved audio and leave transcription retryable through the existing job pipeline. The client shows processing/retry states; students can reopen or refresh the saved recording to see completed transcripts.

## Validation and limits

All 47 interview tests pass. New coverage includes microphone-only constraints and formats, no recording during preparation, idempotent stop and track release, authenticated/canonical upload initiation and retry, audio finalisation, existing worker success and missing-key behavior, one transcription job/calendar entry with zero credit spend, private library pagination/detail rendering, and cleanup races protecting saved/legacy/video recordings. Full lint has zero errors and one existing image-element warning. Full production build passes.

Tests use synthetic recorder/provider fixtures and local database execution. This change has not been exercised with a real microphone or live paid transcription request, and has not been published. No real student accounts, recordings or production settings were changed during this implementation.
