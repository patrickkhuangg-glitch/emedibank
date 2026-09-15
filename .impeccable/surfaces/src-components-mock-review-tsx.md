---
version: 1
slug: "src-components-mock-review-tsx"
primary_target: "src/components/mock-review.tsx"
related_targets: ["src/components/mock-review.module.css", "src/lib/mock/review.ts"]
---

# Post-exam mock review

Operate mode. Local extension of Studocyte’s established website identity, documented on 9 September 2026. PRODUCT.md, DESIGN.md and the global design sidecar remain unchanged. The exam-taking interface stays isolated; this surface brings students back to Studocyte after completion.

## Direction contract

THESIS: Show the result and pace of a completed mock, then make each question’s answer and explanation easy to inspect. For the QR form, questions 1–28 are seven shared-stimulus sets of four; questions 29–36 are eight standalone questions. Preserve set membership and numbering across the runner and review.

OWN-WORLD: Inherit culture-paper backgrounds, white surfaces, violet brand/actions and mint positive feedback. Bricolage Grotesque sets page headings and headline metrics; Hanken Grotesk sets reading copy and controls. The branded header retains “Part of EMeducate”, a dashboard link and “Back to mock exams”. Muted burgundy identifies incorrect answers as a semantic status, with explicit text labels alongside colour.

STORY: Read raw score, estimated scaled score, estimated ANZ percentile and time on questions; inspect set-level marks and pace; filter by missed questions or question type; open an individual answer and explanation. Type analytics describe this attempt and explicitly caution against treating small groups as overall ability.

FIRST VIEWPORT: A restrained branded header leads to the mock title, “Review missed questions” action and four metrics in one shared white panel. Below, the question breakdown occupies the wider column and question-type analytics a narrower companion panel. The first visible multi-question set starts open. Every set header includes its number range, title, marks, total time, average time per question and an explicit violet disclosure chevron.

FORM: Code-led local extension. Set summaries use native disclosures; the chevron points right when closed and rotates down when open. Standalone questions follow the grouped sets in a separate list. Question rows expose number, stem, status and measured time, and open a detail view with question information, supported tables/images, chosen and correct answers, explanation and previous/next navigation. “Review missed questions” opens the first non-correct question; the missed filter includes partial, incorrect, unanswered and unavailable results. Result and type filters combine; selecting an active analytics type clears that type filter. An empty result is explicit.

FINISH: Reviewer handoff disposition: ship for the disclosure-cue fix. The initial full UI review identified the missing set disclosure cue; the explicit chevron was added and settled desktop/mobile open/closed captures verified the fix. This records the reviewed local surface, not a production deployment or a new design approval. Evidence is retained in `.impeccable/review/qr-mock/`: `desktop-overview-{0,1,2}.png`, `mobile-overview-{0,1,2,3,4,5,6}.png`, and `desktop-disclosure-{open,closed}.png` / `mobile-disclosure-{open,closed}.png`.

## Layout

The centered content is capped at 1264px with 32px desktop gutters. The main review uses a flexible question column and a 310px analytics column; individual review uses two equal columns for question information and explanation. White panels have quiet hairline borders and 12–16px corners; actions and segmented filters use pills.

At 1000px and below, question rows place status beneath the stem and preserve the time at the right, omitting the secondary type label and row arrow. At 760px and below, gutters become 20px, headline metrics form a two-by-two grid, analytics and explanation stack below their companion content, the title/action stack, and the type selector takes the available width. Wide question tables scroll within their own container. Set disclosure chevrons remain visible on mobile.

## Data and interaction constraints

- Individual review now includes every question number above the question. Correct numbers are mint green, incorrect numbers burgundy/red, partial credit violet, and unanswered/unavailable neutral. The current question has a separate dark outline and `aria-current="step"`; each button names its number and result for assistive technology. Numbers wrap on mobile and jump directly to the selected question. Verified 36 buttons, 27 correct/9 incorrect in the labelled demo, first/last and incorrect jumps, and no overflow at 390px. Captures: `desktop-number-navigation.png` and `mobile-number-navigation.png`. This small follow-up was browser-checked separately from the earlier disclosure reviewer verdict.
- Raw score distinguishes incomplete marking with an em dash. Estimated scaled scores and percentiles remain explicitly labelled estimates; methodology describes the benchmark comparison and QR form’s top-score threshold. No cohort calibration is claimed.
- Each question accumulates time across visits. Timing includes calculator/navigator use while on that question and excludes loading, marking, breaks and answer review. Set averages divide total set time by every question in the set, including unanswered questions. Summary metrics and type analytics use the full supplied attempt, independently of list filters.
- The local preview at `http://127.0.0.1:8781/review.html` visibly labels its answers and timings as examples, not a saved student attempt. Production review receives measured timings and uses signed solution access; preview results must never become student history or evidence of a real score.
- Explanations support loading, unavailable and failed-request copy with a retry action. Chosen and correct answers have explicit labels. Question navigation disables the first/last unavailable direction. Buttons, links, selectors and summaries have visible violet keyboard focus; filter state uses `aria-pressed`; loading uses a status announcement. Reduced-motion preferences remove transitions, including the disclosure rotation animation.


## Published UCAT coverage

Published 9 September 2026 to UCAT full mocks, mini mocks and completed question-bank practice sessions. Practice uses the same question/set navigation, timing and explanations, with raw marks, accuracy and answered counts instead of scaled-score or percentile estimates. The published QR Mini Mock #1 has 36 questions in 26 minutes: seven four-question sets followed by eight singles. The timer totals are frozen before grading and reused by the review screen. Live mock and practice flows were checked with a temporary account; attempt timing storage and read-only unanswered explanations were verified, and the fixture was removed. Release and verification receipts are under `artifacts/ucat-mock-review-release/`.


## Paid mock report extension — 9 September 2026

THESIS: Keep results immediately readable and deeper analysis in a separate Detailed report view.

OWN-WORLD: Extend the approved violet/mint Studocyte review with compact white panels and existing typography. Blur serves locked content only.

STORY: Free students receive scores and practical takeaways; paid students investigate patterns, review priorities and plan practice.

FIRST VIEWPORT: Preserve scores and section rows. Detailed report has four task tabs; premium panels use accessible lock overlays for trials.

FORM: Code-led incumbent extension, user-pinned world (no direction seed). Real answer traces and completed report history support the new analytics; no invented historical results.

FINISH: Bounded desktop/mobile checks, finish review, accessibility fixes and private report-access tests. DESIGN.md remains the incumbent visual authority; no shipping rasters added.

Finish disposition: ship. Upgrade-link contrast, active mobile tab visibility and access-refresh feedback were corrected and confirmed. Live free/trial/paid response tests passed, and the disposable account/report were removed. Scoped release evidence is in `artifacts/mock-report-release/`.
