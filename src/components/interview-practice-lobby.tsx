'use client'

import Link from 'next/link'
import { practiceButtonPrimary, practiceButtonSecondary } from '@/components/interviews/practice-buttons'
import { useMemo, useState } from 'react'
import { MockInterviewTabs } from '@/components/interviews/mock-tabs'
import { INTERVIEW_STATIONS, type InterviewFormat } from '@/lib/interviews/stations'
import { getInterviewQuestions, getInterviewTiming } from '@/lib/interviews/timing'

export function InterviewPracticeLobby({ mode = 'practice', recordingEnabled = false }: { mode?: 'practice' | 'mock'; recordingEnabled?: boolean }) {
  const isMock = mode === 'mock'
  const basePath = isMock ? '/interviews/mock-interviews' : '/interviews/practice'
  const initialFormat: InterviewFormat = INTERVIEW_STATIONS.some((station) => station.format === 'mmi') ? 'mmi' : 'panel'
  const [format, setFormat] = useState<InterviewFormat>(initialFormat)
  const stations = useMemo(() => INTERVIEW_STATIONS.filter((station) => station.format === format), [format])
  const [stationId, setStationId] = useState(() => INTERVIEW_STATIONS.find((station) => station.format === initialFormat)?.id ?? '')
  const station = stations.find((item) => item.id === stationId) ?? stations[0]
  const [questionIndex, setQuestionIndex] = useState(0)
  const timing = getInterviewTiming(format)
  const previewQuestions = station ? getInterviewQuestions(station, questionIndex) : []

  function switchFormat(next: InterviewFormat) {
    setFormat(next)
    setQuestionIndex(0)
    setStationId(INTERVIEW_STATIONS.find((station) => station.format === next)?.id ?? '')
  }

  return <main className="min-h-screen bg-background pb-16 text-foreground"><div className="mx-auto max-w-[1240px] px-5 pt-10 sm:px-8 sm:pt-14">
    <header className="max-w-3xl"><h1 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl">{isMock ? 'Mock Interviews' : 'Practise interview answers with purpose.'}</h1><p className="mt-4 text-base leading-7 text-muted sm:text-lg">{isMock ? 'Record an MMI station or panel response, review your performance, and choose whether to submit it for marking.' : 'Prepare your ideas, record an MMI or panel response with your microphone, then listen back and review your transcript. You can also rehearse without recording.'}</p></header>
    {isMock ? <><MockInterviewTabs active="stations" /><p className="mt-5 max-w-3xl text-sm leading-6 text-muted">Private recording and self-review are free. Submitting an attempt for human-reviewed marking uses one Interview marking credit. You choose this after saving.</p>{!recordingEnabled && <p role="status" className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm leading-6">New mock recordings are being prepared. Your saved recordings and released feedback remain available in Recordings &amp; feedback.</p>}</> : <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold text-brand"><Link href="/interviews/practice/recordings">Recordings &amp; transcripts →</Link><Link href="/interviews/mock-interviews">Mock Interviews &amp; marking →</Link></div>}
    <section data-interview-tour="practice-selection" className="mt-7 rounded-3xl border border-border bg-surface p-6 eb-soft sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><h2 className="font-display text-2xl font-semibold tracking-tight">{isMock ? 'Choose your mock interview format' : 'Choose a practice format'}</h2><p className="mt-2 text-sm leading-6 text-muted">Each format has its own station bank.</p></div><div className="flex rounded-full bg-surface-muted p-1" role="group" aria-label="Interview format"><button type="button" onClick={() => switchFormat('mmi')} aria-pressed={format === 'mmi'} className={format === 'mmi' ? practiceButtonPrimary : practiceButtonSecondary}>MMI stations</button><button type="button" onClick={() => switchFormat('panel')} aria-pressed={format === 'panel'} className={format === 'panel' ? practiceButtonPrimary : practiceButtonSecondary}>Panel questions</button></div></div>
      <label className="mt-7 block text-sm font-semibold" htmlFor="interview-station">{format === 'mmi' ? 'MMI station' : 'Panel interview theme'}</label>
      {station ? <div className="mt-2 flex flex-col gap-3 sm:flex-row"><select id="interview-station" value={station.id} onChange={(event) => { setStationId(event.target.value); setQuestionIndex(0) }} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand">{stations.map((item) => <option key={item.id} value={item.id}>{item.panelThemeNumber ? `${String(item.panelThemeNumber).padStart(2, '0')} · ` : ''}{item.title} · {item.category}</option>)}</select><span className="inline-flex items-center rounded-xl bg-surface-muted px-4 py-3 font-mono text-xs text-muted">{stations.length} available</span></div> : <p className="mt-2 text-sm leading-6 text-muted">No MMI stations have been added yet.</p>}
      {format === 'panel' && station && <div className="mt-5">
        <label className="block text-sm font-semibold" htmlFor="interview-question">Panel question</label>
        <select id="interview-question" value={questionIndex} onChange={event => setQuestionIndex(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand">
          {station.questions.map((question, index) => <option key={index} value={index}>{index + 1}. {question}</option>)}
        </select>
      </div>}
    </section>
    {station ? <Link data-interview-tour="practice-preview" href={`${basePath}/session?format=${format}&station=${encodeURIComponent(station.id)}${format === 'panel' ? `&question=${questionIndex}` : ''}`} className="mt-7 grid overflow-hidden rounded-3xl bg-ink text-ink-foreground eb-soft transition-transform hover:-translate-y-0.5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-h-[320px] px-6 py-7 sm:px-9 sm:py-8"><div className="flex items-center justify-between gap-4 text-sm text-[#d4cbea]"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-mint" /> Selected station</span><span className="font-mono text-xs">{timing.preparationLabel} · {timing.responseLabel}</span></div><p className="mt-8 text-sm font-medium text-[#d4cbea]">{station.category}</p><h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">{station.title}</h2><p className="mt-5 max-w-2xl text-sm leading-6 text-[#d4cbea]">{station.preparation}</p><span className="mt-8 inline-flex items-center gap-2 rounded-full bg-surface px-5 py-3 text-sm font-semibold text-foreground">{isMock ? (recordingEnabled ? 'Set up mock interview' : 'View recording availability') : 'Start timed practice'} <ArrowIcon /></span></div>
      <aside className="bg-white/[0.055] p-6 lg:border-l lg:border-white/10"><p className="text-sm font-medium text-[#d4cbea]">{format === 'mmi' ? 'Inside this station' : 'Your panel question'}</p><ol className="mt-5 space-y-4">{previewQuestions.map((question, index) => <li key={question} className="flex gap-3 text-sm leading-5 text-[#d4cbea]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/20 font-mono text-xs text-white">{format === 'panel' ? questionIndex + 1 : index + 1}</span>{question}</li>)}</ol><p className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-[#b5acc9]">{isMock ? 'Camera and microphone access is requested only when you choose to set up your recording. Preparation is not recorded.' : 'Choose microphone recording or an unrecorded rehearsal. Preparation is not recorded. Saved audio includes a private transcript and appears in your practice calendar.'}</p></aside>
    </Link> : <section className="mt-7 rounded-3xl bg-surface-muted p-7 sm:p-9"><h2 className="font-display text-2xl font-semibold tracking-tight">MMI practice is ready for your stations.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Add your own MMI content and it will appear here as a selectable station.</p></section>}
  </div></main>
}

function ArrowIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
