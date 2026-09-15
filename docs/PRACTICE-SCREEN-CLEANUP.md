# Practice screen cleanup and recording-count limit

Prepared 7 September 2026, on top of the published audio restoration.

- Removed the bottom “Recordings & transcripts” and “View practice calendar” links from the practice session. The Back to practice stations link remains. Audio and transcripts remain accessible from the Practice lobby and after saving.
- Split the supplied introduction into four short paragraphs and emphasised preparation/response timings. The timings still follow the selected MMI/panel format.
- Removed the ten-per-day text from this practice screen.
- Migration `0042_practice_audio_recording_limit.sql` replaces only the recording-quota trigger function. Canonical practice audio (`media_kind=audio`, server-owned snapshot source `practice_audio`) no longer checks or consumes the daily recording allowance. Storage enforcement and its locking remain intact. Mock video and legacy recording-count rules remain unchanged.
- Transcription quotas remain separate: reaching the processing allowance defers transcription through the existing queue; it does not prevent saving practice audio after this migration. Historical usage receipts remain unchanged and age out of the mock counter naturally.

Validation: all 48 interview tests pass; full lint has zero errors and one existing image warning. The new database regression creates 25 completed practice audio recordings, verifies zero consumption of mock allowance, then verifies the mock daily cap, storage cap, transcription cap and unchanged marking credits. It also rejects a video tagged as practice audio from bypassing its count limit.

Release the screen together with the database migration so the displayed policy matches enforcement. Applying the live migration and publishing still require operator authorisation under the original production restrictions. No environment variables, paid services or existing student records need to change. The production build result is recorded in `.vercel/practice-screen-build.log` alongside this release worktree.
