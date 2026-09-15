# Whole-panel rubric workflow integration

**Target rubric:** `emeducate-panel-v1.1`
**Rubric source:** `../../output/panel-rubric-review/Panel_Interview_Marker_Instructions_v1.md` with `Panel_Domain_Anchors.md`
**Status:** implementation design based on the current Studocyte marking workflow.

## Decision

Use the new rubric only for a complete panel mock or another explicitly defined complete panel interview. Assess the ordered conversation once and release one whole-panel report.

Keep the existing response-level path for a candidate who submits one panel answer for one credit. Label that product “Panel response feedback” and give it response-scoped feedback; do not call its score a whole-interview rating. Keep the MMI path unchanged.

This distinction is necessary because the current full-mock submission groups ten `interview_attempts` for charging and display, while `processInterviewJob()` still transcribes, assesses and audits every attempt independently.

## Current code that must change

| Area | Current behaviour | Required behaviour |
|---|---|---|
| `src/lib/interviews/marking-rubric.ts` | Six short panel domains share the MMI prompt and use half-point scores | Separate whole-panel rubric, twelve domains and integer anchors |
| `src/lib/interviews/marking-validation.ts` | One feedback shape; overall score is compulsory; only applicable/not-applicable states; practice task required | Format-specific panel schema; nullable global rating; scored/not elicited/insufficient evidence states; closing paragraph; no practice task |
| `src/lib/interviews/provider.ts` | Sends MMI, Australian and panel domain maps together | Select one rubric and one schema from the assessment unit |
| `src/lib/interviews/jobs.ts` | One assessment and audit per `interview_attempt` | One ordered assessment and audit for the complete panel session |
| `supabase/migrations/0033_interview_video_marking.sql` | Markings and jobs are keyed to one attempt | Add a session-level marking and job record without changing historical attempt marks |
| Reviewer and student feedback components | Edit and display response-level `Feedback`, including “Next-practice task” | Display one whole-panel report with question coverage, domain states, global rating and the combined closing paragraph |

## Assessment units

### Individual panel response

- Trigger: one panel response is submitted separately.
- Inputs: that response's station brief, question sequence and transcript.
- Output: response-scoped strengths and improvements.
- Rating: domain ratings may be supplied where the evidence supports them; the whole-interview global rating must remain unavailable.
- Price and workflow: preserve the existing one-credit and attempt-level review path.

### Complete panel mock

- Trigger: a verified complete full-panel session is submitted.
- Inputs: all member attempts ordered by `station_snapshot.mock_session.index`, including each station snapshot, all questions, follow-ups, transcript and reliable timing metadata.
- Output: one `emeducate-panel-v1.1` report across the full sequence.
- Rating: one integer score for every scored domain and one nullable integer global rating.
- Price and workflow: preserve the current twelve-credit full-mock submission, but create one session-level assessment after transcription completes.

## Panel output contract

Use a separate schema rather than weakening the existing MMI schema.

```ts
type PanelEvidenceState = 'scored' | 'not_elicited' | 'insufficient_evidence'
type PanelCoverage = 'addressed' | 'partly_addressed' | 'not_addressed' | 'not_assessable'

type WholePanelFeedback = {
  rubric_version: 'emeducate-panel-v1.1'
  evidence_scope: {
    completeness: 'complete' | 'excerpt' | 'unknown'
    media_inspected: 'transcript'
    limitation: string
  }
  question_coverage: Array<{
    sequence: string
    topic: string
    coverage: PanelCoverage
    observation: string
  }>
  domains: Array<{
    key: PanelDomainKey
    label: string
    state: PanelEvidenceState
    score: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null
    evidence: string[]
    why: string
    improvement: string
  }>
  global_rating: {
    score: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null
    band: 'Very poor' | 'Weak' | 'Below expected' | 'Satisfactory' | 'Good' | 'Strong' | 'Outstanding' | null
    basis: string
  }
  strengths: string[]
  priorities: string[]
  closing_paragraph: string
  concerns: Array<{
    level: 'clarification_needed' | 'observed_concern' | 'serious_observed_concern'
    detail: string
    sequence: string
  }>
  reviewer_note: 'Reviewed and approved by an EMeducate reviewer.'
}
```

Validation rules:

- Accept integers only for whole-panel scores.
- Require `score=null` for `not_elicited` and `insufficient_evidence`.
- Require evidence for every scored domain.
- Permit `global_rating.score=null` when a primary task cannot be assessed.
- Require every question-coverage reference and concern reference to resolve to an actual supplied sequence.
- Require one concise `closing_paragraph`; reject `practice_task` in a panel report.
- Bound list sizes and text lengths as the current schemas do.
- Keep reviewer notes and audits private until a human approves the final public fields.

## Domain keys

Use the rubric's stable keys:

```ts
type PanelDomainKey =
  | 'communication_relevance'
  | 'motivation_medicine'
  | 'intellectual_curiosity'
  | 'personal_evidence'
  | 'reflection_learning'
  | 'reasoning_judgement'
  | 'responsiveness_consistency'
  | 'empathy'
  | 'teamwork'
  | 'resilience'
  | 'community_cultural_respect'
  | 'programme_alignment'
```

Do not map these to the current six panel keys. Store the rubric version with the report so historical feedback remains interpretable.

## Session-level processing

1. The existing full-mock submission verifies ownership, membership, media and the twelve-credit quote.
2. Each member recording is transcribed independently as it is now.
3. When the last transcript becomes ready, create one idempotent session-level `assess` job for the mock session.
4. Load all expected members under the same owner and session ID. Revalidate format, total, unique indices, ready transcripts and absence of deleted required media.
5. Construct an ordered input. Keep the station brief, interviewer questions and candidate transcript separate for every sequence. Never concatenate unlabelled transcript text.
6. Send only the whole-panel rubric and whole-panel JSON schema to the primary model.
7. Run a separate evidence audit against the complete ordered input and proposed assessment.
8. Place one draft in the session-level tutor queue. Show all ten recordings and transcript sequences to the reviewer.
9. Approve or reject the whole report atomically. Release one report to the full-panel library entry.
10. Preserve attempt-level transcripts and recordings for navigation, retention and evidence review.

The session job must be idempotent. Duplicate “last transcript ready” events must resolve to the same unique `(mock_session_id, job_type)` record.

## Storage migration

Add new tables rather than repurposing historical `interview_markings` rows:

- `interview_mock_markings`: `mock_session_id`, `user_id`, `format`, status, assessment/audit/draft JSON, provider/model fields, rubric version, reviewer fields, lock version and timestamps.
- `interview_mock_processing_jobs`: marking ID, `assess`/`audit`, status, attempts, lease fields and error fields.
- `interview_mock_marking_events`: marking ID, actor, event type, metadata and timestamp.

Keep these tables private to `service_role`; expose student feedback through an owner-checked server function or API that returns only approved public JSON. Add an admin-only optimistic-lock review function and an owner-safe refund path. Do not backfill or reinterpret prior response-level marks.

The migration should modify full-panel submission so it creates the session-level pending record while retaining attempt-level transcription. Full MMI submission continues its current per-station marking path.

## Provider prompt selection

Create three explicit modes:

```ts
type InterviewAssessmentMode = 'mmi_station' | 'panel_response' | 'panel_complete'
```

`structuredInterviewRequest()` should receive the mode rather than infer it from whichever domain maps happen to be present. For `panel_complete`, send:

- the compressed operational instructions from the main panel rubric;
- all 1–7 panel domain anchors;
- the declared interview assessment plan;
- the ordered, labelled interview sequences; and
- the whole-panel schema only.

Do not send provenance notes, Medify scripts, Frasers article text or validation answers to the marking model. Keep those resources for rubric review and offline tests.

## Reviewer workflow

Add a grouped panel-review page that provides:

- ordered navigation through all recordings and transcripts;
- question-coverage rows with direct links to the relevant response;
- tri-state domain controls and integer score inputs;
- nullable global rating with a visible reason;
- strengths and priority improvements;
- concern evidence kept visible to the reviewer; and
- one editable closing paragraph combining verdict, successful improvement and supported concerns.

Remove “Next-practice task” from complete-panel feedback. Approval should require confirmation that the reviewer inspected the complete available panel recording set, transcript mapping and decisive evidence. One approval releases the report once; it must not require ten separate approvals.

## Student workflow

On a full-panel library entry, show one “Whole-panel feedback” report above the list of responses. Keep each response available for recording and transcript review. Do not display the same combined report ten times.

Display:

1. evidence scope;
2. compact question coverage;
3. scored and relevant unscored domains;
4. nullable global rating and basis;
5. strengths and priorities; and
6. the concise closing paragraph.

Keep the existing statement that feedback is for practice and does not predict admission.

## Required tests

- Whole-panel schema accepts integer scores and a nullable global rating, and rejects half points and `practice_task`.
- All twelve domain keys validate; MMI keys cannot enter a panel report.
- Complete panel transcripts are loaded once, in canonical index order, with unique sequence identifiers.
- Missing a material primary response produces a null global rating without converting missing evidence into a low score.
- Individual panel submissions cannot be labelled or stored as a whole-panel assessment.
- Full-panel assessment is queued exactly once when all transcripts become ready.
- Cross-account session IDs, incomplete membership, duplicate indices and mixed formats are rejected.
- Assessment and audit outputs remain private until human approval.
- Approval releases one owner-visible session report and cannot be repeated or partially release member attempts.
- Refund and retry operations are idempotent.
- The seventeen cases in `output/panel-rubric-review/Panel_Validation_Pack.md` pass human-reviewed regression checks.
- Existing MMI, individual response, charging, recording, transcript, retention and RLS tests continue to pass.

## Rollout sequence

1. Add the panel schema, rubric module and unit tests without routing production traffic to it.
2. Add private session-level tables, functions and database tests.
3. Add session assessment/audit workers and provider fixtures.
4. Add grouped reviewer editing and atomic approval.
5. Add the owner-only student report view.
6. Run existing interview tests, security tests, lint and production build.
7. Evaluate de-identified full panels against two independent tutor ratings before enabling the route.
8. Enable complete-panel marking behind a server-side feature flag while retaining the response-level fallback.
9. Record `emeducate-panel-v1.1` with every new report and monitor evidence-audit and reviewer-edit rates.

Do not deploy a prompt-only shortcut. The current attempt-level assessment unit, half-point schema and mandatory practice task would materially change the rubric's intended decisions.
