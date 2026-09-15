# Business details and refund operations

Confirmed by the business owner on 6 September 2026:

| Field | Approved value |
| --- | --- |
| Trading name | EMeducate Education |
| Legal entity | P HUANG & E ZHANG |
| ABN | 13 869 236 642 |
| GST | Not registered; do not charge GST |
| Public support | support@emeducate.com.au |
| Requested forwarding destination | p.huang@emeducate.com.au |
| Statement descriptor | EMEDUCATE |

The published EMeducate website now uses these details; the Studocyte source footer is updated but awaits deployment. Stripe account settings, receipt/invoice/email templates, and forwarding have **not** been configured or verified. Check the Stripe legal/business identity, public support details, descriptor, tax settings and customer-facing documents against this table. Make invoices identify the supplier and ABN without representing GST as charged. Obtain accounting advice when GST status changes.

## Approved subscription rules

- Cancel anytime; access continues to the end of the paid period unless that period is refunded or the customer requests earlier closure.
- Full refund requested within seven calendar days of the first payment, including the first paid charge after a trial. The offer applies once per customer.
- Full accidental-renewal refund requested within 48 hours if paid benefits have not been used since renewal. Visiting account/billing solely to cancel does not count as use.
- Later hardship requests are reviewed on their merits.
- Statutory Australian Consumer Law rights are preserved and are not limited by those time windows.

These online-access terms are separate from the owner's tutoring terms, which retain the earlier-of-first-session-or-ten-business-days cooling-off rule, 48-hour session cancellation rule, exceptional-circumstance protections and unused-hours refund calculations.

## Configure cancellation before launch

Enable customer cancellation in the Stripe billing portal at the end of the paid period. Verify the Account → Manage billing action opens only that customer's portal. Test cancellation and reinstatement, check displayed access end dates and confirm no further renewal occurs. Configure the published terms URL and privacy URL in Stripe so required checkout consent works. Test monthly and annual prices and trial expiry in Stripe test mode.

## Manual refund procedure

1. Monitor the support mailbox. Verify the request against the account email without requesting a password or full card number. Record first contact time, especially if a cancellation tool failed.
2. Identify the payment and subscription in Stripe, check first-payment/renewal timing, and review relevant usage only where the renewal rule requires it. Do not require an explanation for an eligible first-payment refund. Assess statutory claims separately from additional change-of-mind offers.
3. Cancel future renewal and issue the approved refund to the original method without deducting processing fees from a promised full refund. A Stripe refund alone does not necessarily cancel a subscription: verify both actions.
4. Confirm subscription status and revoke benefits for a refunded paid period through the supported subscription sync. Reconcile any outstanding credit grant or entitlement; do not assume a refund webhook alone implements this. Test this workflow before launch.
5. Respond in writing within the published service target of 14 days. Submit approved subscription refunds within 14 days of approval; explain bank processing time. Tutoring cooling-off refunds use the separate 14-day-from-notice rule.
6. Record decision, amount, payment reference, cancellation date, benefit adjustment and response. Restrict access to refund records. Escalate hardship or consumer-guarantee disputes to the business owner and obtain legal advice when needed.

No automated refund endpoint has been added. The advertised policy depends on a functioning support mailbox and a trained operator. Configure and verify forwarding to Patrick before accepting customers; no test email was sent in this work.

## Publication and legal review

Published pages are `/privacy`, `/terms`, `/refunds`, `/acceptable-use` and `/studocyte/terms` on the EMeducate website. Studocyte signup, pricing and footer link to them. The actual public custom-domain pages were verified after deployment; see `emeducate-release.live.json`.

Ask an Australian lawyer to review APP coverage, collection notices, complaint handling, minors, overseas processing countries, provider contracts, retention/deletion commitments, acceptable-use enforcement and tutoring refund calculations. Check the privacy text against actual production retention jobs and backup retention, especially recordings, transcripts and AI providers. Do not publish an unverified promise about deletion or provider data usage. The user's approved subscription policy is a commercial choice; it does not establish legal compliance by itself.
