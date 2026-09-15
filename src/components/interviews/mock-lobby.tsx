'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MockInterviewTabs } from './mock-tabs'
import { InterviewLibraryRefresh } from './library-refresh'
import { listDrafts, type MockDraft } from '@/lib/interviews/mock-local'
import type { MockMode, MockOption } from '@/lib/interviews/mock-types'
import type { InterviewFormat } from '@/lib/interviews/stations'
import {practiceButton,practiceButtonSecondary} from './practice-buttons'
import {InterviewWorkspaceMotion} from './workspace-motion'
export function MockInterviewLobby({options,enabled,userId,credits,trial=false}:{options:MockOption[];enabled:boolean;userId:string;credits:number|null;trial?:boolean}) {
 const [format,setFormat]=useState<InterviewFormat>('mmi'),[mode,setMode]=useState<MockMode>('individual'),[selected,setSelected]=useState(''),[drafts,setDrafts]=useState<MockDraft[]>([])
 const choices=options.filter(o=>o.format===format),selection=choices.find(o=>o.id===selected)??choices[0]
 useEffect(()=>{let alive=true;void listDrafts(userId).then(value=>{if(alive)setDrafts(value)}).catch(()=>{});return()=>{alive=false}},[userId])
 const mmi=format==='mmi',full=!mmi||mode==='full'
 const title=full?(mmi?(trial?'Two-station trial MMI':'Eight-station MMI'):'20-minute full panel interview'):(mmi?'Individual MMI station':'Individual panel question')
 return <InterviewWorkspaceMotion><main className="page-frame page-shell space-y-7">
  <header data-interview-scroll-reveal><h1 className="page-title">Mock Interviews</h1><p className="mt-4 max-w-2xl leading-7 text-muted">Practise an MMI station or take a full MMI or panel interview.</p></header>
  <MockInterviewTabs active="stations"/>
  <section data-interview-scroll-reveal data-interview-parallax-section aria-labelledby="mock-credit-heading">
   <h2 id="mock-credit-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">Interview marking credits</h2>
   <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted">2 credits per MMI station or 12 per full MMI or panel mock.</p>
    <span role="status" data-interview-parallax="8" className="w-fit shrink-0 rounded-full bg-brand-muted px-3 py-1 text-sm font-semibold tabular-nums text-brand">{credits===null?'Balance unavailable':`${credits} credits available`}</span>
   </div>
   <InterviewLibraryRefresh message="Updating your marking credits…"/>
  </section>
  {drafts.length>0&&<section className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-semibold">Unsaved recordings</h2><p className="mt-1 text-sm text-muted">Review and save responses from a previous mock.</p><ul className="mt-3 space-y-2">{drafts.map(d=><li key={d.id}><Link className="text-sm font-semibold text-brand" href={`/interviews/mock-interviews/session?draft=${d.id}`}>{d.format==='mmi'?'MMI':'Panel'} · {new Date(d.startedAt).toLocaleDateString()} · {d.segments.filter(s=>!s.saved).length} unsaved responses →</Link></li>)}</ul></section>}
  {!enabled&&<p role="status" className="rounded-2xl border border-border p-5">New mock recordings are currently unavailable. Saved recordings remain accessible.</p>}
  <section data-interview-tour="mock-selection" data-interview-scroll-reveal className="space-y-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
   <fieldset><legend className="mb-3 font-semibold">Interview format</legend><div className="flex flex-wrap gap-3">{(['mmi','panel'] as const).map(f=><button type="button" data-haptic="soft" key={f} aria-pressed={format===f} onClick={()=>{setFormat(f);setSelected('')}} className={`${practiceButton} border px-5 py-3 ${format===f?'border-brand bg-brand text-brand-foreground':'border-border bg-surface text-foreground hover:border-brand hover:bg-brand-muted hover:text-brand'}`}>{f==='mmi'?'MMI':'Panel'}</button>)}</div></fieldset>
   {mmi?<fieldset><legend className="mb-3 font-semibold">Session length</legend><div className="grid gap-3 sm:grid-cols-2">{(['individual','full'] as const).map(m=><button type="button" data-haptic="soft" key={m} aria-pressed={mode===m} onClick={()=>setMode(m)} className={`rounded-2xl border p-5 text-left transition-[transform,border-color,background-color,box-shadow] duration-150 ease-[cubic-bezier(.23,1,.32,1)] motion-safe:active:scale-[.985] ${mode===m?'border-brand bg-brand-muted shadow-[0_0_0_3px_var(--brand-muted)]':'border-border hover:border-brand/50 hover:bg-brand-muted/30'}`}><span className="block font-semibold">{m==='individual'?'One station':(trial?'Trial MMI · 2 stations':'Full MMI · 8 stations')}</span><span className="mt-2 block text-sm text-muted">{m==='individual'?'2 minutes to read, then 8 minutes to respond':(trial?'20 minutes · automatic station change':'80 minutes · automatic station changes')}</span></button>)}</div></fieldset>:<div><h2 className="font-semibold">Full panel · 20 minutes</h2><p className="mt-2 text-sm text-muted">10 questions · 2 minutes per question</p></div>}
   {!full&&<div><label className="mb-2 block font-semibold" htmlFor="mock-selection">{mmi?'Select a station':'Select a question by topic and number'}</label><select id="mock-selection" data-haptic="soft" className="w-full rounded-xl border border-border bg-background px-4 py-3" value={selection?.id??''} onChange={e=>setSelected(e.target.value)}>{choices.map(o=><option key={o.id} value={o.id}>{o.label} · {o.category}</option>)}</select>{selection?<div aria-live="polite" className="mt-3 rounded-2xl border border-brand/20 bg-brand-muted/35 p-4"><p className="text-[.68rem] font-bold uppercase tracking-[.12em] text-brand">Station theme</p><p className="mt-1 font-semibold text-foreground">{selection.label}</p><p className="mt-1 text-sm text-muted">A timed scenario exploring {selection.category.toLowerCase()}.</p></div>:null}<p className="mt-2 text-sm text-muted">The full scenario and questions appear when the timer starts.</p></div>}
  </section>
  <section data-interview-tour="mock-start" data-interview-scroll-reveal className="rounded-3xl bg-ink p-6 text-ink-foreground sm:p-8"><h2 className="font-display text-3xl font-semibold">{title}</h2><p className="mt-4 max-w-2xl leading-7">{full?(mmi?(trial?'Two stations with two minutes to read and eight minutes to respond at each.':'Eight stations with two minutes to read and eight minutes to respond at each.'):(trial?'Ten questions across ten themes, starting with Motivation for Medicine.':'Ten questions across five themes, starting with Motivation for Medicine.')):'Take on your chosen station under timed conditions.'}</p><p className="mt-4 text-sm">Record and review for free. Optional tutor marking: {full&&!(trial&&mmi)?'12 credits for the full mock':format==='mmi'?'2 credits per station':'1 credit'}.</p>{enabled&&(full||selection)&&<Link prefetch={false} data-haptic="confirm" className={`${practiceButtonSecondary} mt-7`} href={`/interviews/mock-interviews/session?format=${format}&mode=${full?'full':'individual'}${full?'':`&selection=${encodeURIComponent(selection!.id)}`}`}>Continue →</Link>}</section>
  <p className="text-sm leading-6 text-muted">These are the practice timings used here. Follow your university’s instructions for its interview format and timing.</p>
 </main></InterviewWorkspaceMotion>
}
