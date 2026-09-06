import Link from 'next/link'
import { InterviewSelfRating } from '@/components/interviews/self-rating'
import { InterviewLibraryRefresh } from '@/components/interviews/library-refresh'
import { MockMarkingActions } from '@/components/interviews/mock-marking-actions'
import { MARKING_DESCRIPTION,stationMarkingCredits,type MockMembership } from '@/lib/interviews/mock-marking'
import { reviewHref,type reviewLibrary,type ReviewEntry } from '@/lib/interviews/review-library'
import { InterviewMediaPlayer } from '@/components/interviews/media-player'
import { InterviewFeedback } from '@/components/interviews/feedback-view'
import { InterviewStudentActions } from '@/components/interviews/student-actions'
import type { Feedback } from '@/lib/interviews/marking-validation'
import type { QuestionEvent } from '@/lib/interviews/video-validation'
import { MockInterviewTabs } from '@/components/interviews/mock-tabs'
import { InterviewTranscript } from '@/components/interview-transcript'
import type { ExaminerFeedbackGuide } from '@/lib/interviews/stations'

export type InterviewAttempt = {
  selfRating?: number | null
  activityTracked?: boolean
  mock?: MockMembership | null
  kind: 'video' | 'audio'
  stationId: string
  events: QuestionEvent[]
  markingLabel: string
  expired: boolean
  eligible: boolean
  feedback: Feedback | null
  id: string
  format: 'mmi' | 'panel'
  stationTitle: string
  questions: unknown
  durationSeconds: number
  createdAt: string
  audioUrl: string | null
  examinerFeedback?: ExaminerFeedbackGuide
  transcript: string | null
  transcriptionStatus: 'not_requested' | 'processing' | 'ready' | 'failed'
}


const control='min-h-11 rounded-full border border-border bg-surface px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const stateLabels={saved:'Ready to submit',pending:'In marking',feedback:'Feedback ready',unavailable:'Unavailable'}
export function InterviewAttemptReview({library,query,selected,selectedEntry,responseCount,credits}:{library:ReturnType<typeof reviewLibrary>;query:Record<string,string|undefined>;selected:InterviewAttempt|null;selectedEntry?:ReviewEntry;responseCount:number;credits:number}){
 return <main className="min-h-screen bg-background pb-16 text-foreground"><div className="mx-auto max-w-[1240px] px-5 pt-10 sm:px-8 sm:pt-14">
  <header><h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Mock Interviews</h1></header>
  <MockInterviewTabs active="review" />
  {!selected&&<InterviewLibraryRefresh key={JSON.stringify(query)}/>}
  <section data-interview-tour="recording-library">
  <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold">Recordings &amp; feedback</h2><p className="text-sm text-muted"><strong className="text-foreground tabular-nums">{credits}</strong> Interview marking credits</p></div>
  {selected?<>
   <Link href={reviewHref(query)} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand">← All recordings</Link>
   {selectedEntry?.full&&<div className="mt-4"><MockMarkingActions key={selectedEntry.id} sessionId={selectedEntry.id}/></div>}
   <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
    <article className="min-w-0 rounded-2xl bg-surface p-5 sm:p-7">
     <h3 className="font-display text-2xl font-semibold">{selected.stationTitle}</h3>
     <p className="mt-2 text-sm text-muted">{selected.format==='mmi'?'MMI station':'Panel response'} · {formatAttemptDate(selected.createdAt)} · {formatDuration(selected.durationSeconds)}</p>
     <p role="status" className="mt-3 text-sm font-semibold">{selected.markingLabel}</p>
     {selected.feedback&&<details open className="mt-5"><summary className="cursor-pointer py-2 font-semibold">Your feedback report</summary><InterviewFeedback feedback={selected.feedback}/></details>}
     {selected.expired?<p className="mt-5 text-sm text-muted">This recording has expired. Available transcripts and feedback are kept below.</p>:<InterviewMediaPlayer key={selected.id} attemptId={selected.id} url={selected.audioUrl} kind={selected.kind} events={selected.events}/>}
     <details className="border-t border-border py-3"><summary className="cursor-pointer py-2 text-sm font-semibold">Transcript</summary><InterviewTranscript key={selected.id} attemptId={selected.id} initialStatus={selected.transcriptionStatus} initialTranscript={selected.transcript}/></details>
     {selected.examinerFeedback&&<details className="border-t border-border py-3"><summary className="cursor-pointer py-2 text-sm font-semibold">Self-review guide</summary><ExaminerGuide guide={selected.examinerFeedback}/></details>}
     {selected.activityTracked && <InterviewSelfRating key={selected.id} activityId={selected.id} initialRating={selected.selfRating} />}
     <InterviewStudentActions key={selected.id} id={selected.id} format={selected.format} eligible={false} credits={credits} deleteOnly backHref={reviewHref(query)}/>
    </article>
    <aside className={`space-y-6 ${selectedEntry?.full?'':'order-first lg:order-last'}`}>
     {!selectedEntry?.full&&<section className="rounded-2xl bg-surface p-5"><h3 className="font-display text-xl font-semibold">Get your response marked</h3><p className="mt-3 text-sm leading-6 text-muted">{MARKING_DESCRIPTION}</p><InterviewStudentActions key={selected.id} id={selected.id} format={selected.format} eligible={selected.eligible} credits={credits}/></section>}
     {selectedEntry?.full&&<section><h3 className="font-semibold">Responses in this mock</h3><ol className="mt-3 divide-y divide-border">{selectedEntry.responses.map(r=><li key={r.id}><Link prefetch={false} href={reviewHref(query,{attempt:r.id})} aria-current={r.id===selected.id?'page':undefined} className={`block rounded-xl px-3 py-3 text-sm hover:bg-surface ${r.id===selected.id?'bg-brand-muted font-semibold text-brand':''}`}><span>{(r.mock?.index??0)+1}. {r.title}</span><span className="mt-1 block text-xs text-muted">{stateLabels[r.status]}</span></Link></li>)}</ol></section>}
     {selectedEntry?.full&&selected.eligible&&<details><summary className="cursor-pointer py-2 text-sm font-semibold">Mark only this response</summary><p className="mt-2 text-sm text-muted">{stationMarkingCredits(selected.format)} {selected.format==='mmi'?'credits':'credit'} for this response. This counts toward the full mock’s 12-credit total.</p><InterviewStudentActions id={selected.id} format={selected.format} eligible credits={credits}/></details>}
    </aside>
   </div>
  </>:<>
   <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Review a recording, submit it for marking, or open your feedback. Full mocks are kept together.</p>
   <p className="mt-3 text-sm text-muted">MMI station <strong className="text-foreground">2 credits</strong> · Panel response <strong className="text-foreground">1 credit</strong> · Either full mock <strong className="text-foreground">12 credits</strong></p>
   {responseCount===0?<section className="mt-8 rounded-2xl bg-surface p-7"><h3 className="font-display text-xl font-semibold">Your recordings will appear here</h3><p className="mt-3 text-sm text-muted">Complete and save a mock interview to review it or request marking.</p><Link className="mt-5 inline-flex rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground" href="/interviews/mock-interviews">Start a mock interview</Link></section>:<>
    <form action="/interviews/mock-interviews/review" className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]" role="search">
     <label className="min-w-0"><span className="sr-only">Search recordings</span><input name="q" defaultValue={query.q} placeholder="Search stations or questions" maxLength={150} className={`${control} w-full`}/></label>
     <label><span className="sr-only">Interview format</span><select name="format" defaultValue={query.format??''} className={`${control} w-full`}><option value="">All formats</option><option value="mmi">MMI</option><option value="panel">Panel</option></select></label>
     <label><span className="sr-only">Marking status</span><select name="status" defaultValue={query.status??''} className={`${control} w-full`}><option value="">All statuses</option><option value="saved">Ready to submit</option><option value="pending">In marking</option><option value="feedback">Feedback ready</option><option value="unavailable">Unavailable</option></select></label>
     <button className={`${control} font-semibold hover:bg-surface-muted`}>Filter</button>
    </form>
    <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm text-muted"><p>{library.count} {library.count===1?'session':'sessions'} · {responseCount} saved {responseCount===1?'response':'responses'}</p>{(query.q||query.status||query.format)&&<Link href={reviewHref({})} className="font-semibold text-brand">Clear filters</Link>}</div>
    <section className="mt-3 overflow-hidden rounded-2xl bg-surface" aria-label="Saved interview attempts">
     {library.items.length===0?<p className="p-7 text-sm text-muted">No recordings match these filters. Try another search or clear the filters.</p>:<ul className="divide-y divide-border">{library.items.map(entry=>{
      const feedback=entry.responses.filter(r=>r.status==='feedback').length,pending=entry.responses.filter(r=>r.status==='pending').length,ready=entry.responses.filter(r=>r.eligible).length
      const target=entry.responses.find(r=>query.status?r.status===query.status:feedback?r.status==='feedback':r.eligible)??entry.responses[0]
      return <li key={entry.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
       <div className="min-w-0"><Link prefetch={false} href={reviewHref(query,{attempt:target.id})} className="font-semibold hover:text-brand hover:underline">{entry.title}</Link><p className="mt-1 text-sm text-muted">{formatAttemptDate(entry.createdAt)} · {entry.full?`${entry.responses.length} of ${entry.format==='mmi'?8:10} responses`:entry.format==='mmi'?'MMI station':'Panel response'}</p><p className="mt-2 text-xs font-semibold text-muted">{[feedback?`${feedback} feedback ready`:null,pending?`${pending} in marking`:null,ready?entry.full?`${ready} ready to submit`:'Ready to submit':null,!feedback&&!pending&&!ready?'Recording unavailable':null].filter(Boolean).join(' · ')}</p></div>
       <Link prefetch={false} href={reviewHref(query,{attempt:target.id})} className={`${control} shrink-0 text-center font-semibold ${ready?'border-brand text-brand hover:bg-brand-muted':'hover:bg-surface-muted'}`}>{feedback?'View feedback':ready?'Review & submit':'View recording'}</Link>
      </li>
     })}</ul>}
    </section>
    {library.pages>1&&<nav aria-label="Recordings pages" className="mt-5 flex items-center justify-between gap-3">{library.page>1?<Link className={control} href={reviewHref(query,{page:String(library.page-1)})}>Previous</Link>:<span/>}<p className="text-sm text-muted">Page {library.page} of {library.pages}</p>{library.page<library.pages?<Link className={control} href={reviewHref(query,{page:String(library.page+1)})}>Next</Link>:<span/>}</nav>}
   </>}
  </>}
 </section>
 </div></main>
}

function ExaminerGuide({ guide }: { guide: ExaminerFeedbackGuide }) {
  return (
    <section className="mt-7 border-t border-border pt-6">
      <h3 className="font-display text-xl font-semibold tracking-tight">Examiner feedback guide</h3>
      <p className="mt-2 text-sm leading-6 text-muted">Use this after listening back to identify what to keep and what to improve. It is a self-review guide, not an automated score.</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div><h4 className="text-sm font-semibold">A strong response should show</h4><ul className="mt-3 space-y-3">{guide.strongResponse.map((item) => <li key={item.title} className="text-sm leading-6 text-muted"><span className="font-semibold text-foreground">{item.title}: </span>{item.description}</li>)}</ul></div>
        <div><h4 className="text-sm font-semibold">Common weaknesses</h4><ul className="mt-3 space-y-3">{guide.commonWeaknesses.map((weakness) => <li key={weakness} className="flex gap-2 text-sm leading-6 text-muted"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{weakness}</li>)}</ul></div>
      </div>
    </section>
  )
}

function formatAttemptDate(date: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date))
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
