# Administrator security and external alerts — 8 September 2026

## Scope and outcome

Patrick authorised a US$50 monthly warning for each of OpenAI, Vercel and Supabase, notification-only settings, and selection of a free independent uptime provider. Existing application work was preserved. No application deployment, migration, role removal, paid subscription or MFA enrollment was performed in this review. No MFA setup secrets or recovery codes were accessed.

OpenAI and Vercel warning settings were saved and read back in their live dashboards. Administrator membership was reviewed as below. Owner MFA enrollment and recovery preparation remain incomplete. Supabase's custom US$50 warning is not configured. Better Stack independent monitoring is active, and Patrick confirmed receipt of its test email.

## Membership and authentication findings

| Service | Listed administrative access | MFA finding | Evidence |
| --- | --- | --- | --- |
| Supabase organisation | patrickkhuangg@gmail.com, sole Owner | Off | Management API organisation members returned `mfa_enabled: false` |
| Vercel EMeducate team | patrickkhuangg@gmail.com, sole Owner | Off | Member list; filtering to 2FA-enabled members returned no results |
| OpenAI EMeducate organisation | p.huang@emeducate.com.au, sole listed Owner | Personal MFA unconfirmed | People list and profile security page; profile links to personal OpenAI security settings |
| Resend | patrickkhuangg@gmail.com, sole listed Admin | Off | Team list MFA indicator |
| Cloudflare account controlling emeducate.com.au | patrickkhuangg@gmail.com, sole listed Super administrator | Off | Members list and personal Authentication page explicitly show inactive 2FA |
| GitHub patrickkhuangg-glitch | Personal account inspected; repository collaborators not audited | Off | Account security explicitly says 2FA is not enabled; Google sign-in connected |
| Studocyte application | patrickkhuangg@gmail.com and elainezhang6916@gmail.com, both Admin; no Tutor profiles returned | Neither has a verified MFA factor; app has no MFA flow/enforcement found | Read-only profiles/authentication-factor query and source search |
| Better Stack | p.huang@emeducate.com.au, sole listed Admin | Off | Members page lists Patrick only, with 2FA `No` |

These are point-in-time membership observations, not a review of every invitation, API token, service account, OAuth grant or repository collaborator. Google identity-provider MFA was not inspected. No one was removed or demoted.

Vercel also has automatic addition of private-repository committers as paid Developers enabled. Consider disabling this in team membership settings so both access and new paid seats require deliberate approval. It was not changed during this review.

## Spending warnings

| Provider | Saved setting | Recipient and practical limits |
| --- | --- | --- |
| OpenAI | Added 50% / US$50 monthly warning against the existing US$100 organisation limit; existing US$80 and US$100 warnings retained | Organisation owners plus p.huang@emeducate.com.au; subject prefix `Studocyte usage`. Organisation-wide, not interview-only. Existing spend limit, recharge and rate limits unchanged. |
| Vercel | Changed on-demand budget from US$200 to US$30; notifications on; automatic project pausing off | Spend Management email notifications enabled for patrickkhuangg@gmail.com. US$30 extra usage plus the current US$20 base subscription approximates US$50. Seats, add-ons, taxes and other excluded charges mean this is not an exact total-invoice threshold. |
| Supabase | No custom US$50 alert configured | Dashboard currently projects US$25 and the pre-existing spend cap is enabled. No supported custom budget notification control or public provider-calculated invoice endpoint was found in this review. Billing email recipient was not independently confirmed. |

Settings were verified after saving; actual new spending-warning email delivery has not been exercised because the thresholds have not been reached. Vercel's earlier threshold notifications can arrive before US$30 of extra usage. OpenAI warnings cover usage charged to the reviewed organisation; separate organisations would need their own warning.

Supabase's existing spend cap is a quota restriction, not a US$50 invoice cap or a notification-only warning. Some services can be restricted after included quotas are exceeded, and some charges are outside the cap. It was left unchanged. Until a supported external billing integration is available, Patrick should check the projected invoice weekly at the organisation Billing page. This is a manual fallback, not an implemented automated US$50 warning.

Sources: [Vercel Spend Management](https://vercel.com/docs/spend-management), [Supabase cost control](https://supabase.com/docs/guides/platform/cost-control).

## Independent outage monitoring

Selected Better Stack's free uptime plan: 10 monitors, with three-minute checks. It runs outside Studocyte, Vercel and the application queue process. No paid plan or card was added by this review.

The initial UptimeRobot agent setup returned HTTP 503 on two attempts; no active monitor was confirmed. Sanitised failure receipts are under `artifacts/release-account-alerts/uptimerobot-request.json` and `uptimerobot-retry.json`.

Patrick opened the p.huang@emeducate.com.au Better Stack account in the connected Chrome profile. Onboarding and monitor configuration were completed there. Uptime monitoring was selected; unrelated feature preferences were deselected. The onboarding form required one integration preference, so AWS was selected as a preference only; no AWS account, credentials or resource integration was connected.

Verified configuration:

1. [Studocyte public website](https://uptime.betterstack.com/team/t595260/monitors/4907331), monitor 4907331 in team t595260, targets `https://studocyte.emeducate.com.au`.
2. HTTP GET availability check every three minutes; 30-second request timeout; 30-second failure confirmation; three-minute recovery period. TLS verification on, redirects followed, IPv4 and IPv6 enabled. Europe, North America, Asia and Australia selected. No credentials, private request headers or maintenance exclusions configured.
3. Email notifications enabled. On the Free plan, everyone in the team is notified; the only listed member is Patrick Huang, p.huang@emeducate.com.au. Patrick owns outage response. Phone, SMS and paid push features were not enabled.
4. Dashboard confirmed the monitor was successfully updated and showed `Up · Checked every 3 minutes`, with recent successful checks and zero incidents for this monitor. Billing explicitly showed the Free plan. No public-site outage was induced and no paid service was created.
5. Better Stack's Send test alert action returned a sent confirmation. Patrick then replied `yes got it`, confirming inbox delivery. This verifies the test notification path, not a deliberately induced end-to-end production outage/recovery exercise.

A public HTTP check detects broad website/hosting outages. It does not establish that authenticated recording uploads, database access or AI marking work. Existing queue/cleanup alerts remain complementary.

Source: [Better Stack uptime plan](https://betterstack.com/uptime).

## Owner-only security steps

Do these directly, without sharing QR codes, authenticator secrets, one-time codes or recovery codes in chat. Store recovery material in a protected password manager or an offline secured copy. Check a fresh sign-in before closing your remaining working session.

1. **Secure the Google identity first.** In Google Account → Security → 2-Step Verification, confirm protection for patrickkhuangg@gmail.com. Add a backup method you control. This account signs into several provider accounts. Its present status is unverified here.
2. **Supabase:** open personal account settings → MFA, enroll an authenticator and verify it. Register a second TOTP factor on a separate device/app or securely separate location. Supabase does **not** provide recovery codes. Enabling MFA signs other sessions out. After enrollment and backup verification, use organisation security settings to require MFA for members. See [Supabase MFA instructions](https://supabase.com/docs/guides/platform/multi-factor-authentication) and [organisation enforcement](https://supabase.com/docs/guides/platform/mfa/org-mfa-enforcement).
3. **Vercel:** open personal Account Settings → Authentication, enable two-factor authentication using an authenticator or passkey, then save the supplied recovery codes privately. Afterwards enforce 2FA for the EMeducate team. See [Vercel setup](https://vercel.com/docs/two-factor-authentication).
4. **OpenAI:** sign in specifically as p.huang@emeducate.com.au. Open [profile security](https://platform.openai.com/settings/profile/security), follow its Enable MFA link to personal security settings, and enable or verify MFA. Complete the recovery options offered there. The organisation security page alone does not prove personal MFA status.
5. **Resend:** open your profile, choose Enable MFA, scan into your authenticator and verify the code. Complete and securely store any recovery information the provider offers. See [Resend MFA](https://resend.com/docs/knowledge-base/how-can-i-add-mfa).
6. **Cloudflare:** open [Authentication](https://dash.cloudflare.com/profile/access-management/authentication/two-factor), add a security key or authenticator, then privately save the generated recovery codes. The reviewed account currently shows 2FA inactive.
7. **GitHub:** open [account security](https://github.com/settings/security), enable 2FA and save recovery codes privately. Confirm your Google-linked login also remains usable. Review repository collaborators separately if access has been granted outside the organisation lists above.
8. **Studocyte:** adding MFA for Patrick and Elaine requires an application change: enrollment, challenge and server-side enforcement for privileged routes/actions, with a safe recovery process. Turning on Supabase dashboard MFA does not protect these two student-platform admin logins. This implementation is still outstanding.
9. **Better Stack:** open [Security](https://betterstack.com/settings/security) and complete two-factor setup and its offered recovery process privately. The new account's member list currently shows 2FA off.

Recovery readiness is unconfirmed until Patrick verifies backup access and storage. The remaining owner steps were deliberately not completed through browser automation because doing so would expose new authentication secrets or leave recovery dependent on the assistant's session.

## Validation and remaining work

- Verified OpenAI and Vercel live settings by read-back after save.
- Reviewed live provider membership/security pages and read-only Studocyte admin/factor data.
- Verified Better Stack monitor creation, saved configuration, recent successful checks, Free billing status and sole-member email routing. Patrick confirmed test email receipt.
- No code changes were needed for the saved provider settings; no application lint/build was run for this account-configuration and documentation task.
- Still required: owner MFA and recovery confirmation; application admin MFA implementation; an automated Supabase US$50 warning if supported billing access becomes available. Advanced authenticated outage checks would be additional monitoring scope.
