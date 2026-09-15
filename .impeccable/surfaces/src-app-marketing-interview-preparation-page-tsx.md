---
version: 1
slug: "src-app-marketing-interview-preparation-page-tsx"
primary_target: "src/app/(marketing)/interview-preparation/page.tsx"
related_targets: ["src/components/marketing/interviews/landing.module.css", "src/components/marketing/interviews/interactions.tsx", "src/lib/interviews/marketing.ts"]
---

# Interview preparation landing and pricing

Persuade mode. Public route `/interview-preparation`, for Australian medical and dental applicants considering independent interview practice and tutor feedback. The primary action opens `/interviews`; anonymous visitors then sign in. Merely visiting this page does not start a trial. This surface was published on 8 September 2026; artifacts/interview-landing/release.json records the deployment.

## Direction contract

THESIS: Demonstrate the practice-to-human-feedback workflow before asking visitors to choose a plan; product examples carry the persuasion.

OWN-WORLD: Inherit Studocyte’s violet actions, mint accents, ink contrast, rounded panels, pill CTAs and 72rem frame.

STORY: Understand realistic practice, inspect useful feedback, distinguish self-review from paid marking, then start free or explore proposed packages.

FIRST VIEWPORT: Equal desktop columns place a large two-part heading and violet trial CTA left, a slightly rotated illustrative tutor report right. Supporting trial terms sit immediately below the actions.

FORM: Medify-inspired product-led section sequence within Studocyte’s established identity. Brief-pinned direction; seed key: not supplied. No generated comp or ranked concept choice is asserted by this record.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Structure and memorable proof

The report is the memorable object: an example 5/7 assessment with specific strengths, priorities and a next step. Captions identify examples as illustrative; the expanded report separates unassessed domains and labels its next-station recommendation as planned.

The page proceeds through the report hero; 74 MMI stations, 32 panel themes and 104 story prompts; six section anchors; practice formats; recording/transcript/reflection example; dark expert-feedback section; reviewer process; practice calendar and planned analytics; private story bank; Australian themes; credit costs; free and proposed paid plans; comparison and extras; EMeducate Complete; FAQs; live-support referral; final trial CTA. Alternating paper, pale violet and ink sections vary emphasis. Mint-tinted themes and Complete sections distinguish these supporting passages.

The component stylesheet owns local refinements rather than changing the global system: a 40–58px hero heading, 20px preview corners, diffuse ink-tinted shadows, a one-degree desktop report tilt and compact report typography. Bricolage headings and the inherited reading face remain recognisable. The synthetic calendar uses violet activity cells in this implementation; this is a surface detail, not a new global progress-colour rule.

## Interaction and accessibility

- Primary trial actions link to `/interviews`; practice and story links enter their protected destinations. The EMeducate package and referral use the existing external Interview Programs page.
- Native anchor navigation uses 90px section scroll clearance. The section navigation wraps; it is not sticky.
- Native `details` disclosures expose FAQs, reviewer workflow and the plan comparison. The comparison has a caption, row/column headers and a labelled, focusable horizontal-scroll region.
- Selecting a paid plan or extra-credit bundle updates an inline `role="status"` notice with its name, price and credits. Focus moves to the notice, which scrolls into view. It explicitly says the package cannot yet be purchased and no payment was taken, then offers Start free. Selection is not checkout.
- The mobile trial bar appears only after the hero has scrolled above the viewport. It links to the same free start, with safe-area padding and page-bottom clearance.
- Visible keyboard focus outlines cover links, buttons, summaries, the read-only example textarea and focusable regions. The waveform and calendar have descriptive image roles; examples do not capture or play audio. The suggested-next-station illustration is not an active control.
- One-time scroll entrances use a16px rise and opacity over450ms with inherited ease-out, staggered50ms up to150ms. Native Web Animations and one IntersectionObserver progressively enhance visible server content; initial viewport content is skipped. Keyboard navigation stops entrances, focus cancels a moving target, and reduced-motion preference cancels/disables them. Hover arrow/lift feedback is gated to a fine mouse pointer; selection scrolling respects reduced motion. Content is never CSS-hidden for animation.

## Responsive behaviour

The shared `Container` preserves the existing 72rem width. Wide layouts use two-column demonstrations, a four-column facts strip and four plan cards. At 1100px, gaps tighten and plans become two columns. At 800px, major sections become one column, facts and supporting features become two columns, and reversed demonstration sections put explanatory copy first. Section spacing reduces from 90px to 56px and the report loses its tilt.

At 480px, plans become one column, the full report’s feedback columns stack, and compact hero-report feedback stays in two columns. Dense preview padding and heading sizes reduce. The mobile trial bar hides its secondary text and reserves left space for privacy controls. The comparison table retains an 850px minimum width inside its own horizontal scroller; it does not force the page wider.

## Commercial and product truth

The local catalogue in `src/lib/interviews/marketing.ts` describes a seven-day no-card trial with 15 selected MMI stations, one question from each of 32 panel themes, 104 story prompts, one MMI mock plus one panel mock, 60 transcription minutes and two marking credits. Trial time starts with first practice, not this marketing visit. Panel/MMI/complete-mock review costs are 1/2/12 credits; alternative usage examples spend the same allowance.

Core A$199/6 credits, Pro A$349/18 credits and Intensive A$599/36 credits are proposed one-year one-off plans. Pro says “Recommended”, without a popularity claim. Extras are proposed 6/A$99, 12/A$189 and 24/A$359 bundles. Checkout and fulfilment are unavailable; existing academic subscriptions are separate. Complete is confirmed available by the user and combines one year, 36 credits, two tutoring hours and one live mock/debrief. Its outbound link opens the existing EMeducate program page. The provisional availability copy was removed.

The user authorised an A$999 founding offer. The confirmed founding price ends on 8 October 2026 at 11:59 pm Sydney time; A$1,299 applies from 9 October midnight AEDT. Date-only offers expire per request without an inventory claim. Quantity-limited offers additionally require remaining allocation and fresh verified sales data. External checkout must match the offer. The dedicated AI FAQ was removed at the user’s request; the reviewer-process explanation remains accurate.

AI assists transcription and assessment drafts; a tutor reviews the original response, edits and approves scores/comments before release. The two-working-day turnaround is a target excluding weekends, not a guarantee or verified queue estimate. Recordings are normally removed after seven days, with pending reviews protected; download and retention-policy guidance remains visible. Extended reviewed-score analytics and recommendations retain planned labels. Examples are synthetic, and the page claims no invented reviewers, testimonials or outcomes.

## Evidence and remaining work

`artifacts/interview-landing/REVIEW.md` records a successful production build, lint with one unrelated warning, four passing catalogue/credit/availability tests, local route/auth checks and tested selection, comparison and anchor behaviours. Section viewport evidence is retained in `.impeccable/review/interview-landing/`: `desktop.png`, `desktop-feedback.png`, `desktop-pricing.png`, `mobile.png` and `mobile-pricing.png`. These captures do not establish full-page visual coverage; this document does not independently certify a finish-review disposition.

Consent-gated analytics records fixed interaction/section IDs and non-personal plan metadata. Plan selection does not emit a purchase conversion. Dedicated checkout, idempotent fulfilment, add-on eligibility, extended analytics, verified Complete delivery and any authoritative founding allocation remain prerequisites to enabling the proposed offers.

Global `DESIGN.md`, `PRODUCT.md` and design sidecars are inherited unchanged. `PRODUCT.md`’s older statement that Interviews is a placeholder predates this implementation; do not use it to erase the implemented surface or treat this brief as a global product-document refresh.

The hero now reads “Interview Preparation” and explains response guides for effective answers and common pitfalls even without tutor marking. Desktop/mobile copy and reveal settling checked; mobile390px has no horizontal overflow.

Public Courses links, homepage badge and Interview feature CTA, pricing free-entry links and trial-information links now lead here. Signed-in navigation and actual checkout actions are preserved.

## Cinematic motion update — 9 September 2026

The current local motion supersedes the earlier WAAPI/native-scroll implementation: both pages use the shared CinematicPage wrapper, a CSS staged hero entrance, GSAP ScrollTrigger section reveals and desktop-only Lenis smoothing. The homepage retains the 1024×800 sticky threshold and uses a 0.9-second scrub. The interview preview has 28px parallax. Touch, reduced motion, keyboard settling and route cleanup have explicit fallbacks. Existing content remains, except explanation-video claims and related student UI were removed. See `artifacts/cinematic-landing/REVIEW.md` for scope and verification. Not deployed.
