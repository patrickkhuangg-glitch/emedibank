# Interview access, credentials and credits — 8 September 2026

## Outcome

The requested live access and credit checks passed on `https://studocyte.emeducate.com.au`. The hosted permission hardening is applied, both shared temporary provider keys are revoked, and the replacement operational email key is deployed. Real student content and balances were not edited. All disposable test accounts, attempts and storage objects were removed.

This closes the interview permissions/credentials and credit/refund work described below. It does not establish payment-release readiness or replace the separate human review of marking quality.

## Live permission changes

Applied `0055_current_schema_permissions.sql` after an isolated database test and a hosted transaction rolled back as a rehearsal. This reconciles the intent of historical migrations 0036/0037 with the current schema instead of replaying old migrations blindly:

- Removed anonymous/authenticated table permissions that unnecessarily allowed TRUNCATE, TRIGGER and REFERENCES.
- Removed implicit future-object access; restored explicit application table and function grants.
- Enabled RLS on all public tables and made application views use caller permissions.
- Kept private assessment, audit, job and operational tables inaccessible to browser clients.
- Restricted `is_admin(uid)` to the caller’s own identity.
- Activated the existing signup-ticket trigger after confirming the ticket-aware application was already deployed.

The first hosted check caught a regression: the broad table revoke removed the column-specific story INSERT/UPDATE grants too. Applied `0056_preserve_story_column_writes.sql`, with a rollback rehearsal, to restore the 8 insertable and 6 updatable story columns. Owner, ID, timestamps and version remain protected from direct mutation. Added a regression test that combines the full current migration chain with real owner story writes and denied identity/balance changes. The final hosted owner create/edit checks pass.

**Administration:** create/invite students through Studocyte’s admin page. Direct email-account creation through the Supabase dashboard or a custom script now needs the app’s signup authorization ticket. Existing users can still sign in.

Final inventory: no public tables without RLS; no excess anonymous/authenticated TRUNCATE/TRIGGER/REFERENCES grants; signup gate active; 14 permitted story column/operation pairs. There is no historical Supabase migration ledger on this project. Local receipts identify the changes applied; do not blindly push the entire migration folder.

## Hosted access checks

Three disposable confirmed accounts represented Student A, Student B and an administrator. Both real HTTP routes and direct authenticated Supabase requests were exercised:

- A could create, read and edit their story. B could not read, update, delete or create a story owned by A. Anonymous requests were rejected.
- A could obtain their recording’s playback URL. B could not obtain its media/transcript, sign its storage path, delete it or submit it for marking. Anonymous storage access was rejected.
- Private assessment, audit, job and credit-grant tables denied anonymous and both student clients.
- Students could not promote themselves, add their own credits, call administrative refunds or access the admin health endpoint. The administrator retained access.
- Synthetic private assessment/draft/audit content remained absent from student review HTML and serialized data. Individual approved-feedback fields remained null. Full-panel owners could see progress status but received null feedback before release; the other student received no report.
- Authorized account creation and sign-in succeeded; unticketed email-account creation failed.

The audio and video paths share the same private attempt/storage ownership controls. Hosted fixtures used a small nonplayable video-labelled object; these checks do not claim a new microphone, camera, playback-quality or transcription-quality test.

## Credits and refunds

| Submission | Price | Concurrent initial submissions | HTTP retries | Concurrent refund requests | Outcome |
| --- | ---: | ---: | ---: | ---: | --- |
| Individual MMI station | 2 | 4 | 4 | 4 | One charge, one refund |
| Individual panel response | 1 | 4 | 4 | 4 | One charge, one refund |
| Full MMI, 8 stations | 12 | 4 | 4 | 4 per station | One total charge, exactly 12 restored |
| Full panel, 10 responses | 12 | 4 | 4 | 4 | One session charge, exactly 12 restored |

Each case also rejected insufficient funds and an incorrect price quote without changing the balance. Starting from 40 credits, the charge left exactly `40 − price`; all refund retries together restored exactly 40. Refunded attempts/session became ungradable and cleared the charged amount. A student could not spoof the administrator’s refund identity.

Initial concurrency exercised the actual deployed database charging functions with the applicable student/service role and owner identity. HTTP retries exercised the real public API. The script postponed only its own newly created jobs within the same submission transaction, preventing workers from processing synthetic recordings. There were no marking/transcription provider calls or real student charges.

## Credentials

- Revoked the shared OpenAI `TEST_Interview` key and verified it disappeared from the active key list. The separate permanent `Interview Marking` key remains active. Its production environment assignment predates creation of the test key; it was not replaced or exported. No fresh AI assessment was run with the permanent key during this access audit.
- Replaced the shared full-access Resend test key with a sending-only key restricted to the verified `send.emeducate.com.au` domain. Updated the existing production environment variable in memory, redeployed the existing application snapshot, tested the normal alert outbox, then revoked the old key and verified its removal.
- The labelled setup test to `p.huang@emeducate.com.au` was accepted on its first attempt. Provider acceptance is verified; inbox delivery/read receipt is not.
- No new secret values were displayed or written to local evidence. A scan for the known revoked values in local environment files found no matching assignments to remove.
- Enabled and verified Supabase’s `password_hibp_enabled` setting to reject known leaked passwords. No other authentication setting was changed. See the [provider’s password protection documentation](https://supabase.com/docs/guides/auth/password-security).

Production application deployment: `dpl_8MGGFm8mYDHD4e5YjL8r94f7Zp57` (`emedibank-x1uw-8soa03uiz-em-educate.vercel.app`). This reused the previously published application source; unrelated working changes were not deployed.

## Advisor interpretation

The hosted Security Advisor was read after the grants were applied. Its intentional service-table “RLS enabled, no policy” notices mean browser access is denied by default. Do not add permissive policies to silence them.

The remaining permission warnings identify deliberately callable SECURITY DEFINER functions: the identity helper, owner-only report readers and transactional submission/credit functions. They require access to private rows that callers cannot write directly. Their owner checks, restricted search paths and grants remain in place; changing them to SECURITY INVOKER would break the intended workflow. These are documented reviewed exceptions, not a claim of a warning-free dashboard. The separate leaked-password warning was acted on as described above.

## Validation and evidence

- Hosted run `35b06a5a-ab74-4888-a7c4-0f1d6a8fe804`: all checks passed; cleanup complete.
- Local interview suites: 150 checks passed, including synthetic rubric cases; these are automated cases, not human calibration.
- Local P0/security/current-permissions suites: 11 checks passed.
- Full lint: zero errors; one existing Next Image warning in `past-session-review.tsx`.
- Production build: passed using Webpack. The host blocks Turbopack’s local port binding, including with escalation; the supported Webpack build is used as the local fallback. The actual Vercel production deployment build also completed.
- Restored the existing panel validation pack from the prior implementation checkout because its absence from the main checkout prevented that test file from loading; no rubric content was changed.

Evidence lives in `artifacts/release-access-credits/`: the before/final inventory, migration/rehearsal receipts, Security Advisor output, credential revocation/rotation receipts, final hosted run and validation result. Earlier failed-run receipts are retained with cleanup outcomes; they are not counted as passes.

## Remaining limits

This was a targeted live verification with disposable accounts, not an independent penetration test. It did not rerun the 20–100-user capacity test, browser/device recording matrix, payment processing, hosted backup restoration or human marking calibration. Earlier release documents retain those separate requirements. No deployment or migration remains outstanding for the two requested interview checks.
