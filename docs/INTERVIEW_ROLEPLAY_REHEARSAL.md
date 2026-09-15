# Two-part MMI rehearsal

Published on 9 September 2026, including the adaptive progress strip for all MMI practice and mock stations. Deployment: `dpl_44VysGtdrewo6fwwX4Y3HV8n7WFn`.

## Included

- Rural medical outreach conversation (`mmi-roleplay-rural-outreach`), under Rural health / realistic encouragement.
- Disclose damage to borrowed equipment (`mmi-roleplay-borrowed-camera`), under Integrity / accountability and repair.
- Two minutes of preparation, four minutes of solo spoken rehearsal, then four minutes of reflection. The reflection question appears automatically at the boundary. Manual question advance is disabled for these stations.
- One uninterrupted recording and one saved station. Existing MMI marking costs and full-circuit accounting are unchanged. Full mock selection can include these stations.
- Actor directions remain server-only reference material. They are removed from student payloads and are not passed off as an interaction that occurred.
- Station snapshots retain the response mode, two phase durations and explicit solo-rehearsal assessment limits. The existing MMI evidence source and tutor screen identify the absence of a responding actor. Assessors must not infer listening, adaptive interaction, agreement or another person's emotional response.
- Existing audio recording, transcription and transcript organisation remain in use. Question-change events capture the observed transition for review. Text grouping remains the existing semantic grouping process; this change does not manufacture timestamp-aligned transcript sections from plain text.
- The full MMI catalogue now has 208 stations. The existing 15-station free trial and panel bank are unchanged.

## MMI progress strip

All active MMI practice and mock runners use the same read-only progress strip. Standard stations show Prepare plus their actual question count (usually Q1–Q4); role-play stations show Prepare, Rehearse and Reflect. The current stage is highlighted and previous stages have a check mark. Standard MMI questions still share eight minutes; moving to another question does not reset the clock. Mock preparation responses include only the question count, not unreleased question wording. Panel behaviour is unchanged.

## Preview

Open `http://127.0.0.1:3218/prototypes/interviews/role-play?phase=roleplay`.

Choose either station and use Preparation, Role-play rehearsal or Reflection to preview the shared screen used by real practice and mock sessions. “Try the timer” runs the actual practice timer without recording, API writes or saved progress. Prototype routes remain unavailable on hosted production deployments.

## Validation

- 35 automated checks passed, covering both new stations, exact server timing boundaries, reflection-question withholding, full-circuit progression, trial exclusion, private actor briefs, snapshot assessment scope, legacy MMI content, panel questions, audio practice, free-trial behaviour and MMI provider contracts.
- Browser test ran the actual rehearsal timer through 2 + 4 + 4 minutes with an accelerated browser clock. The reflection prompt stayed hidden during rehearsal and the run reached Practice complete. An initial test selector expected a heading but the completion element uses a status role; the corrected check confirmed completion.
- Browser test ran the actual mock recorder component with synthetic recorder objects and intercepted local session responses. Both video and audio started once, remained active across reflection, and stopped once at the end. Exactly one local segment was saved, with question events at 0 and approximately 240 seconds and a duration of approximately 480 seconds. The synthetic segment was discarded afterwards. No real camera, microphone, upload or marking service was used. The temporary test route was removed.
- Both stations' reflection screens checked at 1440px and 390px: no horizontal overflow. Preview uses a single main landmark.
- Full lint: no errors, two unrelated existing warnings. Local production build passed with Next.js's supported Webpack compiler; the normal hosted production build also passed. The source manifest confirms only the 16 approved interview files changed.
- Standard MMI mobile browser check: Prepare, Q1, Q2 and Q4 highlights match the active question, five steps fit without horizontal overflow, and the shared eight-minute timer does not reset when advancing.
- Local development emitted a stale module error for an unrelated marketing prototype during testing; that work was not included in the release. The full production build passed.
- Live smoke checks confirmed the public catalogue and login-gated session routes. A signed-in production recording was not created. Release evidence is in `artifacts/mmi-progress-release/release.json`.

## Limits

This is solo rehearsal, not an AI or human role-play conversation. The displayed directions say so. The feedback guides have been minimally adapted to avoid claiming observed actor reactions. There was no fresh live transcription or model assessment in this task, and no production database migration is required. Tutor approval remains required before feedback release.

Raw validation logs and a preview screenshot are in `artifacts/interview-roleplay/`.
