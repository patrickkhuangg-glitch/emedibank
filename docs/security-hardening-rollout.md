# Security hardening rollout

> **8 September update:** Current-schema permission hardening and the signup-ticket gate are now live. Interview ownership, hidden draft feedback and all four credit/refund cases have passed hosted checks; shared test keys are revoked. See the [dated access and credits report](security/INTERVIEW-ACCESS-CREDITS-2026-09-08.md). Statements below describe the earlier release and should not be used to infer the current state of these specific items. Other release requirements remain separate.

The repository fixes Zoom webhook forgery, unsafe login redirects, unbounded recording/transcription usage, and direct email signup bypassing the app's CAPTCHA and rate limits. These changes need both an application deployment and database migrations. They have not been applied to production by this task.

## Apply in this order

1. Ensure migrations through `0034_audit_fixes.sql` have been applied.
2. Apply **only `0035_security_hardening.sql`**. This adds the recording quotas and the signup authorization infrastructure. Existing signup continues to work at this stage. Do not blindly push all pending migrations before deploying the app.
3. Deploy the updated application, including its interview worker. Check ordinary signup, staff invitations, Google sign-in, a signed Zoom validation challenge, and a recording/transcription in a staging environment first.
4. Apply `0036_require_signup_authorization.sql` to require the app's approval for new email accounts. A direct public Supabase signup must now fail; signup through Studocyte and invitations through its admin page must succeed.
5. Check Zoom's webhook validation and delivery history after deployment. Validation challenges now require Zoom's normal request signature and a timestamp within five minutes.

Deploying the app before 0035 makes new email signup and transcription fail closed because their authorization functions do not exist yet. Applying 0036 before deploying the app blocks new email accounts until the new app is running. Existing users can still sign in.

## Signup behavior

After CAPTCHA and rate-limit checks, the server issues a random, email-bound authorization valid for ten minutes. Only its hash is stored. The Auth insert trigger consumes it once and removes it from user metadata. Google account creation is accepted using Auth-controlled app metadata. A user-supplied `provider` field cannot grant that exception.

Staff must create/invite accounts through **Studocyte's admin page**, which now issues the authorization after checking the administrator's role. Direct email account creation/invitation from the Supabase dashboard or custom scripts needs the same ticket; otherwise the trigger rejects it. Existing accounts and password resets are unaffected. Do not enable Supabase CAPTCHA using the already-consumed app Turnstile token; provider-level CAPTCHA would require a separate integration for its protected authentication flows.

The Google and invitation handling was checked against Supabase Auth's [signup implementation](https://github.com/supabase/auth/blob/master/internal/api/signup.go) and [invitation implementation](https://github.com/supabase/auth/blob/master/internal/api/invite.go). Actual hosted Auth behavior still needs the staging checks above.

## Limits and operations

Defaults are stored in `public.interview_security_limits`. Only a trusted server/database administrator can change them:

| Limit | Default |
| --- | --- |
| Recording starts per account, rolling 24 hours | 10 |
| Stored plus reserved recording space per account | 2 GiB |
| Transcription calls per account, rolling 24 hours | 20 |
| Transcription calls across the site, rolling 24 hours | 500 |

Every start counts even if finalized or deleted. Pending uploads reserve the bucket maximum of 150 MiB for each video/audio object, so seven simultaneous video-plus-audio reservations exceed the storage limit. Ready recordings count their actual stored size; objects awaiting cleanup still count. Unknown object sizes reserve the maximum. The reservation calculation must be updated if the bucket's per-object upload limit changes.

Every transcription invocation, including retries, consumes quota before contacting the provider. Exhausted quotas postpone the job by an hour without using its failure budget. Global usage survives account deletion. These are call-count limits, not a guaranteed currency budget; retain provider billing limits/alerts separately. Previously stored media is preserved, and pre-migration recording starts from the last 24 hours are counted.

Usage rows older than seven days may be periodically deleted by the database administrator; no quota reads beyond 24 hours. Expired signup authorizations are removed when new authorizations are issued. Never delete recent usage to clear a processing error.

## Validation performed locally

- `npm run test:security`: attack regressions, signed webhook success, URL normalization, CAPTCHA failure behavior, actual PostgreSQL-compatible migration/permission checks, reservation accounting, rolling limits, ticket expiry/replay/email binding, and job deferral.
- `npm run test:interviews` and `npm run test:audit`: existing feature and audit regressions, plus HTTP quota responses and zero provider calls when quota is exhausted.
- TypeScript checking and the production build.

Database tests use isolated PGlite with Supabase-compatible fixture tables. They do not contact live Auth, Zoom, storage or transcription services. A passing local suite is not evidence that a production deployment has been completed.
