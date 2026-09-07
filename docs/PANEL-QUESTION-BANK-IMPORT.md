# Panel question bank and balanced full mocks

Prepared 7 September 2026 from `EMeducate_Panel_Interview_Question_Bank.docx`.

The bank contains 32 numbered themes with five questions each (160 total). Every question, theme heading and preparation note was compared with the supplied document, normalising only apostrophes and dash typography. Existing panel IDs and question indexes are retained, so saved recordings and older links still resolve. Unrelated MMI additions in the main workspace are outside this release.

## Full panel selection

A 30-minute full panel has ten questions in five consecutive pairs:

1. Theme 01, Motivation for medicine, always opens the interview.
2. Two distinct themes are chosen from 02–14.
3. Two distinct themes are chosen from 15–32.

The four themes after Motivation are shuffled. Each selected theme contributes two distinct, randomly selected questions, kept together. Every question has three minutes; there is no extra preparation time or pause in the full mock. Setup shows the structure and neutral labels; question wording is revealed only when its timed response begins. Selection takes place on the server. Existing 10-response grouping and 12-credit full-mock marking remain compatible.

## Individual practice and recordings

Practice offers a numbered theme selector and a question selector. Its preview, timed reading, response and saved audio snapshot all use the selected question. Invalid panel question indexes are rejected, and an upload retry cannot switch the saved question. Old links without a question selection default to question 1. The existing audio upload, transcription, self-rating and study-note pipeline is retained.

## Validation and release

The regression suite compares the imported content against the document fingerprint and exercises 1,000 full-panel selections. It verifies motivation-first ordering, exactly two themes from each range, five distinct themes, paired distinct questions, all 160 questions reachable, and exactly 30 minutes. API tests cover the selected audio snapshot, invalid selections and retries. The existing dashboard suggestion test now accepts an available Ethics question in either format, as the enlarged bank includes panel Ethics questions.

No database migration, new secrets, production environment change or paid service is required. Publish from the isolated `codex/panel-question-bank` worktree based on the previous public release; do not publish the unrelated changes in the main workspace. Validation logs are saved in the parent `.vercel` directory as `panel-bank-tests.log`, `panel-bank-lint.log` and `panel-bank-build.log`.

Validation completed: all 52 interview tests passed; full lint passed with zero errors and one pre-existing image warning. The full Next.js production build and TypeScript checks passed using `next build --webpack`; the local Turbopack build was blocked by a process/port sandbox restriction. Ten targeted tests also passed after merging the scoped changes into the main workspace. This release is prepared locally and has not been published.
