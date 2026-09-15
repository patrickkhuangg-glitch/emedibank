# Import validation

Completed locally on 9 September 2026.

- **56 automated tests passed**, with no failures or skips: reviewed-bank integration, panel bank, marketing counts, mock timing and question disclosure, practice progress, continue-practice state, free-trial entitlements/database behaviour, MMI v2 feedback validation, provider-contract tests and synthetic MMI QA.
- All 156 source numbers are accounted for exactly once: 132 accepted and 24 held. All imported scenarios, practical-response questions and practical guides are distinct strings. Every imported station has four different questions. These structural checks supplement the editorial review; they do not establish educational quality by themselves.
- The original 74 MMI station objects, panel bank and fixed trial catalogue match their pre-import content hashes. New IDs resolve in practice and individual MMI mocks. Sampled eight-station circuits include the new bank, retain distinct stations and preserve the existing timing.
- Every public metadata record matches the server-side catalogue and contains only the permitted label/count fields. Student practice payloads omit examiner guides. New stations remain outside trial selection and trial mock admission.
- **Full lint completed: zero errors, two unrelated warnings** in `past-session-review.tsx` (existing image usage) and `mock-runner.tsx` (effect dependency expression). These files were not changed by this import.
- **Production build passed using Next.js’s supported Webpack compiler** (`npm run build -- --webpack`), including TypeScript, static generation and build tracing. The default Turbopack build and its unrestricted retry failed locally because a CSS-processing worker could not bind a port (`Operation not permitted`). No compiler configuration was changed to work around this. The subsequent production release also passed its normal hosted build.
- The existing workspace-root/package-lock warning was reported by the build. It is unrelated to this content import.

No live student account, recording, production database or external AI marking service was used. Provider tests mock the model responses; synthetic QA cases are not human-validated examples. This task did not conduct a signed-in browser walkthrough or a fresh model assessment of all 132 stations.

Raw logs are in `artifacts/mmi-bank-audit/tests.log`, `lint.log`, `build.log`, `build-unrestricted.log` and `build-webpack.log`. The source checksum and accepted/held mapping are in [import-manifest.json](import-manifest.json).

## Release status

Published on 9 September 2026 as `dpl_DpHpnWfNpt6N1QdsbhH8S3GWmENA`. The production alias is verified and the normal hosted build passed. Only the four approved bank/catalogue runtime files changed against the previous live release. No migration or environment change was required.

Live checks confirmed the interview landing page returns HTTP 200 with the 206-station count, while practice and mock routes redirect unauthenticated visitors to login. No new scenario text appeared in those public responses. A signed-in student walkthrough was not performed in this release. Clinician/educator review remains appropriate before describing the bank as externally validated.

Release evidence: `artifacts/mmi-bank-audit/release.json`.
