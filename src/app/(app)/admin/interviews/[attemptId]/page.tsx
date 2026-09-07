import Link from 'next/link'
import { notFound } from 'next/navigation'
import { interviewReviewDetail } from '@/lib/interviews/marking-data'
import { InterviewMediaPlayer } from '@/components/interviews/media-player'
import { AdminInterviewReview } from '@/components/interviews/admin-review'
import { GroupedInterviewTranscript } from '@/components/interviews/grouped-transcript'
import { validateDraftFeedback } from '@/lib/interviews/marking-validation'
import type { QuestionEvent } from '@/lib/interviews/video-validation'
export const dynamic='force-dynamic'
export default async function Page({params}:{params:Promise<{attemptId:string}>}){
 const {attemptId}=await params,detail=await interviewReviewDetail(attemptId);if(!detail)notFound()
 const {attempt:a,marking:m}=detail
 let feedback=null;try{feedback=validateDraftFeedback(m.draft_feedback)}catch{}
 const snapshot=a.station_snapshot as {preparation?:string;questions?:string[];title?:string}
 return <main className="mx-auto max-w-5xl space-y-6 px-5 py-10"><Link href="/admin/interviews">← Interview queue</Link><h1 className="font-display text-3xl font-semibold">{a.station_title}</h1><p>{detail.student} · {a.format.toUpperCase()} · {a.duration_seconds} seconds · Submitted {a.submitted_for_marking_at?new Date(a.submitted_for_marking_at).toLocaleString('en-AU'):'—'}</p>
 {detail.mock&&<section className="rounded-2xl border border-border p-5"><h2 className="font-semibold">Full {a.format==='mmi'?'MMI':'panel'} · Response {detail.mock.index+1} of {detail.mock.total}</h2><p className="mt-2 text-sm text-muted">Review the submitted responses from this mock to give consistent feedback on strengths, weaknesses and next steps.</p><ul className="mt-3 space-y-2">{detail.responses.map(r=><li key={r.id}><Link className="text-sm font-semibold text-brand" aria-current={r.id===a.id?'page':undefined} href={`/admin/interviews/${r.id}`}>Response {r.index+1} · {r.station_title}</Link></li>)}</ul></section>}
 <section className="rounded-2xl bg-surface p-5"><h2 className="font-display text-xl font-semibold">Station at the time of recording</h2><p className="mt-3 whitespace-pre-wrap leading-7">{snapshot?.preparation??'Historical audio attempt; preparation text was not saved.'}</p><ol className="mt-3 list-decimal space-y-2 pl-5">{(snapshot?.questions??(Array.isArray(a.questions)?a.questions:[])).map((q,i)=><li key={i}>{String(q)}</li>)}</ol></section>
 <InterviewMediaPlayer attemptId={a.id} url={detail.mediaUrl} kind={a.media_kind} events={Array.isArray(a.question_events)?a.question_events as QuestionEvent[]:[]}/>
 {a.transcript&&a.transcription_status==='ready'?<GroupedInterviewTranscript key={a.id} attemptId={a.id} transcript={a.transcript} questions={a.questions} reviewer/>:<section><h2 className="font-display text-xl font-semibold">Transcript</h2><p className="mt-3 leading-7">No transcript available. You can review the recording and mark manually.</p></section>}
 <details className="rounded-2xl border p-4"><summary>Raw primary assessment (private)</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-sm">{JSON.stringify(m.ai_assessment,null,2)??'No AI assessment'}</pre></details><details open className="rounded-2xl border p-4"><summary>Evidence-audit warnings (private)</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-sm">{JSON.stringify(m.evidence_audit,null,2)??'Audit unavailable; independently verify all evidence.'}</pre></details>
 <AdminInterviewReview key={`${m.lock_version}:${m.updated_at}`} id={a.id} format={a.format} initialFeedback={feedback} initialVersion={m.lock_version} initialNotes={m.private_reviewer_notes??''} initialCorrections={m.transcript_correction_notes??''} terminal={['released','ungradable'].includes(m.status)}/>
 <details className="rounded-2xl border p-4"><summary>Processing and audit history</summary><ul className="mt-3 space-y-2 text-sm">{detail.jobs.map(j=><li key={j.id}>{j.job_type}: {j.status}, attempt {j.attempt_count}/{j.max_attempts}; {j.last_error_code??'no error'}; available {j.available_at}</li>)}{detail.events.map(e=><li key={e.id}>{e.created_at}: {e.event_type}</li>)}</ul></details>
 </main>
}
