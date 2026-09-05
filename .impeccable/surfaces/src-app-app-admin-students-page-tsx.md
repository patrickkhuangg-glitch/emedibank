---
version: 1
slug: "src-app-app-admin-students-page-tsx"
primary_target: "src/app/(app)/admin/students/page.tsx"
related_targets: ["src/app/(app)/admin/students/account-access-actions.tsx", "src/app/(app)/admin/students/invite-student-form.tsx", "src/components/site-nav.tsx"]
---

# Accounts workspace

Scope: an Operate-mode admin workspace for creating student and tutor accounts, scanning account state, restoring non-admin access and continuing into student package management. The route remains `/admin/students`, but the surface and admin navigation are named **Accounts** because the workspace serves learners and staff.

## Direction contract

THESIS: Make account administration feel like a legible roster with secure, row-level recovery actions—not a single undifferentiated user table.

OWN-WORLD: Inherit the established Culture Lab world. Account lists use Slide-White squircle panels on Culture Paper; the Create account rail uses Microscope-Field dark as the one visually concentrated task surface. Existing type, pill, border and soft-lift rules remain unchanged.

STORY: The administrator sees the student and staff totals, scans each group independently, restores access or opens package management from the relevant row, and creates a student or tutor without losing roster context.

FIRST VIEWPORT: The **Accounts** heading and separate Students / Tutors & admins counts establish the information model. Below, Students and Tutors & admins remain separate stacked panels in the wide column, while the visually distinct Create account rail sits beside them and stays sticky on desktop.

FORM: Code-led refinement of the existing admin workspace. The hierarchy is a wide two-panel roster plus a narrow dark creation rail; no new global visual pattern or design-system token is introduced.

CONTENT TRUTH: Student rows retain the package action. Student and tutor rows with an email may receive either a secure magic-login email or a password setup/reset email; the two actions lock together while either request is pending and report success or failure inline on that row. Admin rows do not expose those email actions: their login security is managed from the administrator's own Account page. Account status is derived from Supabase timestamps: no email confirmation is **Invite pending**; confirmed without a recorded sign-in is **Ready to sign in**; a recorded last sign-in is **Active**. Failure to load either authentication accounts or profiles must render an explicit retryable load-error state and must never appear as an empty roster.

RESPONSIVE: Keep the student and staff panels separate at every width. On large screens, the Create account rail is the narrower sticky column; on small screens, roster rows stack their identity and actions and the entire dark creation surface moves below the account panels without losing its visual distinction.

FINISH: Preserve the **Accounts** label in the admin navigation and page title, keep role and account-status pills visually distinct, and keep row-level feedback adjacent to the email action that produced it. Empty panels are valid only after a successful load confirms that group has no accounts.
