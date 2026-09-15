# Zoom webhook restoration — 9 September 2026

## Outcome

Restored `https://studocyte.emeducate.com.au/api/zoom/webhook` after Zoom reported the endpoint was not responsive. Zoom Marketplace performed a fresh successful URL validation, and the existing Studocyte Tutoring subscription was saved with its original URL and event selection.

## Cause and live change

The temporary September 5 containment rule still denied every request to this route, returning HTTP 403 with `x-vercel-mitigated: deny`. The signature-first handler was already deployed; its source matched the workspace handler in production deployment `dpl_Gcvjg9FwzMAT2wJvH7ioaiewNEAA`.

Removed only the obsolete webhook containment rule. Vercel firewall configuration version 4 has `firewallEnabled: true` and no custom rules. No application deployment, database mutation or production environment-variable change was needed.

During verification, a locally signed probe failed using an older local token, so containment was temporarily restored. That local probe did not establish a production credential mismatch. After removing the restored containment rule, Zoom's own fresh validation passed using its current credentials.

## Verification

- Signature regression test passed: `node --test --test-name-pattern='Zoom rejects' tests/security-fixes.test.mjs`. This covers unsigned challenges, forged/stale signatures, valid signed challenges and mocked meeting events.
- Live unsigned and invalid-signature requests returned HTTP 401, `Invalid Zoom signature.`, without exposing a challenge response or triggering meeting processing.
- Reset the Marketplace form's cached validation state, restored the unchanged canonical URL, clicked the actual **Validate** button and observed **Validated**. Saved the existing subscription and confirmed the editor closed.
- Confirmed active firewall version 4 remains enabled.
- Read-only production query found **zero** non-cancelled tutoring sessions scheduled since 5 September UTC whose scheduled end had passed and whose base deduction was missing. This is a limited reconciliation check, not proof of actual Zoom attendance or delivery of every historical event.

No real meeting-ended event was manufactured, no tutoring credits were deducted, and no student records were changed. Full lint and build were not rerun because this repair changed provider configuration and this report only; the deployed application code was unchanged.

## Remaining verification

Observe the next genuine tutoring meeting through completion to confirm participant lookup and lesson synchronization end to end. URL validation proves reachability and matching signing credentials; it does not exercise the real meeting-participant API or credit deduction.

The earlier containment evidence remains historical. Other release-readiness findings require their own current evidence.
