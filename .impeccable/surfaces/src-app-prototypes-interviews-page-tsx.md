---
version: 1
slug: "src-app-prototypes-interviews-page-tsx"
primary_target: "src/app/prototypes/interviews/page.tsx"
related_targets: []
---

# Interviews workspace

Scope: an Operate-mode, unlocked interview-preparation workspace for Australian medical and dental applicants. Interviews is a distinct exam/workspace selection state: the signed-in exam switcher names and checks Interviews on `/interviews`, rather than treating it as part of another exam. The screen connects MMI and panel preparation with format-specific guides, generic story prompts and a personal practice sequence; it does not imply saved learner data, recordings, submissions or live tutor review.

## Direction contract

THESIS: Make interview preparation feel like a focused practice workspace, not a generic course dashboard.

OWN-WORLD: Inherit Culture Lab; a dark, quiet station board is the focal task, with light planning and reflection panels around it.

STORY: Applicants enter a dedicated Interviews workspace, switch between MMI and panel modes, choose a realistic next practice action, and see how readiness, question guidance and their own future story bank connect.

FIRST VIEWPORT: The active Interviews exam state is visible in the switcher. Workspace navigation offers Overview, Practice, Stories and Academic with hash-linked active states; beneath it, the MMI/panel switch sits above a wide dark station card while a starter readiness plan remains a narrower right rail.

FORM: Direct brief, existing dashboard composition; no concept seed was required because the requested hero structure is explicit.

CONTENT TRUTH: MMI and panel views use generic, format-specific prompts, timings and interviewer cues. Navigation hash state and MMI/panel highlighting are local session UI only. The readiness plan is a starter checklist, story-bank items are prompts rather than saved examples, and the answer flow is guidance rather than recording, assessment, submission or feedback functionality.

FINISH: Make the separate Interviews exam state and workspace navigation legible, while documenting actual capabilities without representing placeholder practice content as learner progress or a live tutor workflow.
