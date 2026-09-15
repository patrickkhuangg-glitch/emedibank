# Interview retention, recovery and support — 8 September 2026

## Confirmed ownership and alert delivery

Patrick confirmed that the labelled setup alert reached **p.huang@emeducate.com.au**. This is an explicit recipient confirmation, beyond the earlier Resend acceptance receipt. Patrick also confirmed that he handles both stalled processing and overdue marking.

| Responsibility | Owner | First action |
| --- | --- | --- |
| Stalled uploads, transcription, assessment or audit | Patrick | Open the private interview admin monitor, identify the affected stage and inspect the recorded error before retrying. |
| Expired-media cleanup failure | Patrick | Inspect the cleanup heartbeat and failed job. Repair the storage/worker issue and retry cleanup; verify the transcript remains. |
| Marking overdue after seven days | Patrick | Open the oldest submission, establish whether it is blocked on processing or ready for human review, and arrange completion. |
| Student support | Patrick via the existing support address | Find the relevant question/attempt and date; acknowledge the issue and give a specific next update. |

Operational alerts continue to use **p.huang@emeducate.com.au**. Student-facing contact remains **support@emeducate.com.au**, the previously approved public address. This task confirms alert inbox receipt; it does not claim a new forwarding test for the separate support alias.

For stalled work, check provider availability, credentials and retry state before using the existing retry controls. Do not reset all jobs, manually increase balances, release an unaudited draft or delete a pending recording to clear an alert. If an answer cannot be marked, use the existing ungradable/refund workflow. A recovered alert should clear after a successful monitor run. The monitor is not independent whole-site outage detection; the admin page is the fallback when email fails.

Patrick is the primary owner; a backup operator has not been nominated. No response-time promise or on-call schedule was invented.

## Hosted retention check

The test creates one disposable account and fourteen tiny synthetic recording objects: audio and video for each of expired, fresh, queued, processing, awaiting review, in review and needs attention. Every attempt contains a known saved transcript. A connection-local fixture adjustment backdates only these disposable deadlines; no production trigger is disabled.

The actual scheduled hosted cleanup worker runs normally. The check verifies:

1. Expired media download requests return 404 before physical cleanup.
2. Fresh recordings and all five pending marking states remain downloadable.
3. After the scheduled worker runs, expired audio and video bytes are absent from private Storage while their transcripts remain available through the student API.
4. After the synthetic pending states are changed to released (audio) or ungradable (video), the next scheduled cleanup removes the overdue media. It still preserves every transcript and both unexpired recordings.
5. Finally, only the disposable account, attempts and any remaining fixture objects are removed, and their absence is verified.

Hosted run `93d74b3f-e225-4471-8dbc-f36ffa5dc74c` passed every check above. All fourteen disposable media fixtures and their account were removed and verified absent. Its receipt is in `artifacts/release-retention-recovery/`. The test does not change real student review status or balances, call an AI provider, or claim physical deletion from database/provider backups. It verifies the active storage service and application access policy.

## Student support change — published

`InterviewSupportContact` adds a compact **Need a hand?** card to student interview pages. It contains a contact button, the visible support email address and a request to include the question and approximate time of the issue. It is part of the interview layout, with the same centred width as other content. It is hidden on timed practice and mock session routes to avoid drawing students out of their recording.

The actual component was rendered to a standalone local preview: `artifacts/release-retention-recovery/support-preview.html`. Rendering checks confirm the email links and both timed-session exclusions. Full lint has zero errors and one existing image warning. The production Webpack build passed. Fifteen relevant retention, cleanup and operations tests passed.

Patrick explicitly approved publication after the initial automatic review rejection. The support card is now live on deployment `dpl_HjLx5xZTBSwcnvQR61nGeSo3Si2B` and verified through a signed-in student request. Cloudflare protects the email address in raw HTML; the check decodes that representation and confirms the intended support address. Only these two files were published:

- `src/components/interviews/support-contact.tsx`
- `src/app/(app)/interviews/layout.tsx`

Use the existing isolated release snapshot only after confirming the public deployment still matches it. Preserve all unrelated working changes.

## Hosted recovery — logical restore passed

Final read-only inventory confirms only the original production project, `ghxwyfiemvyhijpmrhgf`, remains in Sydney (`ap-southeast-2`). All seven temporary destinations used during the rehearsals and successful drill were deleted and their absence confirmed.

The latest managed physical database backup is **1606566385**, completed **7 September 2026 at 17:43:48 UTC** (8 September at 03:43:48 Sydney). Eight completed physical backups were listed. Point-in-time recovery is disabled. Existence and completion status do not prove that any of these backups can be restored successfully. The latest backup also predates the permission changes in 0055/0056; recovery would require applying those known changes afterward.

The production database has three active schedulers (processing, monitoring and retention). Supabase’s [restore-to-new-project documentation](https://supabase.com/docs/guides/platform/clone-project) says the database, roles and Vault encryption root key are copied; outbound extensions such as pg_cron/pg_net require handling. A blind clone could therefore carry live worker destinations and credentials. Do not start a clone and assume there will be time to disable those jobs afterward.

Automatic approval review blocked opening the Restore action because it could create a billed project and copy production data before the destination, cost and isolation settings were verified. Patrick subsequently approved a temporary isolated Micro project, a US$1 ceiling and deletion within 24 hours. The controlled logical-backup drill below was authorised and has passed. Both the publication and hosted-drill approval blocks are resolved.

### Isolated drill procedure

Approved controlled procedure:

1. Create a temporary **Micro** project named `studocyte-recovery-drill-2026-09-08` in the existing organization, in Sydney. Do not attach a domain, Vercel project, production API key, SMTP sender or live integration. Disable signups and outbound automation before loading any backup data. Record its ID. Keep the Data API closed during restoration, then restore the application permissions before testing account access. The hosted API remains reachable by URL; this is not a network-isolated private endpoint.
2. Take a current logical backup of the hosted database using PostgreSQL backup tooling, including application schema/data, application grants against the fresh project’s standard roles, and Auth users/identities. Exclude cron job definitions, pg_net requests, Vault secrets and live integration credential values. Preserve only the explicitly required recovery structures; classify any omitted integration data in the evidence. Use private encrypted temporary artifacts and remove them after the drill. This verifies a **new logical hosted backup**, not the older managed physical snapshot.
3. Restore the backup to the empty hosted destination. Do not run application workers or connect live payment/email/AI services. Restore schema constraints, object grants and policies, compare row counts and non-reversible content digests, and exercise current permissions with synthetic accounts without printing student content.
4. Separately back up and restore all current Storage file bytes, including synthetic audio/video linked to saved transcripts. Verify SHA-256 hashes and anonymous/A/B/admin access. A database restore alone does not restore Storage bytes.
5. Verify representative account/application records and restored transcripts. Test that signed media access works only for its owner. Record source timestamp, restore start/end, elapsed recovery time, what was omitted and any data-loss window. The earlier four-hour RTO and 24-hour RPO remain proposed targets until measured and accepted.
6. Delete only the temporary project after the evidence is retained and verify deletion. Never restore over production, reuse a production public domain, or reactivate copied schedulers.

A full managed-physical-backup drill remains distinct: use a provider-supported way to prevent restored outbound jobs from running **before** the clone starts. If such isolation cannot be established, stop and involve Supabase support rather than performing a live clone with copied automation credentials.

Supabase [Micro compute is US$0.01344/hour](https://supabase.com/docs/guides/platform/manage-your-usage/compute), about US$0.33 for 24 hours or US$10/month if left running. Storage/egress or larger resources can add charges. Approved authorization ceiling: **US$1**, with deletion within 24 hours and a stop for approval if the quoted resources or usage exceed that ceiling. This is a planning limit, not an installed provider spending cap.

### Findings incorporated into the restore procedure

The initial hosted rehearsals exposed settings that a recovery runbook must handle explicitly. Each unsuccessful temporary destination was deleted before retrying:

- Disable signups and configure a complete, non-delivering SMTP configuration before restoring Auth records; verify that the settings have taken effect. No test email is sent.
- Point the temporary Data API at an empty, inaccessible schema until application grants and row-level policies have been restored.
- Restore application object permissions and `postgres` default permissions. Omit the three default-permission entries owned by Supabase's platform role (`supabase_admin`), which a project administrator cannot change. This does not omit existing application table/function grants.
- Apply the source global Storage file limit before restoring bucket configurations. The source is 150 MiB, larger than a fresh project's default. The [Storage configuration API](https://supabase.com/docs/reference/api/v1-update-storage-config) changes that limit only on the temporary destination.
- Refresh short-lived database credentials between the import and verification steps.

### Successful hosted result

Run `0954c73d-94f6-4adf-81cd-7bf23a39ecf4` completed successfully. Its receipt is `artifacts/release-retention-recovery/restore-0954c73d-94f6-4adf-81cd-7bf23a39ecf4.json`.

| Check | Result |
| --- | --- |
| Consistent source database snapshot | 8 September 2026, 07:17:12 UTC (17:17:12 Sydney) |
| Included public/Auth tables | All 48 restored with matching row counts and content digests |
| Storage bytes | All three objects present at backup: one existing object and two synthetic audio/video fixtures; 334,839 bytes total; every SHA-256 hash matched |
| Account recovery | Restored synthetic student A, student B and administrator signed in with their existing passwords |
| Student data | Owner could read the restored private story and two transcripts; another student could not |
| Media privacy | Owner could obtain signed access; another student could not; anonymous download denied |
| Draft feedback / roles | MMI and full-panel draft tables denied to student; administrator role retained; student self-promotion denied |
| Outbound isolation | No copied cron/network extensions, Vault data, live SMTP credentials, Google integration credentials or signup tickets; no AI calls or student emails sent |
| Successful run duration | 87 seconds from run start to usable database/storage/account checks; this excludes earlier diagnosis and unsuccessful rehearsals |
| Deletion | Temporary destination deleted at 07:18:28 UTC; every earlier temporary project also confirmed deleted |
| Source cleanup | Independent final check: zero synthetic restore accounts, attempts, stories or media objects remain |
| Private backup artifacts | Encrypted temporary archives removed; in-memory encryption keys cleared |

The conservative compute estimate across **all seven temporary projects** is **US$0.09408**, rounding every project up to a whole Micro compute hour. Small backup transfers add negligible usage at this dataset size; this is an estimate, not an invoice. No temporary paid project remains. The approved US$1 limit was respected. Final inventory and cleanup evidence are in `artifacts/release-retention-recovery/final-cleanup.json`.

### What this proves, and what remains

This proves that a **new logical backup of the current small hosted dataset** can be restored to a separate hosted Supabase project, including actual Storage file bytes and representative access controls. The 87-second result is not a full-site outage RTO, a large-data capacity test or a production cutover rehearsal. Diagnosing the initial configuration differences took longer; those fixes are now recorded in the script and procedure.

It does **not** validate restoration of the older managed physical backup or PITR. It does not restore active login sessions, MFA/OAuth state, live integration credentials or worker schedules; those require deliberate reconfiguration and security checks during a real recovery. The public site's application was not switched to the temporary database, so full application cutover remains untested.

No recurring off-site media backup was added in this task, and the drill archives were deliberately erased. The successful fresh snapshot does not establish a 24-hour recovery-point guarantee. An operational recovery plan still needs a durable encrypted backup schedule for the database and Storage, chosen retention/access controls, and a repeat drill after material schema or volume changes. Database and Storage backups are captured separately; a busy-site recovery process must reconcile in-flight uploads and missing objects.

Human calibration of AI marking remains Patrick’s separate launch check. Patrick owns operational recovery and overdue marking; a backup operator is still to be nominated.
