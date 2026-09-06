# Interview credits and student playtest — 6 September 2026

The Mock Interviews lobby now displays the student's Interview marking credit balance beside the existing prices: 2 per MMI station, 1 per panel response, or 12 per full mock. It refreshes on entry and tab focus, keeps the page visible during refresh, and reports an unavailable balance rather than inventing a zero.

Playtesting found that recording dates used the server's time zone, unlike the Sydney-time practice calendar. Recording dates now explicitly use Australia/Sydney. Regression coverage includes midnight rollover and daylight saving.

## Validation

- All 40 interview tests pass, including positive, zero and unavailable credit balances, and Sydney recording dates.
- Full lint: zero errors; one existing image-element warning in the general practice review page. Full production build passes.
- Hosted disposable-account checks pass for introduction persistence; private story creation, editing, deletion and conflicting edits; practice completion, idempotency, self-ratings and account isolation; eight-station MMI and 30-minute panel timing; hidden prompts and rejection of premature/cross-account requests.
- A synthetic 7 MiB upload resumes at the persisted 6 MiB offset and downloads with identical bytes. Missing audio preserves saved video. Repeated finalisation is safe. Zero-credit marking attempts are refused without charging or creating a marking request. Signed media access is revoked by deletion.
- A 50-response historical library supports pagination and filtering without loading private transcripts or signed media into the list. The initial bulk fixture hit the normal daily quota; the corrected test backdates only disposable quota receipts, never changes live quota settings.
- Browser playtest through the ordinary login form: all seven introduction steps; story save/edit/navigation; mock format and full-panel setup; balance changing from 20 to 0 after returning; 50-response pagination, search and self-rating save. No horizontal overflow observed at the tested desktop viewport.

The reusable hosted transport/library check is `scripts/verify-interview-student-playtest.mjs`. It requires the explicit operator flag and a verified Vercel deployment URL, keeps service credentials in process memory, and cleans up only its own fixtures. It never calls transcription or assessment providers.

## Limits

Actual camera/microphone capture, browser restart recovery of a real recording, and a human reviewer releasing a report were not exercised. The transport fixture is deliberately synthetic, not playable video. These results do not claim complete browser/device coverage.

No migration, production environment change or paid service is required.
