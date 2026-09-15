# Email links incorrectly reported as expired

The branded `/auth/confirm` page used `Referrer-Policy: no-referrer` while requiring a matching `Origin` on its native form submission. Browsers send `Origin: null` for that form under this policy. The handler therefore returned 403 before contacting Supabase, and its shared failure page incorrectly labelled the link expired.

A real-browser local reproduction confirmed `Origin: null` with the old policy and the correct origin with `strict-origin`. The corrected policy still excludes the entire path/query, including the token, from the Referer header. Same-origin checks remain enforced; opaque and foreign origins are still rejected. GET previews still do not consume the one-use token.

Only Supabase's `otp_expired` error now produces the expired/used message. Request validation and service outages have distinct retry guidance. Email design, expiration settings, database schema, user roles and SMTP configuration are unchanged.

Seven automated email tests cover purpose/destination handling, token validation, scanner-safe GETs, origin rejection without token consumption, successful submission, actual expiry and unavailable-service failures. The hosted verification script additionally checks invitations, recovery, signup, role-specific sign-in, password setting, replay rejection and disposable-account cleanup. The browser regression check must also be run: manually setting an Origin header in an HTTP test cannot reproduce this bug.

Release source: `.vercel/auth-origin-public-release`. It was reconstructed and hash-checked against the current public manifest before copying the five email-fix files. The pending practice-calendar candidate and migration are excluded. Hosted release verification and final deployment details are recorded below when complete.

Reference: [MDN Referrer-Policy — effect on the Origin header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy#effect_on_the_origin_header).

## Initial verified public release

Published deployment `dpl_CztPeZXfuMXfwJvHmgvGNkMjYXGa`. Both `studocyte.emeducate.com.au` and `emedibank-x1uw.vercel.app` were verified on that deployment. Seven local tests pass; full main/release lint passes with one existing image warning; local webpack and hosted production builds pass.

Hosted invitation, recovery, student/tutor/admin sign-in, signup, password setting, replay, malformed request and origin rejection checks all pass. A fresh invitation was also opened in the actual browser and its native Continue button successfully reached `/update-password`; the auth service independently confirmed that the disposable user was confirmed and signed in. All fixture accounts were deleted. No emails were sent and credentials were kept in memory.

Evidence: `.vercel/auth-origin-{tests,lint,main-lint,build,deploy,hosted-tests}.log`, `.vercel/auth-origin-hosted-checks.json`, `.vercel/auth-origin-browser-regression.json` and `.vercel/auth-origin-aliases.json`. The public release manifest includes only this fix over its previous verified baseline.

## Source-integrated republication

Later automatic GitHub deployments replaced the isolated release and restored the old GET-only confirmation handler. To preserve the newer carousel work and prevent another overwrite, the fix was committed directly on top of the latest publishing source `8b64b5864885ed0d4adf24b2fa5ee7e50bfecca2` in an isolated checkout. No files in the separate publishing checkout were edited.

Published source commit: `c88bb925990bac355c9903863f8959481867d9a8` on GitHub `main`. Exactly four files are in that commit: the confirmation route, its email-page helper, executable regression tests and their test loader. No calendar migration or calendar feature is included. The commit can be tested with `node --test tests/auth-email-origin.test.mjs` without adding dependencies.

Automatic production deployment: `dpl_3oeiUsd1NFDcky4KEKR7hPWNTdj9`, verified READY on both public aliases. Local production build and all email tests pass; the changed email files pass lint. Full lint on the newer website source has an existing `react-hooks/set-state-in-effect` error in `src/app/(app)/exams/[examSlug]/[subtestSlug]/runner.tsx:54` and the existing image warning. Neither is introduced by this fix.

Latest validation evidence is in `.vercel/auth-origin-latest-*.log` and `.vercel/auth-origin-latest-aliases.json`. The publishing branch now contains the fix, rather than relying on a separate manually deployed source snapshot.
