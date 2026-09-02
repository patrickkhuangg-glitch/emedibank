---
name: Studocyte
description: The study-cell LMS for medical-admissions exam prep — a friendly teaching lab, stained for the microscope.
colors:
  brand: "#6a45c9"
  brand-muted: "#ebe4fb"
  mint: "#1fae9c"
  mint-deep: "#127a6e"
  mint-muted: "#d6f2ed"
  coral: "#ff9d8a"
  ink: "#17122b"
  foreground: "#1f1b30"
  muted: "#565073"
  background: "#f4f3f9"
  surface: "#ffffff"
  surface-muted: "#ece9f5"
  border: "#e4e0ee"
  success: "#2c9c74"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.18em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  lg: "0.85rem"
  2xl: "1rem"
  3xl: "1.5rem"
  full: "9999px"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  section: "5rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.background}"
    rounded: "{rounded.full}"
    padding: "0.75rem 1.25rem"
  button-brand:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "0.625rem 1.25rem"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "0.75rem 1.25rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.3xl}"
    padding: "1.5rem"
  pill:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.625rem"
---

# Design System: Studocyte

## Overview

**Creative North Star: "The Culture Lab"**

Studocyte is a friendly teaching lab where a study-cell grows stronger every day. The whole system is *stained for the microscope*: content sits on warm **culture paper** under a faint grain, text is **specimen ink**, and colour arrives as two deliberate stains — a **crystal-violet** for anything you act on and a **culture-mint** for anything alive (progress, immunity, streaks, and Cyto the mascot). It reads like a clean lab slide, but it behaves like a game you want to win.

The personality is **playful-forward**: lab precision is the skeleton, not the mood. Generous squircle cards, full-pill buttons, a breathing cell mascot whose face reflects your real accuracy and streak, XP rings and progress fills that grow on load — the craft is warm and confident, never sterile. Restraint still governs the palette (two stains on a quiet ground) and the motion (every animation communicates state and collapses under reduced-motion), so the energy never tips into noise.

The one place this world stops at the door is the **exam runner**: the full-screen test interface is deliberately un-branded, hardcoded to the real Pearson-VUE and Medify palettes so exam day is never a surprise. Brand tokens never reach inside it.

**Key Characteristics:**
- Warm culture-paper ground with a faint printed grain; slide-white cards.
- Two stains, two jobs: crystal violet = action, culture mint = life/progress.
- Two grotesks: Bricolage for display, Hanken for reading; IBM Plex Mono for data.
- Flat by default, lifted by soft ink-tinted glow — never harsh black shadows.
- Generous squircles and full pills; purposeful, reduced-motion-safe animation.
- A living mascot (Cyto) and visible gamification carry the personality.

## Colors

Two saturated stains on a warm, quiet, near-neutral ground — the ground carries ~90% of every screen and the stains are used like reagent, sparingly and with intent.

### Primary
- **Crystal Violet** (#6a45c9): The single brand voice. Primary CTAs, active nav, links, level numbers, focus accents, selected states. If it's an action or the brand speaking, it's this violet.
- **Violet Wash** (#ebe4fb): The soft tint of Crystal Violet for brand-muted chips, icon tiles, progress-track fills behind violet bars, and empty-state panels.

### Secondary
- **Culture Mint** (#1fae9c) / **Mint Deep** (#127a6e): The colour of life and momentum — the study-cell mascot, immunity/health language, streak flames, XP and "immune green" success. Never used for a call to action.
- **Mint Muted** (#d6f2ed): Mint's wash, shared with success — gentle backgrounds for progress and positive feedback.

### Tertiary
- **Coral** (#ff9d8a): Reserved almost entirely for the mascot's blush cheeks. Not a UI accent.

### Neutral
- **Culture Paper** (#f4f3f9): The page ground. Warm, faintly violet-biased off-white, carrying a 0.04-opacity grain.
- **Slide White** (#ffffff): Card and surface fill that lifts off the paper.
- **Paper-2** (#ece9f5): Muted surface — track fills, quiet chips, skeletons.
- **Specimen Ink** (#1f1b30): Body and heading text.
- **Muted Ink** (#565073): Secondary text, captions, labels.
- **Microscope-Field** (#17122b): The near-black anchor for dark primary buttons and high-contrast pills; its light counterpart is Culture Paper.
- **Border** (#e4e0ee): Hairline dividers and card edges.
- **Immune Green** (#2c9c74): Positive/success feedback, distinct from mint but in the same family.

### Named Rules
**The Two-Stain Rule.** Crystal Violet is the only action/brand colour; Culture Mint is only ever life and progress (immunity, streaks, XP, the mascot). Their jobs never swap — a mint CTA or a violet progress bar is a defect.

**The Quiet Ground Rule.** Culture Paper and Slide White carry the screen. A stain that covers more than a small fraction of a viewport has stopped being a stain; pull it back to accents, fills, and single focal elements.

**The No Third Accent Rule.** Two stains, full stop. Coral is the mascot's blush, not a licence for a third UI colour.

## Typography

**Display Font:** Bricolage Grotesque (with ui-sans-serif, system-ui fallback)
**Body Font:** Hanken Grotesk (with ui-sans-serif, system-ui fallback)
**Label/Mono Font:** IBM Plex Mono (with ui-monospace fallback)

**Character:** Bricolage's slightly quirky, high-contrast grotesk gives headings personality and warmth; Hanken is a calm, highly legible workhorse for everything read. Plex Mono adds a lab-instrument note to data, timers and eyebrows. Headings always run tightened tracking (-0.01em).

### Hierarchy
- **Display** (800, clamp(3rem, 6vw, 4.5rem), line-height 1.02): Hero and page-title moments. `text-balance`, tight leading.
- **Headline** (600, clamp(1.875rem, 3vw, 2.25rem), 1.1): Section titles.
- **Title** (600, 1.25rem, 1.25): Card and panel headings.
- **Body** (400, 1rem, 1.5): Reading text; keep measures ~60–75ch.
- **Label** (600, 0.6875rem, letter-spacing 0.18em, UPPERCASE): Eyebrows and section kickers.
- **Mono** (500, 0.875rem): Timers, XP/level counts, tabular data (`tabular-nums`).

### Named Rules
**The Two-Grotesk Rule.** Bricolage sets anything titular; Hanken sets anything read; Plex Mono is reserved for numbers and machine-ish labels. Never set body copy in Bricolage or a heading in Hanken.

## Layout

A centered `Container` with comfortable gutters holds most surfaces; marketing and dashboard use asymmetric CSS-grid splits (e.g. `1.05fr 1fr` hero, a 12-column bento on the dashboard) that collapse to a single column below `lg`. Spacing follows Tailwind's 4px scale with generous section rhythm (`py-16`→`py-28`, ~4–7rem) and airy card padding (`p-6`/`p-8`). Density is low and breathable; whitespace is a material, not leftover space. Lists and grids stagger their entrance via inline animation delays.

## Elevation & Depth

Flat by default. Surfaces are distinguished by tone (paper vs slide-white vs paper-2) and a faint fixed **paper grain** (fractal-noise SVG, 4% opacity, `mix-blend-mode: multiply`) that makes the ground read as printed rather than digital-flat. Lift, when it exists, is a single soft, ink-tinted glow — never a hard black drop shadow.

### Shadow Vocabulary
- **Soft lift** (`box-shadow: 0 2px 28px -14px rgba(31,27,48,0.28)`, the `.eb-soft` class): The one elevation token — cards, the floating nav, popovers. Brand-ink-tinted and very diffuse.

### Named Rules
**The No-Black-Shadow Rule.** Depth comes from tone, grain and one diffuse ink-tinted glow. Pure-black `rgba(0,0,0,…)` drop shadows are banned; if something needs to lift, it uses `.eb-soft` or a tonal step.

**The Grain-Under-Glass Rule.** The paper grain is fixed to the viewport and sits below the exam runner (z-index 1 vs 100+), so the test interface stays perfectly clean glass.

## Shapes

Rounded and friendly. Containers are generous squircles — cards at `rounded-2xl`/`rounded-3xl` (1–1.5rem), the hero cell field at 2rem — while every interactive control (buttons, chips, tabs, badges, the floating nav) is a full pill (`rounded-full`). The base `--radius` is 0.85rem. Borders are single hairlines in `--border`; there are no heavy strokes. The recurring silhouette is the **wavy cell membrane** — an organic rounded blob used for the logo mark and the Cyto mascot.

### Named Rules
**The Squircle-and-Pill Rule.** Content containers are generous squircles; anything you click is a full pill. Never a sharp corner on an interactive element, never a pill-shaped content card.

## Components

For each component, lead with its character, then shape, colour, and states.

### Buttons
Confident, tactile pills with a subtle physical give on press (`.eb-press` scales to 0.985 + haptic buzz on touch).
- **Shape:** Full pill (`rounded-full`).
- **Primary (ink):** `--ink` (#17122b) background, Culture-Paper text; `px-5 py-3`. Hover lifts (`-translate-y-0.5`) and gains an `.eb-soft` shadow. Used for the headline action ("Open Studocyte", "Practise").
- **Brand:** `--brand` (#6a45c9) background, white text; the in-app primary action ("Review now", "Start practising").
- **Secondary / Ghost:** Slide-white or transparent with a `--border` hairline, Specimen-Ink text; hover fills to `--surface-muted`.
- **Trailing arrow:** Primary buttons often carry a circular arrow chip that nudges right on hover (`group-hover:translate-x-0.5`).

### Chips / Pills
- **Style:** `--surface-muted` background, Muted-Ink text, `rounded-full`, `text-[11px]`; brand variant uses Violet Wash + Crystal Violet. Eyebrow labels are uppercase Hanken with 0.18em tracking.
- **State:** Lock/Free/streak pills carry a tiny inline icon; the mint "🔥 N in a row" streak chip is the one place warm amber (#c47a1e) appears.

### Cards / Containers
- **Corner Style:** `rounded-2xl`–`rounded-3xl` (1–1.5rem).
- **Background:** Slide White on Culture Paper; muted inner panels use `background/40` or `--surface-muted`.
- **Shadow Strategy:** `.eb-soft` only (see Elevation). Flat at rest; many cards add a hover `-translate-y-0.5` and a border shift toward `brand/40`.
- **Border:** Single `--border` hairline.
- **Internal Padding:** `p-6`/`p-8` (1.5–2rem).

### Inputs / Fields
- **Style:** `--border` hairline on `--background`, `rounded-lg`, comfortable padding.
- **Focus:** Border shifts to Crystal Violet (`focus:border-brand`); no heavy glow.

### Navigation
- Floating, detached pill nav in Slide White with `.eb-soft` lift; brand wordmark (the wavy-cell `StudocyteMark` + "Studo·cyte") at left with a small "Part of EMeducate" endorsement. Active item in Crystal Violet.

### Cyto — the study-cell mascot (signature)
An SVG cell whose face and accents toggle by a `mood` prop and animate in pure CSS (`.cyto`, reduced-motion-aware). Moods map to real stats — sad / worried / focused / sleepy / happy / thriving (crowned) / celebrate. The expressive character is red; the small logo lockup keeps the mint `StudocyteMark`. It is the clearest carrier of the playful-forward personality.

### Progress & gamification (signature)
XP rings (`.eb-ring`, dashoffset animates on load), progress fills that grow from the left (`.eb-bar`), streak flames, levels, a weakness heatmap (violet→amber→red tiles), and a mastery path of node dots. These are the emotional core of the dashboard.

## Do's and Don'ts

### Do:
- **Do** obey the Two-Stain Rule: Crystal Violet (#6a45c9) for actions/brand, Culture Mint (#1fae9c) for life/progress. Keep their jobs apart.
- **Do** sit content on Culture Paper (#f4f3f9) with Slide-White cards, and lift only with `.eb-soft` (`0 2px 28px -14px rgba(31,27,48,0.28)`).
- **Do** set titles in Bricolage Grotesque at -0.01em tracking, reading text in Hanken, and numbers/timers in IBM Plex Mono with `tabular-nums`.
- **Do** use full-pill interactive controls and generous squircle cards (`rounded-2xl`/`3xl`).
- **Do** animate to communicate state (progress fill, XP ring, list rise, mascot mood) and gate every animation on `prefers-reduced-motion`.
- **Do** lean playful — the mascot and visible gamification (streaks, XP, levels) are foreground personality, not decoration.

### Don't:
- **Don't** swap the two stains (no mint CTA, no violet progress bar) or introduce a third accent — coral is the mascot's blush only.
- **Don't** use black drop shadows or heavy borders; depth is tone, grain, and one soft ink-tinted glow.
- **Don't** apply brand tokens to the exam runners — they stay hardcoded to the real Pearson-VUE / Medify test-day palettes.
- **Don't** over-animate; motion is state, not sparkle, and never fights reduced-motion.
- **Don't** set body copy in Bricolage or headings in Hanken.
