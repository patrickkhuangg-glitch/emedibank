# 001 — Let scrolling explain the product

- Status: DONE — reviewed and validated locally
- Commit: d193c44 (dirty workspace preserved)
- Severity: MEDIUM
- Categories: accessibility, interruptibility, performance
- Scope: homepage and its exclusively used preview/format components

## Verified problems

`src/components/reveal.tsx` renders content invisible before hydration and retains positional transitions during reduced-motion initialization. Homepage controls use transition-all. `src/components/progress-hero.tsx` rotates on a 5.2-second timer independent of viewport visibility; the keyed mascot restarts with every screen.

## Target

Keep all existing homepage product content. Inherit the interview landing page's palette, Bricolage/Hanken typography, 20px illustrated-preview corners, open sections, purple actions and 1120px shared frame. Keep Cyto. Do not change the interview page or shared application styles.

Replace autoplay with a short native-scroll sequence: UCAT practice → marked essay → progress. Keep manual controls; manual selection lasts until the next scene boundary. Reserve an intrinsic shared preview frame. On screens at least 1024px wide and 800px tall without reduced-motion, a 190svh story has a sticky stage beneath the 64px header. Over the available scroll distance, transform only the illustration from perspective(1400px) rotateY(-5deg) rotateZ(1.5deg) scale(.97) to upright scale(1). No wheel interception, document-scroll mutation or React update per pixel. One scheduled rAF per scroll burst; state changes only at .33 and .7 scene boundaries. Remove listeners and pending frames when media conditions change/unmount.

Below-fold entrances use the interview LandingMotion visible-first WAAPI pattern: translateY(20px) → 0, opacity .4 → 1, 500ms cubic-bezier(.23,1,.32,1), once per section group. Cancel on keyboard/focus or preference change. Small screens and reduced motion use a normal-flow, manual preview. Buttons transition only named properties; press scale .98 for 160ms, removed under reduced motion.

## Verification

Run lint and production build. Check desktop start/mid/end/reverse scroll, manual selection, mobile 390px, a shorter desktop, direct anchors, keyboard tabs/FAQ, reduced-motion behavior and content preservation. No waitlist submission, new dependency, production deployment or student-data mutation.

## Outcome

Independent finish review: ship. The sole material finding, short desktop overflow, is resolved with a matching 800px sticky threshold and compact natural-flow layout below it. Full lint and the Webpack production build passed after the correction. See `artifacts/home-redesign/REVIEW.md` for evidence and remaining verification limits. No deployment.
