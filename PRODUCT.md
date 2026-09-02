# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Australian and international students preparing for medical- and dental-school admissions. Typically high-achieving school-leavers or undergraduates, self-studying under time pressure for high-stakes aptitude tests (UCAT ANZ, GAMSAT, ISAT) and admissions interviews, often alongside a degree. They practise in focused sessions and care about measurable progress toward a competitive score.

## Product Purpose

Studocyte is a subscription exam-prep platform for medical/dental admissions. It gives students an exam-accurate question bank across sections, full timed exam simulations, tutor-marked essays, and gamified progress tracking — so they build both skill and consistency, between or instead of tutoring. Success means students practise regularly, see their weak areas clearly, and lift their predicted score.

## Positioning

Studocyte brings together three things a neighbouring product rarely has at once:
1. **Real human tutor-marked essays** (GAMSAT Section II) on a credit system, with AI-assisted drafting that the tutor edits and approves before the student sees anything.
2. **Duolingo-style consistency mechanics** — a mascot (Cyto) whose mood reflects accuracy and streak, plus daily streaks, XP/levels, spaced review, and weakness heatmaps.
3. **Breadth** — every major AU med-admissions exam (UCAT, GAMSAT, ISAT) plus interviews under one roof.

It is also the always-on self-study companion to **EMeducate**'s tutoring — the platform students practise on between sessions.

## Operating Context

- Students sit real, timed, full-screen exam simulations that mirror the official interfaces: a Pearson-VUE-style runner for UCAT; a Medify-style teal passage/stimulus runner for GAMSAT (Sections I & III) and ISAT; and a dedicated essay writer for GAMSAT Section II (timed/untimed, planning space, and a 65-minute full Task A + B sitting).
- Practice is organised exam → section → category → timing; results feed a dashboard (levels/XP, daily streak, predicted band, spaced-review queue, weakness heatmap, mastery map).
- Content is authored/imported by admins (CSV / docx). Essays are marked by a tutor who reviews and approves feedback before students see it.
- Australian conventions throughout: en-AU, Australia/Sydney timezone.

## Capabilities and Constraints

- Auth, subscriptions and per-exam access via Stripe → entitlements; the free tier is admin-toggled per section; some content is gated.
- Tutor marking runs on a per-account credit balance (starts at 40; 2 credits per essay). AI first-drafts require an Anthropic API key plus the tutor's marking rubric and are always human-approved before release.
- Tech constraints: Next.js (App Router, React Server Components), Supabase (Postgres + Auth + Row-Level Security), Tailwind v4 design tokens, deployed on Vercel on push to `main`. DB migrations are hand-applied SQL. Exam runners are full-screen and intentionally isolated from the marketing/app theme so the test interface stays neutral.
- Terminology: exams (UCAT / GAMSAT / ISAT / Interviews), subtests (a.k.a. sections), categories within a subtest; "practice session", "mock", "entitlement", "interface mode".
- Interviews content type is not built yet (placeholder only).

## Brand Commitments

- Name: **Studocyte** (renamed from "EMediBank" for trademark reasons) — a "study cell" identity.
- **"Part of EMeducate" is binding**: Studocyte is a product of EMeducate, a tutoring company. The endorsement stays visible.
- Mascot: **Cyto**, a red study-cell character with moods (sad / worried / focused / sleepy / happy / thriving-with-crown / celebrate) driven by performance and consistency. A small logo mark (`StudocyteMark`) also exists in playful and clean variants.
- Account-wide **interface mode**: playful vs clean (mascot and flourishes shown or hidden).
- Voice: encouraging, plain-spoken, lightly playful; never fabricates scores or claims. Tutor feedback keeps the tutor's own house style.

## Evidence on Hand

- Live product at **studocyte.emeducate.com.au** (Vercel).
- Real question content: UCAT Verbal Reasoning (~200 Q across 50 passages) and Situational Judgement (~143 Q, partial-credit scoring); GAMSAT Section III **Genetics** (41 Q imported from docx with figures/tables). GAMSAT Section II has a **90-theme quote bank** (~360 quotes) driving essay prompts, random sittings and the full simulation.
- Tutor marking skills exist as the house-style rubric (`gamsat-lms-essay-marking`, `gamsat-s2-essay-feedback`).
- **Currently empty and must not be shown as populated:** GAMSAT Sections I, UCAT Decision Making & Quantitative Reasoning, and both ISAT sections (auto-generated demos were removed).
- No testimonials, customer counts, score guarantees, or public pricing are confirmed here — future work must not invent them.

## Product Principles

1. **Exam-accurate first** — simulations and scoring match the real test's interface, timing and mark scheme.
2. **Consistency is the engine** — reward regular practice (streaks, mascot, XP, spaced review) as much as raw performance.
3. **Human-in-the-loop quality** — AI may draft, but a tutor approves anything a student receives.
4. **Honest progress** — predicted bands and stats are clearly framed as rough guides; never overstated.
5. **Multi-exam from the schema up** — never hardcode a single exam; everything keys off the exams table.

## Accessibility & Inclusion

- Respect `prefers-reduced-motion` (mascot and UI motion already gate on it).
- Full-screen timed runners stay legible, high-contrast and keyboard-navigable.
- No formal external standard is mandated yet.
