# Independent security test brief

Status: prepared; Patrick is the confirmed commissioning owner. No external tester has been engaged and no independent report has been received.

The commissioning owner must provide the tester with written scope, a protected staging URL, isolated provider test accounts, synthetic users A and B plus an admin, and the release commit/migration identifiers. Confirm test dates, contact, costs and data handling before engagement. Production testing requires an agreed scope; no denial-of-service, real charges, bulk emails, destructive record changes or access to unrelated accounts.

| Area | Minimum cases and acceptance evidence |
| --- | --- |
| Authentication | Signup protection cannot be bypassed via direct Supabase signup; expired/reused/wrong-email tickets fail; genuine OAuth and staff invitations work; session fixation, logout and token expiry behave correctly |
| Password reset | Tokens expire and are one use; account enumeration is limited; hostile/encoded redirect targets fail; reset cannot update a different user or escalate role |
| Access control / IDOR | For every UI action, server action, API, RPC and file URL: anonymous denied where private, A can access A, B cannot access A, ordinary users cannot invoke admin operations; swap path/body/query identifiers |
| Database | Enumerate every exposed table/view/function and grants, including default grants and security-definer functions. Exercise SELECT/INSERT/UPDATE/DELETE/EXECUTE as anonymous/A/B/admin; column-level role/customer/credits changes must fail. Verify answer keys and server job data are hidden |
| Storage and Realtime | List/download/upload/update/delete across users and bucket paths; MIME/size limits, expired signed URLs and object ownership; inspect every publication and channel; private channels must reject unauthorized subscriptions and broadcasts |
| Stripe | Missing/bad signature, old timestamp, duplicate/reordered events, wrong test/live mode, conflicting customer metadata and database failures; no cross-account entitlements; retries are safe; checkout, renewal, cancellation and refund remove/retain benefits as specified |
| Zoom and other webhooks | Validation challenges require authentic signatures; no signing oracle; invalid/expired signatures fail; duplicate meeting events do not deduct hours twice; Mux events cannot attach another account's asset |
| Abuse limits | Distributed/concurrent signup, recording, storage, transcription and marking requests; limits apply before external spend; workers require authentication; provider failure and retries cannot bypass quota |
| XSS | Stored/reflected payloads in essays, questions, imports, feedback, profile and filenames; inline scripts require per-response nonce; CSP blocks injected scripts without breaking legitimate player/Turnstile flows |
| CSRF | Cross-origin and missing-origin unsafe requests fail; signed webhook exemptions are exact and independently authenticated; OAuth state and reset redirects are verified |
| Admin | User-role editing, invites, catalogue imports, credits, lessons, signing and file access need server authorization; sensitive events produce useful redacted audit evidence |
| Headers and leakage | Actual HTML, errors, redirects, API and static responses; HSTS/CSP/frame-ancestors/nosniff/referrer/permissions; no private keys, cookies or personal data in bundles, URLs, analytics or error logs |

Deliver a report with reproducible steps, severity, affected release, evidence redacted of secrets, and impact. Record all fixes and an independent retest. Payment release requires no unresolved critical/high findings, plus explicitly documented disposition of other findings. An automated scanner or this repository's own test suite alone does not satisfy the independent test requirement.
