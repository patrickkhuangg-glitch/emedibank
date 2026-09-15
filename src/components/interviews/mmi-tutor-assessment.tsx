import type { ReactNode } from 'react'
import type { MMIFeedback, MMIAudit } from '@/lib/interviews/mmi-feedback'
import type { MMISource } from '@/lib/interviews/mmi-evidence'
import { mmiBand } from '@/lib/interviews/mmi-feedback'
import { mmiClosing } from '@/lib/interviews/mmi-summary'
import { MMIStationFeedback } from './mmi-feedback-view'

/** The immutable model assessment is shown separately from the tutor's editable draft. */
export function MMITutorAssessment({source,assessment,audit,recording,illustrative=false}:{source:MMISource;assessment:MMIFeedback|null;audit:MMIAudit|null;recording?:ReactNode;illustrative?:boolean}){
 const turns=source.references.filter(r=>r.speaker!=='prompt')
 const scenario=source.references.find(r=>r.speaker==='prompt'&&r.id==='P1')
 const questions=source.references.filter(r=>r.speaker==='prompt'&&r.id!=='P1')
 const speakerLabels={candidate:'Candidate response',interviewer:'Interviewer question / follow-up',actor:'Actor dialogue',recording_note:'Recording note',unknown:'Speaker not identified',prompt:'Station prompt'}

 return <section id="mmi-review-source" tabIndex={-1} aria-label="Tutor assessment workspace" className="space-y-5">
  <div><h2 className="font-display text-2xl font-semibold">Review the station</h2><p className="mt-2 text-sm text-muted">Tutor reference · check the recording and transcript against the suggested marks. Write the student’s report in “Prepare student feedback” below.</p></div>
  <section aria-label="Station scenario and questions" className="overflow-hidden rounded-2xl border border-border bg-surface">
   <div className="border-b border-border bg-surface-muted px-5 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Given to the candidate</p></div>
   <div className="grid gap-6 p-5 lg:grid-cols-2">
    <section aria-label="Station scenario"><h3 className="font-semibold">Station scenario / preparation</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{scenario?.text??'No scenario or preparation text was saved with this recording.'}</p></section>
    <section aria-label="Station questions"><h3 className="font-semibold">Questions asked</h3><p className="mt-1 text-xs text-muted">Saved question wording · any spoken follow-ups are labelled in the transcript below.</p>{questions.length?<ol className="mt-3 space-y-4">{questions.map((q,i)=><li key={q.id} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand">{i+1}</span><p className="whitespace-pre-wrap text-sm leading-7">{q.text}</p></li>)}</ol>:<p className="mt-3 text-sm text-muted">No question text was saved. Use any clearly labelled interviewer questions below; do not infer missing instructions from the candidate’s answer.</p>}</section>
   </div>
  </section>
  {source.limitations.some(limit=>limit.includes('solo role-play rehearsal'))&&<p className="rounded-2xl border border-border bg-surface-muted p-4 text-sm leading-6"><strong>Solo role-play rehearsal.</strong> No actor responded. Review the candidate’s wording and reflection without assuming a conversation, agreement or change in the other person’s feelings.</p>}
  {recording}
  <div className="grid items-start gap-6 lg:grid-cols-2">
   <section className="rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-6" aria-label="Station transcript"><h3 className="font-semibold">Candidate response &amp; dialogue</h3><p className="mt-1 text-xs text-muted">Verbatim transcript · the candidate’s words are highlighted in purple. Other speakers and recording notes are labelled separately.</p><div className="mt-4 space-y-4 lg:max-h-[75vh] lg:overflow-y-auto lg:pr-3">{turns.length?turns.map(r=><div key={r.id} id={`mmi-source-${r.id}`} className={`scroll-mt-6 rounded-xl p-4 ${r.speaker==='candidate'?'border-l-4 border-brand bg-brand-muted':'border border-border bg-surface-muted'}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className={`text-xs font-semibold ${r.speaker==='candidate'?'text-brand':'text-muted'}`}>{speakerLabels[r.speaker]}</p><p className="text-xs text-muted">{r.id}{r.timestamp?` · ${r.timestamp}`:''}</p></div><p className="mt-1 whitespace-pre-wrap text-sm leading-7">{r.text}</p></div>):<p className="text-sm text-muted">No transcript is available. Review the recording and add checked evidence in the detailed marking editor.</p>}</div></section>
   <section className="min-w-0 space-y-5" aria-label="AI station assessment"><div><h3 className="font-semibold">{illustrative?'Illustrative assessment · Codex':'AI assessment'}</h3><p className="mt-1 text-xs text-muted">{illustrative?'Authored for this example · API assessment and audit not run · not tutor-approved':'Original suggestion · not released to the student'}</p></div>{assessment?<><MMIStationFeedback feedback={assessment}/><div className="rounded-2xl bg-brand-muted p-5"><h3 className="font-semibold">Overall verdict · {assessment.global.score===null?'Unscored':`${assessment.global.score}/7 · ${mmiBand(assessment.global.score)}`}</h3><p className="mt-2 text-sm leading-7">{assessment.global.reason}</p><p className="mt-3 text-sm leading-7">{mmiClosing(assessment)}</p></div></>:<p className="rounded-2xl border border-border p-5 text-sm">The AI assessment is not available. You can still mark this recording manually.</p>}
   <details id="mmi-audit-checks" tabIndex={-1} className={`scroll-mt-6 rounded-2xl border p-5 ${!audit||audit.warnings.length?'border-amber-300 bg-amber-50':'border-border'}`} open={!audit||!!audit.warnings.length}><summary className="cursor-pointer font-semibold">Evidence checks{audit?.warnings.length?` · ${audit.warnings.length} to review`:''}</summary>{audit?<>{audit.warnings.length?<ul className="mt-3 space-y-3">{audit.warnings.map((w,i)=><li key={i} className="text-sm leading-6"><strong>{w.category}:</strong> {w.detail}{w.references.length>0&&<span className="text-muted"> ({w.references.join(', ')})</span>}</li>)}</ul>:<p className="mt-3 text-sm">No issues flagged by the automated audit. Check the evidence yourself before approval.</p>}</>:<p className="mt-3 text-sm">Audit unavailable. Independently check quotations, scores and supported concerns.</p>}</details>
   </section>
  </div>
 </section>
}
