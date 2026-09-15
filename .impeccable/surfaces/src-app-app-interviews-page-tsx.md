---

Release update (6 September 2026): published in commit `4d1c2ab567972fc954e74750f700658967fd142b`, deployment `dpl_9yKD9voCyN5v48eWgJzEgVkTmj3V`. Private practice-history migration is approved/applied, and authenticated hosted privacy/persistence checks pass. Earlier pending-release notes below describe the original design review. Current release details: `docs/INTERVIEW-PRACTICE-PROGRESS-HANDOFF.md`.
version: 1
slug: "src-app-app-interviews-page-tsx"
primary_target: "src/app/(app)/interviews/page.tsx"
related_targets: ["src/app/prototypes/interviews/page.tsx","src/components/interviews/practice-progress.tsx"]
---

# Interview practice progress

Operate mode. Existing dashboard extension for students reviewing their recent practice and choosing the next question. Use saved rehearsals and recordings, with optional student self-ratings out of 5 kept separate from tutor feedback. Dates and weeks use Australia/Sydney, Monday first. Preserve the interview navigation, notes and introductory tour.

## Direction contract

THESIS: Make practice coverage visible by date and theme, then offer an actionable next question. Completed MMI stations and panel responses count once under their main theme; weekly averages include only valid student self-ratings (1–5), with unrated work retained in practice counts. Tutor marks remain separate.

OWN-WORLD: Inherit Studocyte’s light surfaces, display headings, mint activity shading and violet controls. No new visual identity.

STORY: Select a day, understand its week’s counts and self-ratings, then practise an under-covered or lower-rated theme. Three suggestions use the past 28 days, balancing coverage, time since practice and lower self-ratings, and link directly to a question. Suggestions are practice guidance, not an exam-readiness assessment.

FIRST VIEWPORT: Retain the dashboard heading and dark next-session board, replacing invented stats with supplied current-week totals. Below, the selected month and preceding month lead into a weekly theme table beside existing notes. Calendars stack on phones. Neutral cells denote no practice, with mint shading for 1, 2–3 or 4+ practices per day; numeric counts and accessible date labels also communicate activity. Violet marks the selected date, while today is underlined.

FORM: Code-led, precisely specified local extension; seed not applicable. Day selection updates its activity detail and selected week immediately without navigation; separate week controls leave the selected date unchanged. Month links move the two-month window, Today resets it, and future dates are disabled. The theme table shows count, average out of 5 and rated-response count, distinguishing no practice from unrated practice. Optional self-ratings can be changed or removed after saving; saving and failure states are explicit. Unavailable history shows a reload action and withholds summaries and suggestions rather than inventing progress.

FINISH: Scoped UI finish review disposition: ship, with no material fixes. As-built source is documented here; the existing DESIGN.md, PRODUCT.md and design sidecars are inherited unchanged. Desktop/mobile review evidence is retained in `.impeccable/review/practice-progress/` as `desktop.png`, `desktop-calendar.png`, `desktop-week.png`, `mobile-calendar.png`, `mobile-week.png` and `mobile-week-end.png`. This disposition covers the reviewed UI only: the production practice-history migration is blocked pending explicit approval, hosted persistence is unverified, and the public alias remains on the previous release. This record does not establish that the feature is live.
