---
version: 1
slug: "src-app-app-bookings-page-tsx"
primary_target: "src/app/(app)/bookings/page.tsx"
related_targets: ["src/app/(app)/bookings/booking-session-list.tsx"]
---

# Bookings lesson ledger

Scope: an Operate-mode, role-aware lesson ledger for administrators, tutors and students. It keeps scheduled and historical tutoring easy to scan while preserving the actions, calendar links, cancellation and follow-up work attached to an individual session.

## Direction contract

THESIS: Treat bookings as a dense operational ledger: make many lessons scannable first, then reveal scheduling, actions and follow-up only when the user asks for them.

OWN-WORLD: Inherit the established Culture Lab world. The ledger is a Slide-White squircle on Culture Paper with quiet ruled rows, Crystal Violet for active controls and Culture Mint for live/scheduled state. The administrator's scheduler is the single Microscope-Field dark surface and is collapsed by default.

STORY: Users choose Upcoming or Past, narrow the ledger to the relevant lesson, scan date, lesson, person, duration and status, then open one row for the actions or follow-up belonging to it. Administrators may open the separate scheduler when they need to create a lesson; tutors and students arrive directly at their ledger.

FIRST VIEWPORT: The page introduction leads into a compact dark **Book a lesson** disclosure for administrators when Zoom is available, followed by the lesson ledger. The ledger header combines the Upcoming / Past segmented switch and its counts with search; the Past view adds its status filter. Non-admin views omit the scheduler so the ledger becomes the immediate focal surface.

FORM: Code-led redesign of the existing bookings workflow. The defining composition is a compact, paginated table-like ledger whose native row disclosures preserve operational detail without inflating every row; no global visual token or component rule is introduced.

INTERACTION: Upcoming and Past are mutually exclusive segmented views with visible counts and reset pagination when changed. Search matches lesson title, student name or student email. The status filter appears only in Past and narrows to Completed, Needs review or Cancelled. Each lesson is a native details disclosure: its closed summary is the scan row, and opening it progressively reveals role-appropriate session actions, notes and homework. Existing row actions remain available, and staff retain inline editing of tutor notes and homework.

CONTENT TRUTH: Upcoming contains scheduled sessions in ascending date order; Past contains every non-scheduled session in descending date order. Staff pages render 20 filtered rows per page and student pages render 10. Administrators can schedule only through the collapsed scheduler when Zoom is configured; when it is not, the dark scheduler surface becomes an explicit Zoom setup state rather than a non-working form. Staff see the student identity needed to operate the lesson, while students see only their own lesson actions and released follow-up. A session-load failure must replace the ledger with a truthful, retryable error state and must never masquerade as an empty or filtered result.

RESPONSIVE: At desktop widths, preserve compact aligned columns for date, lesson, student when staff-facing, length, status and disclosure. On mobile, remove the visual table header and reflow the same facts into compact row metadata: date/time anchors the row, lesson and tutor/duration remain central, staff retain the student name, and status plus disclosure remain immediately visible. Search and the Past-only status filter stack when needed; expanded actions and follow-up fields wrap without horizontal scrolling.

FINISH: Keep the collapsed ledger readable at volume and reserve expansion for action. Counts, pagination ranges and empty states must reflect the active view and filters. Distinguish a genuine empty period, no filter matches and a load failure with separate copy and recovery, while keeping focus-visible treatment on segmented controls and native disclosure summaries.
