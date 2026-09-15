# Interview video marking: operator runbook

**Current follow-up:** [Recording library and 2/1/12-credit pricing](MOCK-INTERVIEW-RECORDING-LIBRARY-HANDOFF.md) supersedes the earlier one-credit-per-response pricing below. Historical release details remain for reference.

Status: Mock Interviews is enabled on the public beta following the user’s authorisation on 6 September 2026, including its database and environment configuration. The flag still defaults off when unset. See `MOCK-INTERVIEWS-BETA-RELEASE.md` for the deployment record and outstanding acceptance checks. No paid service or plan upgrade was created.

## Location in the interview platform

**Mock Interviews** is a separate section in the desktop/mobile navigation and interview dashboard:

- `/interviews/mock-interviews`: select an MMI station or panel response; explain private recording and the optional one-credit marking step.
- `/interviews/mock-interviews/session?format=mmi|panel&station=<station-id>`: camera setup, timed recording, local preview/discard, and private save.
- `/interviews/mock-interviews/review`: recordings, transcripts, submission status, marking requests, and approved feedback. Existing historical audio and video attempts remain here.
- `/interviews/review`: compatibility redirect to the new recordings page.
- `/admin/interviews`: staff queue, now labelled Mock Interview reviews; backend endpoints, credit balances, storage, and database records are unchanged by the route separation.

`/interviews/practice` remains a separate timed rehearsal area. It does not request media permissions, upload recordings, save attempts or spend credits, and works while the recording feature flag is off. Students can move from a rehearsed station to the same station in Mock Interviews. New mock recordings still respect `INTERVIEW_VIDEO_MARKING_ENABLED`; saved attempts remain readable while disabled. No extra migration or environment variable is required for the new section.

Staging navigation checks: confirm separate active navigation for Practice and Mock Interviews; navigate from dashboard to both formats; follow recording → save → review → marking → released feedback; verify old review bookmarks redirect and existing attempts play; confirm mobile menu access and the disabled-state message.

## Workflow and trust boundaries

Students grant camera/microphone access, preview, prepare, record a bounded response, then preview/discard locally. Nothing uploads until Save attempt. Browser TUS uploads video and a separate microphone copy directly to the existing private `interview-recordings` bucket. A saved video survives an unavailable audio copy. Self-review and transcription spend no credit. Submitting costs one existing `mmi_credits` credit atomically. A durable Postgres queue transcribes, prepares a content-only AI assessment, and audits the evidence. Admins alone review the full recording, edit structured feedback, and acknowledge full-video review before release. A manual mark works with no AI keys or transcript. Students see only status until human approval.

`interview_attempts` remains owner-readable. New private working, job and event tables have RLS and no student grants/policies. Server routes own writes and authorise before privileged access. Submission requires a server-written, 60-second preflight permit after the feature flag and media checks; the authenticated RPC consumes it atomically. Calling the RPC directly cannot bypass the disabled feature or media preflight. Credits, refunds, job completion, review release and cleanup reservation use transactions. Draft saves use optimistic versions. Signed playback URLs last ten minutes and are never persisted; Renew playback obtains a fresh authorised URL. General tutors have no review access. Identity is recorded privately; students see “EMEducate reviewer”.

## Install and migrations (operator action)

1. Use a **non-production** Supabase project with the application's historical migrations through 0032. Back up schema/data before rollout. Do not edit 0021 or 0023.
2. Install locked dependencies with `npm ci`. Development tests require Node 22.15+ (Node 24 was used); the application retains its existing Node type target.
3. Review and apply `supabase/migrations/0033_interview_video_marking.sql` through your established SQL migration workflow. It is transactional. Record the migration in your normal migration ledger if using a tool that does not do so automatically. It is intended to run once.
4. It adds video fields with historical audio defaults; creates `interview_markings`, `interview_processing_jobs`, `interview_marking_events`; adds private RPCs and indexes; drops direct student insert/delete policies and revokes attempt mutations; restricts Storage inserts to exact, recent server-created paths; revokes direct object deletion; protects the existing credit balance.
5. Apply independent migrations such as the concurrently present `0034_audit_fixes.sql` only through their own review. They were not authored or applied by this implementation.
6. Run the staging privacy and concurrency checks below before enabling. The local PGlite tests create isolated fixture schemas; they never connect to your hosted database.

## Supabase storage configuration

Keep `interview-recordings` private. Migration 0033 sets a bucket ceiling of **157,286,400 bytes (150 MiB)** and allows `video/webm`, `video/mp4`, `audio/webm`, `audio/mp4`, `audio/mpeg`. Existing historical objects remain; the MIME allowlist controls new uploads, not historical playback. Verify the **project-global** upload limit is at least this large and supported by the existing plan. Do not provision or upgrade a paid plan automatically. If the current global limit is lower, keep the feature off until an operator resolves it.

Immutable paths are `{user_id}/{attempt_id}/response.webm|mp4` and `transcription-audio.webm|mp4|mp3`. No names/emails occur in paths. No upsert is used. Both files use 6 MiB TUS chunks with retry/backoff and fingerprint removal on success. Hosted projects use the direct `.storage.supabase.co` host; custom/local URLs retain their origin. Browser session tokens authorise Storage only and are refreshed before requests. They are not logged. Confirm network policy/CSP permits your Supabase project and storage host, and microphone/camera Permissions-Policy allows this origin.

The server checks exact object presence, reported storage MIME, size, client duration bounds, and question-event bounds. Browser recording is the only product path. This does **not** provide forensic container inspection, video transcoding or arbitrary media import. A malicious custom API client cannot obtain a mark without human review; operators should inspect implausible media before release.

References: [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads), [standard uploads and size guidance](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [private bucket access](https://supabase.com/docs/guides/storage/buckets/fundamentals), [signed downloads](https://supabase.com/docs/guides/storage/serving/downloads), [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn). Deleting the object is the access-revocation mechanism; URL expiry alone is not deletion. Test revocation including CDN invalidation and previously loaded browser buffers; bytes already downloaded cannot be recalled.

## Environment configuration

All added values are server-only. Do not prefix them with `NEXT_PUBLIC_`.

| Variable | Required/default | Purpose |
| --- | --- | --- |
| `INTERVIEW_VIDEO_MARKING_ENABLED` | `false` if unset | Enables new camera sessions and marking submission UI/routes. |
| `INTERVIEW_WORKER_SECRET` | At least 32 random characters | Worker and daily cleanup bearer authentication. |
| `CRON_SECRET` | Same value as worker secret for Vercel | Vercel automatically sends this value in `Authorization: Bearer …`. |
| `OPENAI_TRANSCRIPTION_API_KEY` | Existing variable | Restricted audio-transcription key. |
| `OPENAI_INTERVIEW_TRANSCRIPTION_MODEL` | `gpt-4o-mini-transcribe` | Transcription model; persisted privately. |
| `OPENAI_INTERVIEW_MARKING_API_KEY` | Required for AI only | Restricted Responses API key. Manual marking still works without it. |
| `OPENAI_INTERVIEW_MARKING_MODEL` | `gpt-5-mini` | Primary structured content assessment. |
| `OPENAI_INTERVIEW_AUDIT_MODEL` | `gpt-5-mini` | Separate constrained evidence audit. |
| `INTERVIEW_VIDEO_RETENTION_DAYS` | `90` | Integer 1–3650; invalid values safely fall back to 90. |

Existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY` remain required. Do not replace the existing Stripe benefit `interview_mmi_credits` or database field `mmi_credits`. UI copy now calls these Interview marking credits.

Generate a secret through your normal secret manager and enter it in the chosen staging environment. Never paste secrets into tickets or this document. Configure preview/staging and production values separately. Missing provider keys result in sanitised retries followed by staff attention, not automatic release or lost video.

## Cron and worker operation

The public beta uses the existing Supabase project and Vercel Hobby plan:

- Supabase `pg_cron` runs `studocyte-interview-processing` every minute. It calls `/api/internal/interviews/process` through `pg_net` only when a job is due or a running lease is stale. Each request claims at most one job and has a 120-second timeout.
- `vercel.json` schedules `/api/internal/interviews/cleanup` daily at 17:00 UTC, reserving up to 100 eligible cleanup jobs and retrying deletion of up to 100 already-transcribed audio copies. Hobby execution can occur within its daily scheduling window.

No additional paid scheduler is needed. The setup script is `supabase/operations/mock-interviews-scheduler.sql`. Before applying it, create a Vault secret named `studocyte_interview_worker_secret`, using the same value as Vercel `INTERVIEW_WORKER_SECRET` and `CRON_SECRET`. Enter the value privately; do not commit it. The script creates the job **paused**. After deploying and verifying the protected endpoint, activate only that named job with `cron.alter_job`. The script's comments contain the exact activation query. Reapplying the script pauses the job again.

Verify the protected endpoint with the Vault-backed scheduler, inspect `cron.job_run_details` and `net._http_response`, and confirm unauthorised calls receive 401. Monitor queue age as one job per minute has limited throughput. Do not upgrade or purchase a service automatically. [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [Supabase Vault](https://supabase.com/docs/guides/database/vault).

GET and POST both work for the protected routes. Invoke with `Authorization: Bearer <worker secret>` from your scheduler/secret manager. Missing, short, malformed or incorrect secrets receive 401 before queue access. For Vercel set `CRON_SECRET` equal to `INTERVIEW_WORKER_SECRET`; setting only one will not work.

The queue is durable; there is no in-process background task or dependency on Next.js `after()`. Workers use a ten-minute lease, `FOR UPDATE SKIP LOCKED`, bounded 65-second provider requests, five attempts, exponential backoff with jitter (up to one hour), and lease-owner fencing at commit. A stale final lease becomes dead. Provider completion and successor enqueue are one transaction. A stale result cannot overwrite a released or actively reviewed mark. Duplicate cron calls do not claim the same live job. After downtime, recurring invocations drain the backlog. Three sequential stages generally mean several minutes of queue latency at this cadence.

## Restricted OpenAI key test

1. In a staging OpenAI project, restrict the transcription key to audio transcription and the selected transcription model. Restrict the marking key to Responses requests and the selected assessment/audit models. Set limits/alerts using the existing project controls; do not create a paid service here.
2. Record a short, non-sensitive internal answer. Save without submitting. Invoke the protected worker. Verify a transcript persists before its separate audio object is deleted and its pointer is cleared.
3. Give a staging student one test Interview marking credit through an authorised service-role operation. Submit twice concurrently. Confirm one charge and one working record.
4. Invoke the worker for assessment and audit. Verify schema validation and no private AI fields in student payloads. Inspect model/request IDs in private job logs. Requests use `store:false`; transcript text is delimited as untrusted data. Models never receive video.
5. Remove the marking key in staging temporarily, submit a new internal response, and verify retries/needs-attention plus manual marking. Restore it and use Retry AI assessment. Also exercise a model-not-allowed restricted-key error.
6. Watch the full video, edit all needed fields, approve, and confirm only the approved structured result becomes visible.

Model references: [GPT-4o Mini Transcribe](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe), [GPT-5 Mini](https://developers.openai.com/api/docs/models/gpt-5-mini). Local installed Next.js 16.3.3 route-handler, server-action and `after` documentation was read before implementation.

## Admin recovery

Open `/admin/interviews`. Counts cover all outstanding jobs, including self-review transcripts. Filters and 100-item pagination cover submitted responses; ready submissions sort first, oldest first. The operations list shows up to 1,000 outstanding jobs. Cancelled late AI jobs remain `dead`, so consult the audit trail to distinguish a cancelled stage from a provider failure.

- **Missing/poor transcript:** inspect video; retry transcription when an audio copy exists. If none exists, record correction notes and mark manually. Do not download/transcode the full video in the transcription worker.
- **Dead primary/audit job:** correct key/model/service configuration, then Retry AI assessment or Retry evidence audit. A running lease is not reset concurrently. Existing human draft fields remain until explicitly replaced.
- **Manual marking:** replace the draft, select applicable domains, complete evidence/scores/comments, strengths, priorities and practice task. Save incomplete structured drafts as needed. Start review prevents late AI from overwriting your work. Approval always requires complete valid feedback plus full-recording acknowledgement.
- **Stale reviewer tab:** a version conflict blocks overwriting another reviewer. Copy unsaved text if needed, then reload. Do not resubmit a stale draft blindly.
- **Ungradable:** enter a reason, mark ungradable and refund. One credit is returned at most once; release is blocked afterward.
- **Expired signed URL:** Renew playback. Missing object: restore access if recoverable, otherwise mark ungradable/refund. Approval rechecks object presence under its transaction.
- **Cleanup job dead:** inspect Storage service health and the opaque attempt/job IDs. After correcting the cause, a service-role operator may reset that **specific cleanup** job's status to `queued`, attempt_count to 0, available_at to now(), and locked_at/locked_by to null. Do not reset running jobs. The attempt's reserved `discarded` state prevents new uploads/submission until cleanup finishes. No transcript or feedback is deleted for a retained attempt.
- **Account deletion failure:** pointers and rows remain until storage cleanup succeeds; retry deletion. Some objects may already be removed. Do not claim that a failed account deletion restored deleted files. Account deletion uses batched object removal and opaque-ID logs.

Structured logs contain event, attempt/job ID, stage, outcome, and provider request ID where available. Never log response text, transcripts, signed URLs, auth tokens, keys, private notes, or student names. Stored provider errors are fixed codes and generic messages. Use attempt/event history to follow credit spend, review start, draft saves, refunds, release and failures.

## Retention and deletion

- Released video: retention days after release.
- Unsubmitted self-review video: retention days after creation.
- Ungradable video: retention days after staff resolution.
- Queued, processing, needs-attention and in-review marked responses: never removed by scheduled retention.
- Unfinished upload shells: after 24 hours, remove partial media and the shell.
- Transcription audio: after successfully persisted transcription; the daily sweep retries a failed removal.
- Transcript and approved feedback: retained after video expiry; deleted only with attempt/account.
- Historical audio attempts: preserved by scheduled video retention; remain playable and can retry transcription.

Cleanup reserves the row under the same lock used by submission before deleting Storage objects. Retained rows get `video_deleted_at` and a student-visible expiry message. Student Delete attempt is explicit, server-authorised and removes all known media plus every object under the attempt prefix before cascading database deletion. Deleting a submitted attempt does not itself refund a credit; the UI says so.

To change retention, set the staging server variable to an integer day count and test eligibility before rollout. The ready-screen copy says 90 days **by default**. Changing the policy does not resurrect previously deleted media.

## Verification recorded locally

After separating Mock Interviews: all nine interview test groups and the full lint/webpack production build passed again. Rendered-component checks verified distinct rehearsal/mock destinations, MMI and panel rehearsal entry states, the disabled-recording message, and the active recordings navigation. The build includes all three new Mock Interviews routes. These checks do not replace the pending browser/device and hosted staging acceptance below.

- `npm run test:interviews`: nine groups passed, using Node's test runner, `tsx`, PGlite Postgres and mocked application/provider adapters. No hosted database/provider requests. Covers RLS/permissions, immutable paths, credit/refund idempotency, worker leases, stale final leases, human acknowledgement/versioning/double approval, no-key manual approval, API authentication and ownership, canonical station data, partial/finalised uploads, transcript reuse, provider timeout/malformed output, persistence-before-audio-removal, schema/media/event bounds, status labels, retention and worker secrets.
- PGlite tests execute the actual migration against isolated Postgres fixture schemas. PGlite uses one database connection; concurrent Promise calls verify repeat/idempotent behaviour but do **not** replace multi-connection hosted Postgres contention tests.
- `npx tsc --noEmit`: passed after the final code changes.
- `npm run lint`: passed with zero errors; one unrelated existing `@next/next/no-img-element` warning in `src/app/(app)/practice/review/[sessionId]/past-session-review.tsx`.
- `npm run build`: attempted; Turbopack failed on the environment's local-port restriction (`EPERM`) while processing an unrelated existing CSS module. Retrying with escalated execution hit the same restriction.
- One later verification build encountered `ENOTEMPTY` while another build was using the shared `.next/server` directory; unrelated build files were not reset.
- `npm run build -- --webpack`: complete production build passed, including TypeScript, prerendering and route generation using the existing local environment. No production environment variables were changed.
- Local server startup was denied with `listen EPERM`. An isolated synthetic-media HTML fixture was prepared, but browser policy blocked local-file navigation. No alternate browser bypass was attempted. Consequently no browser/device, real TUS, hosted-RLS, real-key or physical recording result is claimed.

## Hosted follow-up and remaining staging acceptance

See `MOCK-INTERVIEWS-HOSTED-TESTS.md` for completed real TUS resume, privacy, concurrent credit/refund/approval, lease-fencing, deletion/recovery and rolled-back retention checks. The user authorised admin-key use in memory only; disposable accounts and saved test objects were removed. Same-path concurrent TUS completion remains unresolved. The physical device matrix and global queue race tests below remain pending.

## Required device acceptance matrix — still external

Use student A, student B, an admin and a general tutor. Record results with browser/device versions, orientation and failure drill. These are still required acceptance checks. The user explicitly authorised enabling the existing public beta before this matrix was completed; that does not make the pending checks passed. Staff the human-review queue before promising turnaround times.

| Browser/device | Portrait + landscape | Permission allow/deny/recover | Full MMI/panel | Preview/discard | Interrupted TUS/resume | Playback/seek | Submission/release |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Current Chrome desktop | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| Current Safari desktop | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| Current Edge desktop | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| iPhone Safari | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| Android Chrome | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

Browser limitations: prefers VP8/Opus WebM, falls back to supported MP4. Codec support is checked before preparation. Dual-recorder support still requires device testing. If separate audio capture fails, video survives and staff can mark manually. Closing/reloading the tab loses the in-memory recording; pause/retry resumes only while the file remains in the tab. TUS fingerprints do not restore lost local bytes. Hiding the tab during a response intentionally stops recording to avoid an unbounded recording under background timer suspension. No arbitrary uploaded MP4/MOV, transcoding, adaptive streaming, facial/gaze/emotion scoring or public sharing exists.

Additional staging assertions:

1. A cannot read B's attempt, sign B's media, insert arbitrary paths, update readiness/credits/release, or read any working/job/event row. General tutors cannot enter the queue. Anonymous private downloads fail. New uploads only match a current owner's shell. Confirm metadata and non-upsert enforcement on **real TUS**, including simultaneous same-path uploads.
2. On two independent database/HTTP sessions: simultaneous submit spends once; simultaneous refund refunds once; simultaneous worker invocation claims once; simultaneous approval releases once; stale versions cannot overwrite. Verify service-only functions reject both ordinary authenticated and anonymous roles. Verify real cascade behaviour.
3. Close tab during upload; wait for orphan cleanup. Let video succeed and audio fail; verify saved playback and manual marking. Pause/retry mid-video while retaining the tab. Delete media before review; approval must fail.
4. Simulate transcription timeout, empty/implausibly short transcript, primary timeout, malformed primary JSON, malformed audit, exhausted worker leases and missing keys. Nothing auto-releases. Resolve dead jobs or manually grade/refund.
5. Delete an account containing multiple historical audio/new video attempts and partial uploads. Check every object under user/attempt prefixes is gone and all dependent rows cascade. Simulate Storage failure and retry from retained pointers.
6. During retention, concurrently submit an eligible self-review attempt: either submission wins and preserves media or cleanup reserves it and submission safely refuses without charge. Confirm pending/in-review video remains. Advance release/creation dates in staging and confirm feedback/transcript survives video expiry.
7. In Supabase dashboard inspect Storage usage, object sizes and egress; compare before/after 10 internal videos. Target ~76 MB decimal for an 8-minute combined recording (browser encoders may vary). Watch actual size, upload/transcript/AI validation failure rates, queue age, reviewer time and score edits, refunds, storage and egress through a 50–100 response pilot.

## Safe rollback

1. Disable `INTERVIEW_VIDEO_MARKING_ENABLED`; new UI submissions/recordings close while historical and saved attempts remain readable. Keep the current compatible read/review/deletion code.
2. For an immediate **hard stop**, a service operator can additionally revoke authenticated execution of `submit_interview_for_marking(uuid)`. Disabling the flag stops new preflight permits; an already-issued permit otherwise expires within 60 seconds. Restore that grant only after re-enabling safely.
3. Pause the relevant cron schedule if processing is faulty; leave durable queue rows intact. Keep cleanup running only if its policy remains desired; pausing it temporarily preserves data.
4. Do not drop migration 0033, private tables, credit/event ledgers, historical columns, or the bucket. Do not restore broad client mutation grants. Do not roll back to the old synchronous upload route: it depends on removed direct-write policies.
5. Existing submitted credits stay accounted for; manually resolve/refund eligible ungradable work through the idempotent action. Resume jobs after a fix. No rollback step deletes audio attempts, recordings, transcripts or approved feedback.

## Product decisions

No unresolved product decision blocks the implemented flow; the defaults in the plan were used. Deployment readiness depends on operator configuration, actual browser support, hosted privacy/concurrency checks and staffed human review. Account deletion and 90-day video expiry intentionally cannot recall previously downloaded bytes. These are operational acceptance items, not completed tests.
