# Interview backups and marking turnaround

## Database recovery

Verified 8 September 2026: the production Supabase Sydney project has completed daily physical backups, WAL-G enabled and PITR disabled. The seven-day history includes daily backups around 17:44 UTC (03:44 Sydney standard time); Supabase controls the exact schedule. Latest observed completed backup: 7 September 2026 17:43:48 UTC. Pro retains seven days. This is approximately a 24-hour database recovery-point objective, not point-in-time recovery. Database backups do not contain Storage object bytes. The earlier isolated logical restore drill passed; it does not establish that a physical restore has been tested.

## Recording backups

Dedicated private Cloudflare R2 Standard bucket: `studocyte-interview-backups`, automatic location Oceania. Oceania placement is not a contractual Australia-only residency guarantee. Public access must stay disabled. R2 encrypts bytes at rest using provider-managed keys; all transfers use TLS. This is not client-side encryption or an immutable ransomware vault.

The website uses an object read/write key restricted to this bucket, stored only in Vercel Production secrets. The key must not have bucket administration permission. Required variables:

- `INTERVIEW_BACKUP_R2_ACCOUNT_ID`
- `INTERVIEW_BACKUP_R2_BUCKET`
- `INTERVIEW_BACKUP_R2_ACCESS_KEY_ID`
- `INTERVIEW_BACKUP_R2_SECRET_ACCESS_KEY`

The authenticated backup route runs every five minutes. Two database-leased workers copy at most 20 objects per invocation, streaming files instead of buffering videos. Jobs share a global two-worker ceiling, use five-minute leases and 90-second storage timeouts, and retry with bounded backoff. Each successful backup records its byte count and SHA-256 digest. A storage metadata check confirms length; the recovery tool verifies the complete content digest before restoring.

The saved recording's original expiry is authoritative. Backups are removed after seven days from saving, not seven days from copying. Pending marking is protected until review ends. If already seven days old, its backup becomes due for deletion immediately on release/ungradable status. Do not configure a blanket seven-day R2 lifecycle rule: it would delete recordings still awaiting review and does not follow original save dates.

Deletion happens on the next successful worker run; it is not an exact-second guarantee. A backlog or provider outage delays physical deletion, and monitoring flags failures. Account/attempt deletion leaves a tombstone until R2 confirms deletion. A paginated object sweep finds orphaned objects left by interrupted writes; 100 objects are checked per run, so a full sweep of a large bucket takes multiple runs. The sweep never overrides current retention or active leases. Source recordings remain governed by the existing cleanup queue. Transcripts and released reports are not erased by recording cleanup.

A backup is recoverable only after copying succeeds. Five-minute scheduling is a target, not a guaranteed recovery point under a backlog. Failed copies, a stale successful run (15 minutes), old pending copies (30 minutes), repeated failures and stalled deletions raise existing deduplicated operational alerts. The admin panel shows backup enablement and queue counts. Disabling the database `interview_backup_health.enabled` flag pauses both copying and deletion; use only during an incident, and resume promptly.

## Restore one recording

Run from a trusted operator terminal with the four R2 variables set in memory and an authenticated Supabase CLI. Do not paste keys into commands, tickets or source files.

```
node scripts/restore-interview-recording.mjs ATTEMPT_UUID --check-only
node scripts/restore-interview-recording.mjs ATTEMPT_UUID --restore
```

The first command downloads and verifies the backup in memory without writing. The second restores only a missing primary object, refuses overwrites, checks account/attempt existence and retention before and after transfer, and never changes the original expiry, transcript, marking status or credits. If expiry races restoration, it removes the newly restored object. If that removal fails, follow the reported operator action immediately. A whole-database restore needs a separate coordinated recovery procedure: reconcile accounts, expiry and backup receipts before opening the site to students. Never restore expired media merely because an older database snapshot references it.

## Turnaround and escalation

Promise: **two working days, excluding weekends**, using Australia/Sydney. Count 48 hours on weekdays, including overnight hours; exclude all Saturday/Sunday hours. Public holidays are not excluded. Examples: Monday 14:30 → Wednesday 14:30; Friday 14:30 → Tuesday 14:30; Saturday submission → Wednesday 00:00. Sydney daylight-saving changes preserve weekday local times. Tutor edits do not reset the clock.

Students contact `support@emeducate.com.au`. Patrick (`p.huang@emeducate.com.au`) owns stalled processing and overdue marking; Elaine (`e.zhang@emeducate.com.au`) is backup. Overdue-review alerts go to all three addresses. Other queue/cleanup/backup alerts retain the primary destination. Review the oldest overdue submission, confirm recordings are protected, assign a reviewer, and reply to the student with an updated delivery time. Do not release an automated draft to meet the deadline.

Alert overrides: `INTERVIEW_SUPPORT_EMAIL` and `INTERVIEW_BACKUP_OPERATOR_EMAIL`. Existing delivery uses durable claims, stable provider idempotency keys, reminders and recovery notifications. No transcript or recording is included in alert emails.

## Live Practice relay

Cloudflare Realtime TURN uses a server-only long-lived key to mint short-lived credentials for each authorised live-room request. Configure `INTERVIEW_TURN_KEY_ID` and `INTERVIEW_TURN_API_TOKEN`; do not place the long-lived token in browser-visible variables. The application requests two-hour credentials, validates the returned ICE server list and sends only the temporary username and credential to the signed-in room owner. Static `INTERVIEW_TURN_URLS`, `INTERVIEW_TURN_USERNAME` and `INTERVIEW_TURN_CREDENTIAL` remain as a legacy fallback for another provider.

## Costs and release gates

At 200 students × five saved hours/month, estimated R2 storage is $0 audio-only, ~$0.33 for four hours audio plus one video per student, or ~$1.85 video-only, using current bitrate targets and evenly spread seven-day retention. Supabase transfer adds up to ~$2.59 / $12.31 / $51.19 respectively if its existing allowance is exhausted. These exclude worker compute, subscriptions and tax; pending marking can extend retention.

Before enabling live copying: apply migrations 0057/0058, configure the restricted key, deploy the authenticated cron, verify anonymous access is denied, then enable the backup health flag. Verify a disposable hosted audio/video fixture can be copied, integrity-checked, restored and deleted; preserve no fixture recording afterwards. Record deployed IDs and check results in `artifacts/ongoing-backups/`. Do not mark hosted recovery verified from local mocks alone.

## Published verification — 8 September 2026

Published deployment `dpl_BzSLWsSnsE6Ufu2jf7ALqx1VMUa2` to https://studocyte.emeducate.com.au. Release source: `.vercel/recording-backups-release`, built from 371 files whose hashes matched the previous live deployment; only the backup, turnaround and required dependency/type changes were overlaid.

- Migrations 0057 and 0058 passed a hosted rollback preflight, then applied successfully. Backups are enabled.
- R2 account subscription active; bucket private, Standard class; object-only key scoped to this one bucket saved as sensitive Production variables. Temporary credential memory cleared after verification.
- 158 interview checks passed, followed by the added endpoint-authentication check (8 targeted backup/restore/turnaround checks passed). Full workspace and isolated-release lint passed with one existing unrelated image warning. Both production builds passed.
- Hosted disposable 256 KiB audio and 8 MiB video byte fixtures were copied, fully SHA-256 verified, restored to missing primary objects and compared byte-for-byte. These are synthetic storage fixtures, not speech-quality or AI-marking validation.
- Expired backups physically disappeared. Pending marking protected the video until it was released. Transcripts remained. All fixture users and objects were cleaned up.
- Deployed backup endpoint: unauthorised request 401; authenticated request 200, configured true, zero failures.
- Public alias verified against the deployment. Vercel cron is enabled, points to this deployment and schedules backups every five minutes. First observed automatic success after promotion: 08:45:29 UTC, no backup error. Ready backup count at verification: one real recording; two deleted fixture tombstones.
- Overdue-review recipient routing was tested locally. This release did not send a synthetic escalation email to support or Elaine, so delivery to those two inboxes is not claimed verified.

Evidence: `artifacts/ongoing-backups/migration.json`, `hosted-verification.json`, `deployed-worker.json`, `publication.json`, `scheduler.json`, build/lint logs and test results. No credentials or recording bytes are included in these receipts.
