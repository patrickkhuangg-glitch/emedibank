---
version: 1
slug: "src-app-app-study-plan-page-tsx"
primary_target: "src/app/(app)/study-plan/page.tsx"
related_targets:
  - "src/components/study-plan-controls.tsx"
---

# Study Plan workspace

Scope: an Operate-mode, account-wide preparation workspace for students with one or more unlocked exams. It brings together exam dates, scheduled tutoring, active package inclusions and a personal checklist without turning any one exam into the organising frame.

## Direction contract

THESIS: Make the learner's preparation legible as one cross-exam chronology, then give them a practical workspace for maintaining the dates and next actions that drive it.

OWN-WORLD: Inherit the established Culture Lab world. Use the Microscope-Field dark as a concentrated chronology surface above Slide-White planning cards; Crystal Violet remains action and Culture Mint remains life/progress.

STORY: The learner first understands what is coming across their account, then manages exam dates, upcoming lessons and immediate tasks while keeping tutoring-package availability in view.

FIRST VIEWPORT: A single dark preparation timeline is the dominant object beneath the page introduction and unlocked-exam context. Below it, the planning workspace is asymmetric: exam dates, future lessons and the checklist occupy the wide working column, while active package details form a narrower sticky rail on large screens.

FORM: `request-pinned-account-timeline` — a horizontally ordered, account-wide timeline pinned above an asymmetric planning workspace. The supplied sketch sets the information hierarchy; the existing dashboard sets the craft bar.

CONTENT TRUTH: Timeline events are only upcoming scheduled lessons and saved exam/interview dates, sorted chronologically and capped to the next six after Today. Written exams accept one date; Interviews accepts multiple separately labelled dates. Exam controls reflect currently unlocked active exams. The checklist is learner-maintained and may be account-wide or exam-scoped. Package progress reports active tutoring-package inclusions and stays useful but secondary; the planning tools continue to work without an active package.

RESPONSIVE: Preserve the chronology rather than collapsing it into cards. On narrow screens it remains a horizontal, mandatory-snap track with a visible “Swipe to see later dates” continuation cue; the planning columns stack into one reading order. On large screens the package rail is sticky and subordinate to the wider planning column.

FINISH: Keep the dark chronology visually singular, distinguish lessons from exam days without adding another accent, and make every empty state point to the control that resolves it. Date, checklist and package states must remain plainly labelled and usable without relying on animation or colour alone.
