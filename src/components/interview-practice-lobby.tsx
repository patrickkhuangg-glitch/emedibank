'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { INTERVIEW_STATIONS, type InterviewFormat } from '@/lib/interviews/stations'

export function InterviewPracticeLobby() {
  const [format, setFormat] = useState<InterviewFormat>('mmi')
  const stations = useMemo(() => INTERVIEW_STATIONS.filter((station) => station.format === format), [format])
  const [stationId, setStationId] = useState(stations[0].id)
  const station = stations.find((item) => item.id === stationId) ?? stations[0]

  function switchFormat(next: InterviewFormat) {
    setFormat(next)
    setStationId(INTERVIEW_STATIONS.find((station) => station.format === next)?.id ?? '')
  }

  return <main className="min-h-screen bg-background pb-16 text-foreground"><div className="mx-auto max-w-[1240px] px-5 pt-10 sm:px-8 sm:pt-14">
    <header className="max-w-3xl"><h1 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl">Practise interview answers with purpose.</h1><p className="mt-4 text-base leading-7 text-muted sm:text-lg">Pick a station, prepare for two minutes, then move through one question at a time while your eight-minute response is recorded privately to your account.</p></header>
    <section className="mt-9 rounded-3xl border border-border bg-surface p-6 eb-soft sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><h2 className="font-display text-2xl font-semibold tracking-tight">Choose a practice format</h2><p className="mt-2 text-sm leading-6 text-muted">Each format has its own station bank.</p></div><div className="flex rounded-full bg-surface-muted p-1" role="group" aria-label="Interview format"><button type="button" onClick={() => switchFormat('mmi')} className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${format === 'mmi' ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}>MMI stations</button><button type="button" onClick={() => switchFormat('panel')} className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${format === 'panel' ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}>Panel questions</button></div></div>
      <label className="mt-7 block text-sm font-semibold" htmlFor="interview-station">{format === 'mmi' ? 'MMI station' : 'Panel interview set'}</label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row"><select id="interview-station" value={station.id} onChange={(event) => setStationId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand">{stations.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.category}</option>)}</select><span className="inline-flex items-center rounded-xl bg-surface-muted px-4 py-3 font-mono text-xs text-muted">{stations.length} available</span></div>
    </section>
    <Link href={`/interviews/practice/session?format=${format}&station=${station.id}`} className="mt-7 grid overflow-hidden rounded-3xl bg-ink text-ink-foreground eb-soft transition-transform hover:-translate-y-0.5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-h-[320px] px-6 py-7 sm:px-9 sm:py-8"><div className="flex items-center justify-between gap-4 text-sm text-[#d4cbea]"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-mint" /> Selected station</span><span className="font-mono text-xs">2 min prep · 8 min response</span></div><p className="mt-8 text-sm font-medium text-[#d4cbea]">{station.category}</p><h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">{station.title}</h2><p className="mt-5 max-w-2xl text-sm leading-6 text-[#d4cbea]">{station.preparation}</p><span className="mt-8 inline-flex items-center gap-2 rounded-full bg-surface px-5 py-3 text-sm font-semibold text-foreground">Start recorded practice <ArrowIcon /></span></div>
      <aside className="bg-white/[0.055] p-6 lg:border-l lg:border-white/10"><p className="text-sm font-medium text-[#d4cbea]">Inside this station</p><ol className="mt-5 space-y-4">{station.questions.map((question, index) => <li key={question} className="flex gap-3 text-sm leading-5 text-[#d4cbea]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/20 font-mono text-xs text-white">{index + 1}</span>{question}</li>)}</ol><p className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-[#b5acc9]">Your microphone is requested only after you choose to start.</p></aside>
    </Link>
  </div></main>
}

function ArrowIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
