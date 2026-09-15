# Supabase, secrets and recovery runbook

> **8 September follow-up:** Patrick confirmed receipt of the setup alert and ownership of both stalled work and overdue marking. See the [retention, recovery and support update](INTERVIEW-RETENTION-RECOVERY-2026-09-08.md) for the passed live retention checks, published support card and successful isolated hosted logical restore. Managed physical-backup recovery and full application cutover remain separate checks.

Status: operational steps pending unless an evidence file explicitly records completion. Account-owner actions cannot be inferred from source code.

## Supabase hardening, per environment

1. Record project ID, region, owner and intended environment. Confirm production ownership and billing separately from development/staging.
2. Run `supabase/security-inventory.sql` in the project's SQL editor. Store a reviewed export without user data. Review every exposed relation, view, function, bucket, column grant, default privilege and publication. Inspect Realtime channel authorization in the dashboard/application as well as SQL. Do not assume a locally absent object is absent in production.
3. Run Supabase Security Advisor; resolve findings and retain the dated result. Require RLS on exposed application tables, security-invoker views, narrow grants, explicit function EXECUTE grants and fixed search paths for security-definer functions. Test positive and negative cases with separate accounts through actual APIs.
4. Enable database SSL enforcement and verify every client connects with TLS. Evaluate network restrictions against the actual Vercel connection path and outbound IPs. Do not whitelist a developer's current IP as the sole production dependency. Use fixed egress where available or document why restrictions cannot safely cover a particular path. Keep tested owner recovery access.
5. Require MFA for every organization/project owner and remove unnecessary privileged members. Store recovery codes in the owner's password manager. Record owner attestation, not recovery codes.
6. Enable email confirmation, remove wildcard production redirect URLs, set a reasonable OTP expiry (at most one hour unless a documented flow requires otherwise), and verify reset/invite/confirmation links stay on the correct environment.
7. Configure custom SMTP with an approved sender and provider. Verify SPF/DKIM/DMARC and sender/domain alignment. Send owner-authorized confirmation, reset and invitation tests; verify delivery and abuse limits. Support forwarding alone is not a substitute for SMTP configuration.
8. Review API/server keys and Vercel scopes. `service_role` must exist only in trusted server secrets and must never be available to browser code, analytics or untrusted previews.

## Secret review and rotation

Run `npm run scan:secrets` and review the sanitized report. Also inspect Vercel variable names/scopes and access, old deployment bundles, build/runtime logs, screenshots shared during support, CI logs and provider audit logs. Local pattern scans do not cover these surfaces.

For each credential that may have been exposed: identify issuer and consumers; create a replacement in the provider; update only the appropriate environment's server secret; deploy consumers; verify service operation; revoke the old credential; verify the old credential is rejected; remove cached artifacts or old deployment access where feasible. Record issuer, key ID (not value), affected systems, rotation time, verifier and incident actions. Do not rotate unrelated keys blindly or delete the only working key before replacement is verified. For webhook secrets, coordinate provider and endpoint updates to preserve delivery/retries. Investigate whether any unauthorized data or billing actions occurred.

## Hosted backup restore drill

Proposed targets for owner approval: **RTO 4 hours**, **RPO 24 hours**. These are targets, not demonstrated capabilities. Choose a backup/PITR tier and storage backup schedule that can meet them. Patrick is the confirmed recovery owner. A deputy remains to be nominated.

1. Record incident declaration time, recovery owner/deputy and source backup timestamp. Record the release and migration versions compatible with the backup. Confirm the source backup is readable before a change.
2. Create an isolated, protected non-production destination in the agreed region. Disable Stripe live actions, outbound email, Zoom, AI processing, cron and webhook consumers. Never attach production domains or live service credentials to the recovery target.
3. Restore a hosted Supabase database backup/PITR using the supported platform procedure. Record start/end times and all required manual configuration. Where production data is necessary, restrict access and use an approved retention/cleanup plan; otherwise use a representative synthetic dataset.
4. Restore Storage **file bytes** separately. Supabase database backups include storage metadata, not the stored objects. Verify object counts, representative hashes, ownership, MIME types and private signed access. Document where encrypted object backups are kept and who can restore them.
5. Restore/configure Auth redirects, secrets, SMTP, network settings and provider integrations from the controlled configuration register, keeping outbound integrations disabled. Review grants and run Security Advisor again.
6. Verify representative profiles, subscriptions, entitlements, essays, lessons and private files. Run anonymous/A/B/admin access checks and application smoke tests. Reconcile Stripe state before any billing integration is re-enabled; do not blindly replay old billing events or jobs.
7. Record the usable recovery completion time and achieved data-loss window. Compare with RTO/RPO, document gaps, and repeat the drill after fixes. Have the owner and deputy sign off. A subsecond local synthetic restore is not evidence of a four-hour hosted recovery capability.
8. Remove or sanitize the drill environment under the agreed data-handling plan after evidence is retained. Keep backup artifacts private and encrypted; never commit database dumps or student data.

## Evidence template

Record: environment/project; owner/deputy; date; source backup and timestamp; destination; release/migration versions; database and storage checks; security checks; integration state; start/end time; achieved RTO/RPO; failures/remediation; reviewer; next drill date. Store only references to secrets and private artifacts, never their contents.
