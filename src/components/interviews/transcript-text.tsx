import { questionTranscriptSections, validTranscriptLayout } from '@/lib/interviews/transcript-sections'

export function InterviewTranscriptText({text,questions,layout}:{text:string;questions:string[];layout?:unknown}) {
 const grouping = questions.length === 1 ? {version:1,spans:[{start:0,end:text.length,questionIndex:0}]} : layout
 if (!validTranscriptLayout(grouping,text,questions)) return <p className="mt-5 whitespace-pre-wrap text-sm leading-7">{text}</p>
 return <div className="mt-5 space-y-4">
  {questionTranscriptSections(text,questions,grouping).map(section => <section key={section.questionIndex??'other'} className="rounded-2xl border border-border bg-background/50 p-5 sm:p-6">
   <p className="text-xs font-semibold uppercase tracking-wide text-brand">{section.questionIndex===null?'Additional response':`Question ${section.questionIndex+1}`}</p>
   <h4 className="mt-2 text-base font-semibold leading-7">{section.question}</h4>
   {section.passages.length ? <div className="mt-4 space-y-3">{section.passages.map((passage,index)=><p key={index} className="whitespace-pre-wrap text-sm leading-7">{passage}</p>)}</div> : <p className="mt-3 text-sm text-muted">No matching passage was identified for this question.</p>}
  </section>)}
  {questions.length>1&&<details className="border-t border-border pt-4"><summary className="cursor-pointer rounded-full px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-muted focus-visible:outline-2 focus-visible:outline-brand">View full transcript in recording order</summary><p className="mt-4 whitespace-pre-wrap text-sm leading-7">{text}</p></details>}
 </div>
}
