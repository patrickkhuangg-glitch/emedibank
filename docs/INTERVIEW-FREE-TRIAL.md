# Interview free trial — implementation and operator handoff

Status, 8 September 2026: free trial and exam-specific student headers published. Migrations 0059–0060 applied after a successful hosted rollback check; the separate identity secret is configured and trial admission is enabled. Immediate-paid checkout is implemented and tested, but billing remains blocked by the existing production configuration (payment flags false, test publishable key, no verified usable live secret). No real payment was made.

## Student offer

| Included | Allowance |
| --- | --- |
| Trial period | Seven days from the first practice start, using server time |
| MMI practice | A fixed selection of 15 stations |
| Panel practice | One fixed question from each of the 32 themes |
| Timed mocks | One two-station MMI and one 20-minute panel |
| Trial panel format | Ten themes, one question each, Motivation for Medicine first; two minutes per question |
| Transcription | 60 minutes reserved across saved responses; verified against audio packet duration before provider processing |
| Welcome marking | Two interview credits, granted once: one MMI station or two individual panel responses |
| Local recording | Record, replay and download without a recording-count charge during the trial |
| Cloud storage | 512 MiB cumulative uploads; 60 recording shells; 128 MiB per video, 24 MiB per audio file |
| Stories and notes | Read prompts and save reflections; bounded to 100 stories and 500 short notes for trial users |

There is no marking demonstration. Welcome credits use the existing credit balance and human-review workflow. They are not silently removed at trial expiry. Full panel marking still costs 12 credits; the two welcome credits do not buy a complete panel report. Each station of the two-station MMI is individually markable for two credits. The ordinary paid full MMI remains eight stations, and the paid panel retains five themes with two questions per theme.

Story/notes browsing or saving does not start the seven-day clock. Starting recorded or unrecorded practice does. When the trial ends, saved stories, transcripts and released feedback remain readable; new practice, transcription requests, story edits and note creation require full access. Already admitted background work and submitted marking can finish. Download recordings before their seven-day media expiry; pending tutor marking remains protected until reviewed. Existing retention and private-backup cleanup continue to apply.

## Enforcement and cost controls

- Catalogue `interview-trial-v1` is identical for every trial account. Extra accounts do not rotate the question bank. The complete bank is server-only; client components receive the permitted station data and public metadata, without examiner guides. Direct question links and initiation endpoints enforce the same allowlist.
- Verified email is required. A dedicated HMAC identity records the one-time grant; Gmail dots/plus aliases and googlemail.com are normalised. Account deletion leaves an email-HMAC tombstone to prevent a second welcome grant. This is anti-abuse metadata, not a recording or transcript; retain it while operating the one-trial offer, restrict it to service access, and describe it in the privacy notice before release. Deleting or rotating the identity secret without a migration defeats this linkage.
- Email/password signup retains Turnstile and email throttling. A 30-attempt hourly network burst limit replaces the previous four-per-month network limit. Shared networks are not treated as a single lifetime identity. Trusted OAuth retains the existing verified-provider signup path.
- Credits, mock claims, minute reservations and cumulative upload accounting are transactional. Retries cannot grant another two credits, restart an already claimed full mock's clock, or reserve the same attempt twice. Deleting an attempt does not refill its reserved minutes or uploaded-byte counter.
- Audio is inspected on the server with ffprobe packet timestamps. Browser duration is not trusted for paid transcription admission. Network protocols and non-audio container formats are restricted; inspection has byte, output, duration and execution-time bounds. A full panel response is capped at its two-minute response plus recording tolerance; individual panel practice keeps its existing three-minute timing.
- Same-attempt successful transcripts and question layouts are reused. Identical audio submitted as a different attempt is rejected from another transcription call; the student can use the original saved response. Each trial attempt can make at most two transcription requests, two layout requests, and two assessment/audit job attempts per stage. A marking job can make multiple bounded internal model calls, as before.
- At most one trial worker runs globally (and one per trial student), leaving three of the existing four worker slots available for paid work. Cleanup has its independent two-worker bound. Paid work does not use the trial spending allocation.
- Trial processing has a separate monthly allocation: warning at 4,000 cents, pause at 5,000 cents by default. Each request reserves a conservative planning amount before the provider call: transcription 0.6 cents/minute, minimum one cent; layout ten cents; assessment/audit job fifty cents each. These are **application allocation units, not measured invoices or a guaranteed US$50 provider bill**. Check real provider usage, particularly if changing models or token limits. Retried/failed calls retain their allocation because an ambiguous request may have incurred a charge.
- The existing independent monitor detects the trial warning/pause, deduplicates email alerts, and records recovery. Budget/configuration pauses defer queued work without exhausting its queue retries. Monthly allocation resets on the UTC month boundary; a manual pause stays in place until cleared. Completed work stays readable.
- Subscription trial entitlements now carry `interview_trial_only`. They do not unlock the full bank. Conversion to paid removes this restriction; a simultaneous paid entitlement wins over a trial. Manual complimentary access, admins and tutors retain full access. Academic-exam access rules are unchanged.

Limits reduce abuse; they do not establish one human per account. Separate verified identities can still claim trials. The shared processing allocation bounds the application's admitted trial workload; monitoring and human review remain necessary for suspicious registrations and tutor workload. Allowed questions can still be copied manually.

## Local review

Preview: `http://127.0.0.1:3218/prototypes/interviews/free-trial`.

The preview has before-start, active and expired states and uses the real restricted catalogue. It grants no credits and does not create trial accounts. Actual practice buttons lead to the authenticated workflow; a trial cannot start against a database that has not been configured.

Automated coverage includes catalogue restrictions, unchanged paid mock formats, one-time verified grants, same-identity rejection, concurrent minute reservation, duration/fingerprint checks, per-file storage rejection, expiry and private-table permissions, one mock claim per format with retry-safe timing, fair workers, spending alerts/pauses, and spending the welcome credits on two separately marked panel audio responses. All database tests use isolated PGlite databases and synthetic accounts/audio, not production students. Browser review covered the restricted panel/MMI selection, active and expired state messages, and a 390px-wide screen.

## Operator rollout — after local review and publication approval

1. Review migrations `0059_interview_free_trial.sql` and `0060_interview_trial_operations.sql` and the relevant code together. Preserve the existing paid entitlement grants. Before rollout, reconcile users with multiple existing subscriptions: migration backfill deliberately preserves ambiguous mixed paid/trial accounts, whereas new syncs identify each derived entitlement. This avoids unexpectedly revoking existing paid access.
2. Apply both migrations to an isolated hosted environment first. They default to `enabled=false`. A current logical backup and the established recovery process should be available before applying them to the public database. Deploy this code only after these migrations: Stripe entitlement sync now writes the new column.
3. Configure `INTERVIEW_TRIAL_IDENTITY_SECRET` as a separate random server-only secret of at least 32 characters. Do not reuse a provider API key or expose it with `NEXT_PUBLIC_`. Keep it stable. Missing configuration returns a safe trial-unavailable message.
4. Verify existing Turnstile, transcription, interview marking/layout, worker signing and operational alert settings. Do not use temporary keys from chat. The feature creates no service or subscription. Alerts continue through the existing configured recipient and backup/operator workflow.
5. Confirm the hosting install includes the Linux ffprobe binary. `@ffprobe-installer/ffprobe` is externalised and the internal interview-worker routes explicitly trace its binary and package files. The local production trace includes the local platform binary; a Linux hosted smoke test is still required.
6. Review the monthly planning allocation and alert thresholds. Enable only after the hosted checks pass:

   ```sql
   update public.interview_trial_settings
   set enabled=true, processing_paused=false,
       monthly_budget_cents=5000, warning_cents=4000
   where id=true;
   ```

   To pause trial provider processing while retaining the trial's local practice and saved work:

   ```sql
   update public.interview_trial_settings set processing_paused=true where id=true;
   ```

   To close trial admission as well, set `enabled=false`; existing trial provider work then pauses. Paid/complimentary access stays available. Do not delete accounting rows to resume service; investigate actual usage and raise the allocation or clear the manual pause deliberately.
7. Hosted smoke test with disposable verified accounts: repeat signup aliases; first recorded/unrecorded practice; fresh card-based subscription trial; paid conversion; trial MMI and ten-theme panel; Chrome WebM and Safari MP4 direct resumable uploads; close-to-limit storage and transcription; welcome-credit submission/retry/refund; expired trial reads; warning email and recovery; seven-day retention and pending-review protection. Confirm the larger video limit admits a full eight-minute trial MMI recording. Exercise a network interruption and concurrent uploads.
8. Update public trial/pricing and privacy wording to match this offer and its anti-abuse HMAC retention. The general academic subscription checkout remains its separate existing flow; this interview trial can be entered through `/interviews` without a card. Announce the trial only after hosted testing and your human marking review.

## Remaining validation limits

Publication checks now include hosted trial grants and API restrictions, a real hosted Storage upload with metadata accounting, concurrent reservation, expiry/read access and full-entitlement restoration. Disposable accounts and uploads were removed. The Linux ffprobe binary executed successfully during the hosted build. Local synthetic audio inspection used real PCM packets. Full browser capture/TUS interruption with Chrome WebM and Safari MP4, the binary's invocation inside a live recording worker, live Stripe payment/webhook delivery and actual provider costs remain outside these checks. No new AI provider request or real charge was made. The migration rehearsal used a rollback transaction on the hosted database, not a separate hosted project. Existing human approval and ungradable-refund regression checks remain part of the full interview test suite.

## Final validation result

- Full interview suite: 165 passed, zero failures.
- Security suite: four passed, zero failures.
- Full lint: zero errors; one pre-existing Next Image warning in the unrelated academic practice review page.
- Production build: passed with webpack under the installed Next.js 16.3.3. Next reported the existing outer-workspace lockfile warning.
- No paid API inference was needed for validation. Human marking calibration remains your separate release activity.


## Immediate subscription and remaining billing setup

- The interview pricing card offers **Subscribe now** (billing starts immediately) and a separate card-free **Try Interviews free** link. The trial notice links directly to the interview plan. Academic plans retain their existing trial checkout and gain a separate paid button.
- Choosing immediate payment skips the trial reservation entirely. An existing subscription for the same Stripe product, including another billing interval or a delayed webhook, redirects to account management rather than opening a second subscription. The hosted free-trial-to-full-access check uses a synthetic complimentary entitlement; it is not proof of a live Stripe payment conversion.
- Public pricing currently hides checkout because the established payment guard is closed. This is a real remaining dependency; seeing “Subscribe now” in explanatory copy is not a successful checkout test. The revised hosted receipt records actual checkout-button availability separately.
- Configure `STRIPE_SECRET_KEY` with a live key and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with its matching live publishable key in Vercel Production, plus `STRIPE_WEBHOOK_SECRET` for the live endpoint `https://studocyte.emeducate.com.au/api/stripe/webhook`. Do not paste credentials into chat or source files.
- Before opening payments, verify the live Stripe account can charge, the existing product mappings refer to live products/prices, and the webhook is subscribed to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` and `invoice.payment_failed`. Reconcile the existing payment release checklist against its newer evidence; do not blindly mark it approved or bypass the guard. Verify entitlement conversion and cancellation using the reviewed billing workflow.
- After those checks, enable the payment release flags and redeploy. The current live free trial and headers do not depend on this billing work.

## Publication evidence

See `artifacts/interview-free-trial/release-files.json`, `migration.json`, `backup-check.json`, `hosted-checks.json` and `publication.json`. The pre-migration check confirmed a completed database backup dated 7 September 2026 at 17:43 UTC. Preview routes now return 404 on Vercel; the actual student header and interview pages are published separately from these local design tools. Trial dashboard recommendations are restricted to the permitted catalogue.
