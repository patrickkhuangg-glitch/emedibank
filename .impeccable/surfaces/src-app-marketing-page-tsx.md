---
version: 1
slug: "src-app-marketing-page-tsx"
primary_target: "src/app/(marketing)/page.tsx"
related_targets: ["src/app/(marketing)/home.module.css", "src/components/marketing/home/hero.tsx", "src/components/marketing/home/motion.tsx", "src/components/progress-hero.tsx", "src/components/progress-hero.module.css", "src/components/format-section.tsx", "src/components/format-section.module.css"]
---

# Studocyte homepage

Persuade mode. Public route `/`, redesigned on 9 September 2026 within the user-pinned Interview Preparation landing aesthetic. This records the built homepage; global `DESIGN.md`, `PRODUCT.md` and design sidecars remain unchanged. The existing world is extended, with no replacement identity or new global token system.

## Direction contract

THESIS: Let visitors inspect practice, tutor feedback and progress before choosing their exam or joining the opening list.

OWN-WORLD: Inherit Studocyte's violet actions, mint progress, ink contrast, culture-paper ground, white surfaces, Bricolage headings, inherited reading face, rounded demonstrations and pill controls. The approved Interview Preparation page is the visual authority.

STORY: Launch announcement and product demonstration; exam destinations and formats; teaching benefits; Cyto and progress; getting started; opening list; FAQs; final practice action.

FIRST VIEWPORT: Large left-aligned ink/violet headline with opening-list and existing-student actions balances a readable product preview on the right. Both actions and the complete preview take priority over a sticky effect on shorter desktops.

FORM: Code-led, product-led composition, using open ruled lists and alternating white, paper and pale-violet sections. `artifacts/home-redesign/DIRECTION.md` records the contract and the Duolingo spacing/motion reference; no text or assets were copied from that reference.

## Overview

The signature is an illustrated practice → tutor feedback → progress sequence driven by native scrolling on roomy desktops. The product illustration remains the central proof object. Existing Cyto appears beside its controls and as the large thriving mascot with five labelled moods further down the page. No new photography, generated imagery or other shipping raster assets were introduced.

Preserved content includes all four exam choices and format descriptions; teaching and marking benefits; six gamification features; four getting-started steps; the existing `LaunchWaitlist`; four FAQs; final free-mock action; and EMeducate attribution. The redesign does not establish new product availability, score claims or commercial terms. Older `PRODUCT.md` statements about Interviews being a placeholder predate the implemented interview surface and should not override it.

## Colors

Violet remains the action and heading accent; preview progress fills use mint. White and inherited paper alternate with a local pale-violet section fill (`#eeeaf6`). Muted ink supports reading and hairline rules organise lists. The blue UCAT illustration preserves the exam-interface distinction rather than introducing a marketing accent.

## Typography

Bricolage carries titles, with Hanken inherited for reading and Plex Mono retained inside product data. The homepage hero uses a fluid 44–64px heading, weight 700, line-height 1.08 and tightened tracking. Section headings use 32–46px at weight 600; main reading text is 15–16px with approximately 1.65–1.7 line-height. These are local homepage refinements, not replacements for the global type ramp.

## Layout

The shared container retains the marketing frame. Wide layouts use nearly equal hero columns, four exam links, two-column format/benefit/waitlist passages, three-column progress features and four sequential steps. Most sections have 92px vertical padding, falling to 64px below 1024px and 54px at 640px. The format section stacks at 700px; the hero stacks below 1024px; remaining major pairs stack at 640px, while steps and small progress features retain two columns.

Sticky storytelling requires width at least 1024px, height at least 800px and no reduced-motion preference. CSS and JavaScript use the same thresholds. Its region is `190svh - 64px`, with the inner hero sticky below the 64px navigation clearance. Desktops at 799px height or less use natural flow, 20px hero vertical padding, no copy-bottom padding and a smaller 44–58px title. Mobile and reduced-motion also use natural flow.

## Elevation & Depth

Most sections use tonal separation and rules. The preview has a diffuse ink-tinted shadow (`0 20px 60px -30px rgba(39,24,69,.27)`). Native scrolling progressively removes its initial perspective tilt and slight scale reduction; no scroll capture or timer advances the story.

## Shapes

The preview and format rows use 20px corners. Actions, preview choices and format tabs remain pills. Benefits, steps and FAQs use open rows with hairline separators rather than repeated enclosing cards.

## Components

- **Product preview:** Starts on UCAT practice. Scroll boundaries at 33% and 70% advance to the marked essay and progress dashboard. Manual buttons override the current scene until the next boundary. All three screens share an intrinsic grid frame, reserving the tallest screen's space. Inactive screens are hidden and inert; controls expose pressed state and controlled-panel IDs. The caption explicitly identifies illustrative scores and feedback. Simulated exam controls are illustrations, not a working exam.
- **Motion:** The hero interpolates Y rotation from −5° to 0°, Z rotation from 1.5° to 0° and scale from .97 to 1; passive scrolling schedules animation frames and React state changes only at scene boundaries. Preview changes crossfade over 200ms. The previous preview progress-fill and mascot-follow replay animations are disabled; Cyto's existing component is retained.
- **Entrances:** Only elements initially below the viewport receive a one-time 20px rise from .4 opacity over 500ms, with `cubic-bezier(.23,1,.32,1)`. Content is visible before enhancement. Missing animation/observer support leaves it visible. Keyboard navigation, focus entering the page or a switch to reduced motion cancels entrances. Reduced motion also disables the scroll story, preview transition and button press scaling.
- **Format selection:** Four tabs use roving keyboard focus with Left/Right, Home and End, selected state and a labelled focusable panel. Selecting Interviews changes both explanatory copy and checklist. ISAT and Interviews retain their landing-page links.
- **Navigation and forms:** UCAT/GAMSAT exam links target `#interface`; ISAT and Interviews link to their existing preparation routes. Opening-list actions target `#opening-list`; existing-student and final practice actions link to `/app`. The existing waitlist handles submission. Native FAQ disclosures remain keyboard-operable. Page controls have visible violet focus outlines; section anchors reserve 88px clearance.

## Do's and Don'ts

- **Do preserve readable proof.** Keep the full preview, caption and manual controls reachable; preserve the matching 800px height threshold in CSS and JavaScript.
- **Do preserve progressive enhancement.** Core content stays visible, and ordinary document scrolling remains available when storytelling is disabled.
- **Do preserve the supplied content and Cyto.** Illustrative scores remain labelled; no new outcome, population or availability claims are implied by this visual record.
- **Don't promote inherited preview glyphs or labels into new system rules.** Emoji/glyph icons and compact uppercase product labels remain local illustration details; decorative glyphs are not canonised as a house icon vocabulary. Likewise, the retained brand/progress labels are not a new general-purpose eyebrow style.

## Evidence

The final finish reviewer reported **ship**. Its sole finding, short-desktop clipping, was resolved by the matching 800px storytelling threshold and compact layout at 799px or less. Full lint and the webpack production build passed after that fix, as reported by the implementation task; this documentation pass did not repeat review or testing and does not assert deployment.

Screenshots are retained in `.impeccable/review/home-redesign/`, including `desktop.png`, `desktop-1440-hero.png`, `desktop-768.png`, `desktop-700.png`, `desktop-mid.png`, `desktop-end.png`, `mobile.png` and `mobile-hero.png`. The source files named in the frontmatter are the authority for final responsive and interaction behaviour.

## Cinematic motion update — 9 September 2026

The current local motion supersedes the earlier WAAPI/native-scroll implementation: both pages use the shared CinematicPage wrapper, a CSS staged hero entrance, GSAP ScrollTrigger section reveals and desktop-only Lenis smoothing. The homepage retains the 1024×800 sticky threshold and uses a 0.9-second scrub. The interview preview has 28px parallax. Touch, reduced motion, keyboard settling and route cleanup have explicit fallbacks. Existing content remains, except explanation-video claims and related student UI were removed. See `artifacts/cinematic-landing/REVIEW.md` for scope and verification. Not deployed.
