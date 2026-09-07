# Practice completion and button feedback

Prepared 7 September 2026 on top of panel bank release `da06954`.

- Completed or ended practice now offers Back to Practice, Interview dashboard, Practise again and Record a mock interview together in a clearly labelled section.
- The mock link retains the selected panel question. The redundant bottom return link is hidden on the completion screen.
- Shared rounded purple controls provide hover fill/halo, a short pointer-press effect, visible keyboard focus, reduced-motion support, and disabled feedback. Applied to practice recording/save/retry/download/navigation actions, format selection, self-ratings and the Add note button.
- Existing capture-phase navigation and unload warnings for unsaved audio remain in place. Audio, transcription, saving and marking behavior are unchanged.

Validation: all 52 interview tests passed. Full lint passed with zero errors and one pre-existing image warning. The full Next.js production build and TypeScript checks passed with Webpack. An unsigned local browser session completed a real timed unrecorded response using the existing fallback; the resulting completion links and purple hover halo were visually checked. At a 390px viewport the main buttons fit at 302px wide and 46px high, with secondary actions wrapping. The dashboard link reached the expected sign-in redirect for `/interviews`. No microphone, saved student data or production changes were needed for the check.

The five scoped code files were copied back only after checking their workspace versions matched the published baseline. This release is prepared locally, not published. No migration or environment change is required.
