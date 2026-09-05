---
version: 1
slug: "src-app-app-admin-students-page-tsx"
primary_target: "src/app/(app)/admin/students/page.tsx"
related_targets: ["src/app/(app)/admin/students/account-access-actions.tsx", "src/app/(app)/admin/students/invite-student-form.tsx", "src/app/(app)/admin/students/student-exam-access.tsx", "src/components/site-nav.tsx"]
---

# Accounts workspace

Scope: an Operate-mode admin workspace for creating student and tutor accounts, scanning account state, restoring non-admin access and continuing into student package management. The route remains `/admin/students`, but the surface and admin navigation are named **Accounts** because the workspace serves learners and staff.

## Direction contract

THESIS: Make account administration feel like a legible roster with secure, row-level recovery actions—not a single undifferentiated user table.

OWN-WORLD: Inherit the established Culture Lab world. Account lists use Slide-White squircle panels on Culture Paper; the Create account rail uses Microscope-Field dark as the one visually concentrated task surface. Existing type, pill, border and soft-lift rules remain unchanged.

STORY: The administrator sees the student and staff totals, scans each group independently, restores login or Studocyte exam access, opens package management from the relevant student row, and creates a student or tutor without losing roster context.

FIRST VIEWPORT: The **Accounts** heading and separate Students / Tutors & admins counts establish the information model. Below, Students and Tutors & admins remain separate stacked panels in the wide column, while the visually distinct Create account rail sits beside them and stays sticky on desktop.

FORM: Code-led refinement of the existing admin workspace. The hierarchy is a wide two-panel roster plus a narrow dark creation rail; no new global visual pattern or design-system token is introduced.

CONTENT TRUTH: Student rows retain the package action and a compact **Manage Studocyte access** disclosure that is collapsed by default. When opened, it lists every active exam, reports the current paid, manual, combined, expired or no-full-access state, and shows an active-access count that refreshes after a mutation. Administrators may grant, update or remove only manual `comp` entitlements, optionally ending at the close of a Sydney-local date. Subscription and bundle access is visible but never mutated here; removing manual access must preserve any paid access for the same exam. Success and error feedback stays local to the affected exam control.

Student and tutor rows with an email may receive either a secure magic-login email or a password setup/reset email; the two actions lock together while either request is pending and report success or failure inline on that row. Admin rows do not expose those email actions: their login security is managed from the administrator's own Account page. Account status is derived from Supabase timestamps: no email confirmation is **Invite pending**; confirmed without a recorded sign-in is **Ready to sign in**; a recorded last sign-in is **Active**. Failure to load authentication accounts, profiles, active exams or entitlements must render an explicit retryable load-error state and must never appear as an empty roster or an empty access list.

RESPONSIVE: Keep the student and staff panels separate at every width. On large screens, the Create account rail is the narrower sticky column; on small screens, roster rows stack their identity and actions and the entire dark creation surface moves below the account panels without losing its visual distinction. The access disclosure remains collapsed and row-contained until deliberately opened, with each exam's label, status, date and actions wrapping without merging exams into one bulk control.

FINISH: Preserve the **Accounts** label in the admin navigation and page title, keep role and account-status pills visually distinct, and keep feedback adjacent to the email or exam action that produced it. Paid and manual access must remain unambiguous before and after every mutation. Empty panels or access lists are valid only after a successful load confirms there is nothing to show.
