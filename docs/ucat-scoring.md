# UCAT practice scoring

Implemented 9 September 2026. This is a provisional practice estimate, not official UCAT equating. No production deployment or cohort calibration has been activated by this change.

## Current conversion

`src/lib/ucat/scoring.ts` preserves the original numerical behaviour of [TheUKCATPeople calculator](https://www.theukcatpeople.co.uk/application-guide/ucat/ucat-score-calculator), independently of its branding and implementation. The retained reference function’s 236 valid whole-number inputs across VR, QR, DM simple, DM partial and SJT were checked against the live calculator. The frozen observed outputs are in `tests/fixtures/ucat-reference-scores.json`.

- VR: raw marks /44, direct band lookup.
- QR: Studocyte v2 overrides the reference top end. Default 900 threshold is 36/36; reviewed harder forms may use 35/36. Preserve the reference through 32/36 = 850, then interpolate to the selected endpoint and round to tens, capped at 890 below the threshold. Default scores for 33/34/35/36 are 860/880/890/900; harder-form scores are 870/880/900/900. This is the user’s provisional scoring policy, not a relationship inferred from official population statistics. `QR_TOP_SCORE_BY_FORM` sets this per fixed mock assignment key; all current forms default to 36. Mock results use the configured form setting; students cannot choose their own conversion.
- DM: one-mark correct + 2 × two-mark fully correct + two-mark partially correct. In the reference form there are 23 one-mark and 12 two-mark questions, giving /47. Convert to `round(raw × 35 / 47)`, then use the /35 lookup. This matches all observed partial-mode results; it is not an official DM conversion. The optional questions-correct /35 mode loses partial-credit detail and is labelled a rough estimate.
- UK SJT: estimated bands 1/2/3/4 at ≥80%, ≥65%, ≥50%, below 50%. The source rejects fractional inputs; Studocyte extends these percentage thresholds to earned half marks.
- ANZ SJT: user-selected placeholder `round((300 + 600 × raw / maximum) / 10) × 10`. This linear estimate is separate from the reference calculator and is explicitly labelled provisional.
- Cognitive total: VR + DM + QR only, /2700. Missing sections do not produce a total. SJT is never added.

Automatic mock results use the actual available marks from loaded questions, including DM two-mark items and partial credit. A different-length section uses `round(raw / actualMaximum × referenceQuestionMaximum)` before the lookup; it is labelled as a proportional approximation, not a difficulty adjustment. Failed grading suppresses the estimated score. Unanswered questions receive zero. The five-statement DM grader awards 2 for 5/5, 1 for 4/5, and 0 below that; fully-correct status remains separate from earned marks.

Scores and estimated ANZ percentiles appear automatically after marking a mini mock (including automatic expiry) or full mock. There is no separate calculator interface or route. The QR preview is at http://127.0.0.1:8781/; the old local calculator URL redirects there.

Percentiles use the matching section’s official 2026 ANZ scaled-score deciles and quartiles. Interpolate linearly between adjacent anchors, round to a whole percentile, and label the result approximate. Do not extrapolate beyond the published 10th and 90th boundaries: show Below 10th or Above 90th instead. Use the total-score distribution for full cognitive totals; never average section percentiles. Failed grading and missing sections suppress dependent estimates. The methodology and benchmark table are collapsed beneath results.

## Official 2026 ANZ benchmarks

The user supplied [UCAT ANZ 2026 summary statistics](https://www.ucat.edu.au/media/1634/summary-statistics-for-2026.pdf), covering 17,341 candidates. `src/lib/ucat/benchmarks.ts` preserves all published means, quartiles and deciles. The UI shows means, medians and 90th-percentile boundaries. Mean scores are VR 619, DM 655, QR 691, cognitive total 1,964 and SJT 580. The reported total mean is retained directly rather than reconstructed from rounded section means. QR median is 680 and its 90th-percentile boundary is 880. These scaled-score distributions supply comparison benchmarks, not raw-to-scaled equating or evidence for a specific raw 900 threshold. They do not activate or fit the future cohort model.

## Why 600 is not a universal official average

[Official UK 2025 statistics](https://www.ucat.ac.uk/results/test-statistics-2025/) report means of VR 602, DM 628 and QR 661. The mean, median and mode are different statistics. The explanation that Pearson professionals always set all three to 600 should not be presented as established UCAT methodology. [Official ANZ scoring](https://www.ucat.edu.au/about-ucat-anz/scoring/) confirms the cognitive total and separate SJT scale, but does not supply this raw-to-scaled conversion.

## Future exam-specific Studocyte scale

`src/lib/ucat/calibration.ts` supplies a tested draft-building and scoring algorithm. It is deliberately not connected to live results yet. It describes performance within the Studocyte cohort; it does not equate different exam forms or establish correspondence to official UCAT ability.

1. Create an immutable form version covering question IDs/order, content revision, answer keys, maximum marks, grading version and duration. Keep timing accommodations in separate profiles.
2. Capture server-verified submitted attempts: user, form version, timing profile, attempt number, earned and maximum marks, response/exposure history, preview/void flags, submission reason and date. Preserve unanswered questions and timer-expiry submissions. Do not select only students who answered everything or scored well.
3. Use unique first timed submissions with no prior question exposure. A duplicate first attempt is a data error requiring resolution. Exclude previews, repeats, voided and untimed attempts. Current per-question attempt records alone are insufficient to reconstruct this reliably; durable form-level capture must be implemented before collecting a calibration cohort.
4. Start review after at least 500 eligible unique students per form/section/timing profile. This is an operational review floor, not a guarantee of sufficient statistical precision. Assess representativeness, exposure bias, standard errors/bootstrap stability, reliability and a later holdout cohort before approval. Different forms need shared anchor items or another defensible linking study to claim cross-form comparability.
5. A candidate model uses the sample raw mean μ and sample standard deviation σ. Calculate `Studocyte score = clamp(round((600 + 100 × (raw − μ) / σ) / 10) × 10, 300, 900)`. The raw mean maps to 600 before rounding/clipping; the final cohort mean can differ slightly. For QR, the configured top-score rule still applies: 900 is awarded only at 36/36 (default) or 35/36 (reviewed harder form), with scores below that threshold capped at 890. This threshold is part of the model identity. For other sections, zero and full raw marks do not necessarily attain the scale endpoints under this model. The mode is not forced to 600.
6. Building a model always returns a draft. An approved, versioned model must carry its validation report and approval date, and match the exact form, section, maximum marks and timing profile. No automatic switch occurs when the sample threshold is reached. Store each historical result with its raw marks and scoring version, so later models do not silently change old results.

Before enabling cohort scores, implement durable collection, audited model approval/storage, model selection at submission and immutable result snapshots. These are future integration tasks; the current change provides the algorithm, validity guards and provisional UI without pretending that this data already exists.

## Validation

Run `node --import tsx --test tests/ucat-scoring.test.ts` and `node --test tests/ucat-grid-grading.test.mjs`. Coverage includes reference parity, invalid inputs, DM overlapping counts and partial marks, fractional SJT, missing totals, grading failures, and calibration eligibility/version restrictions. Preview verification also covers input changes and a completed QR mock.
