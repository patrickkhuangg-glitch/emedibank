# Upload reliability, email alerts and overdue marking

> **8 September follow-up:** Patrick confirmed receipt of the setup alert and ownership of both stalled work and overdue marking. See the [retention, recovery and support update](../security/INTERVIEW-RETENTION-RECOVERY-2026-09-08.md) for the passed live retention checks, published support card and successful isolated hosted logical restore. Managed physical-backup recovery and full application cutover remain separate checks.

Implemented for the public beta on 8 September 2026. This release follows the previous operations release; it does not change marking prices, assessment prompts, evidence handling or human approval.

## Upload reliability

- The shared upload helper now joins a private database queue before starting a transfer. At most eight cooperative client transfers run across the site and at most one per student. Oldest eligible requests go first. A student can still record, transcribe and self-review without a credit charge or daily usage allowance.
- Waiting clients poll with a random three-to-six-second gap. Active transfers renew a two-minute lease every 30 seconds. Pausing, completing or failing releases the slot. Closed tabs recover through lease expiry. Admission waits at most ten minutes before asking the student to retry, retaining the local recording.
- Storage retries use bounded randomised delays. Duplicate-object responses during upload creation go straight to ownership/size/type verification instead of repeating the same creation request. Offset conflicts during an existing upload can still resume. Authentication failures do not loop.
- Two minutes without transport progress stops the transfer and retains the recording for retry. Completion verification has a separate 15-second deadline.
- Practice and mock screens distinguish waiting, uploading, retrying, checking and final saving. Successful saves are confirmed only after the existing idempotent finalisation succeeds.
- Storage RLS, file limits, supported formats and exact object verification remain in force. The admission queue is cooperative, not a replacement for storage authorisation; tabs opened before this deployment may still use the older uploader until refreshed.

## Email alerts

Alerts go to **p.huang@emeducate.com.au**, from **Studocyte <accounts@send.emeducate.com.au>**, using the existing Resend service. The new key is stored in encrypted Vercel Production configuration, not a local environment file. No new paid service was created.

The private monitor endpoint runs every five minutes through Vercel Cron. The existing Supabase database monitor continues independently. Alerts cover queue delay, stalled processing, stale workers, exhausted retries, repeated failures, overdue cleanup, failed operations, exceeded worker limits and overdue marking.

The database outbox keeps one initial notification per incident, a reminder after 24 hours while unresolved, and one recovery notification after a previously sent problem clears. Unsent obsolete problem notifications are superseded. One sender runs at a time, processing at most five deliveries per invocation. Failures retry with increasing delays up to five attempts; exhausted deliveries remain visible in the admin monitor. An overlapping or stale sender cannot acknowledge another sender's work.

Messages contain the operational issue, its detection time, practical action and a link to the admin review queue. They do not contain student names, transcripts, recordings, signed media links or provider credentials. Stable event IDs are used as provider idempotency keys. A provider acceptance receipt confirms that a message was accepted for sending, not that the recipient read it or that their mailbox accepted it.

### Operator configuration

Production settings:

- `INTERVIEW_ALERT_EMAIL_TO`: authorised alert recipient.
- `INTERVIEW_ALERT_EMAIL_FROM`: the verified sender address above.
- `INTERVIEW_ALERT_RESEND_API_KEY`: a sending key for the sender's domain.

Email takes precedence if all three are configured. An optional HTTPS `INTERVIEW_ALERT_WEBHOOK_URL` supports a Slack-compatible `{text}` payload instead. Missing or invalid configuration does not consume delivery attempts; the admin panel explicitly shows that setup is incomplete. Never put these credentials in source control, preview fixtures or logs.

If delivery exhausts retries, fix the recipient/key/provider problem first, then an operator can requeue the affected event through a privileged database session. Review the exact event ID before running:

```sql
update public.interview_alert_deliveries
set status='pending', attempts=0, available_at=now(), worker=null, locked_until=null
where id='<reviewed-alert-id>'::uuid and status='dead';
```

Use the same event ID to retain provider deduplication. Resend's idempotency window is limited, so inspect provider logs before manually retrying a much older event whose acceptance was uncertain. The admin panel remains the fallback when email is unavailable. This is not independent whole-site uptime monitoring: a complete Vercel/database outage or loss of the email provider can also interrupt alert delivery.

## Overdue tutor review

A marking submission is overdue after seven days from submission, including work still blocked before a draft is ready. Editing a draft does not reset its age. The alert and admin list are reminders to investigate or arrange review, not a claim that the tutor has had seven working days with a completed draft.

The admin monitor shows the overdue total and the 20 oldest items, with submission dates, current status, recording-protection state and direct review links. Whole panels count as one review; their ten member attempts are excluded from the individual count. Released or ungradable submissions leave the list.

Unfinished marking continues to protect audio/video beyond the normal seven-day expiry. The warning does not delete a pending recording, refund credits or release feedback automatically. Existing cleanup takes over after marking finishes. Transcripts remain stored with the account.

## Validation

- 172 automated checks passed: 152 interview/admin checks, seven account-email checks, and 13 security/recovery checks. Full lint has zero errors and one pre-existing image warning in the past-session review page. Full lint and the production build passed in both the reconciled release checkout and the main project checkout. Hosted measurements are recorded in `artifacts/operations-improvements/`.
- Database tests exercise global/per-student admission, waiting order, renewal, expiry, ownership and RLS; overdue whole-panel deduplication and stable submission age; incident/reminder/recovery deduplication; and sender fencing.
- Application tests exercise cancellation while queued, stalled transfers, safe duplicate-upload verification, transient final-save retries, missing configuration, provider failure, recipient selection and idempotency headers.
- Chrome checks use a disposable account and actual hosted storage. The real uploader reports its progress phases and recovers an existing-object 409. The actual finalisation helper recovers an injected 503. Download and mobile checks pass. Overdue UI fixtures are injected in the browser only and never create false production incidents.
- One clearly labelled setup email was accepted by Resend on its first attempt. Private monitor access was verified; the live Vercel five-minute schedule was confirmed enabled.
- The final hosted 100-account run passed on the reconciled deployment. All disposable accounts, attempts and stored objects were removed and verified absent. These tests use synthetic media/transcripts and do not establish real AI-provider throughput or human marking quality.

### Hosted capacity result

| Measurement | Final reconciled release |
| --- | --- |
| Distinct authenticated accounts | 100 |
| Existing library entries per account | 200 (20,000 total) |
| Actual resumable transfers | 300: 100 videos and 200 audio files |
| Total media transferred | 967,278,700 bytes (about 967 MB) |
| Page, search and media-link requests | 500 |
| Page request median / 95th percentile | 1.71 s / 6.94 s |
| Transfer 95th percentile, after admission | 11.74 s |
| Upload queue median / 95th percentile / maximum | 72.22 s / 137.67 s / 146.31 s |
| Observed active transfers | At most eight globally, one per student |
| Upload retries / final-save retries / terminal HTTP errors | 0 / 0 / 0 |
| Cross-student media access | Denied |
| Desktop/mobile download and admin checks | Passed |
| Disposable account, attempt and object cleanup | Verified complete |

The burst deliberately starts work for 100 accounts together. Its bounded queue trades immediate starts for reliable transfers: a student near the back of this burst can wait around two minutes before upload begins. The interface shows that waiting state. Monitor real queue waits before increasing the limit; this result does not mean every student waits that long during ordinary use.

Earlier 20- and 50-account stages passed on the preceding operations release (60 and 150 transfers respectively); the reconciled release was retested at 100 accounts. The final receipt is `artifacts/operations-improvements/capacity-ddfffb32-841e-4bbe-9401-d036e96d1362.json`.

This is a controlled test from one computer/uplink, with short synthetic recordings (video files about 9.6 MB). It exercises hosted authentication, storage, finalisation, libraries, privacy and download controls. It is not a test of 100 full-length live recordings, varied student networks, concurrent AI assessment throughput or sustained all-day traffic. The 6.94-second page tail also leaves room for further performance work under simultaneous load.

References: [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Published version

Public site: https://studocyte.emeducate.com.au

Verified deployment: `dpl_5d5MHLoMtYpR3c1Jz8fPzxsaiJtD` (`emedibank-x1uw-nl5iadl0a-em-educate.vercel.app`). Migrations 0053 and 0054 are applied. The current deployment’s monitor schedule is enabled at five-minute intervals; its daily cleanup schedule is also enabled. The existing database worker schedules remain in place.

## Concurrent release reconciliation

The first 100-account run was interrupted when another task repointed the public domain to `dpl_GxFUXo27Hyo61ocLLtyg7LSik2MS`. That release had the expanded bank and high-stress panel question but not this release's upload-admission endpoint. The run encountered an HTML response, stopped, and removed all disposable data. Its 48 completed transfers had no storage retries, but that partial run is not a passing 100-user capacity result.

The releases were reconciled using their common Git ancestor. The public bank (74 MMI stations and 161 panel questions), existing security controls, current 20-minute whole-panel workflow, revised marking, free practice, retention, dashboard/Stories changes and the new operations features are now together. The main checkout was synchronised only after checking that its files had not changed during reconciliation. No unrelated work was discarded and no additional legacy production security migration was applied. The existing main-checkout security migrations are retained locally for regression coverage; those local tests are not a claim that every historical production-hardening step has been activated.

The test harness now checks the public deployment identity before setup, uploads and page measurements. Unexpected non-JSON queue responses produce a safe retry message instead of raw parser output. Chrome verification uses the page's existing nonce, without disabling CSP.
