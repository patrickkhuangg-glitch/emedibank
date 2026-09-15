import Link from 'next/link'
import { InterviewRehearsalRunner } from '@/components/interviews/rehearsal-runner'
import { studentStation } from '@/lib/interviews/trial-stations'
import { ROLEPLAY_STATIONS } from '@/lib/interviews/roleplay-stations'
import { RoleplayStage, type RoleplayStageName } from '@/components/interviews/roleplay-stage'
import { practiceButtonPrimary, practiceButtonSecondary } from '@/components/interviews/practice-buttons'

export default async function RoleplayPreview({searchParams}:{searchParams:Promise<{station?:string;phase?:string}>}) {
  const params=await searchParams
  const key=params.station==='camera'?'camera':'rural'
  const station=ROLEPLAY_STATIONS[key==='camera'?1:0]
  const stage:RoleplayStageName=params.phase==='roleplay'||params.phase==='reflection'?params.phase:'preparation'
  const trying=params.phase==='try'
  const Wrapper=trying?'div':'main'
  return <Wrapper className="page-frame page-shell space-y-7 pb-16">
    <aside className="rounded-2xl border border-border bg-surface p-5" aria-label="Preview controls">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">Local preview</p>
      <p className="mt-2 text-sm leading-6 text-muted">Switch screens here to preview the station. In practice, the timer moves between them automatically. This preview does not record or save anything.</p>
      <div className="mt-4 flex flex-wrap gap-2">{[['rural','Rural outreach'],['camera','Borrowed camera']].map(([value,label])=><Link key={value} href={`?station=${value}&phase=${stage}`} className={key===value?practiceButtonPrimary:practiceButtonSecondary}>{label}</Link>)}</div>
      <nav aria-label="Preview stage" className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">{[['preparation','Preparation'],['roleplay','Role-play rehearsal'],['reflection','Reflection'],['try','Try the timer']].map(([value,label])=><Link key={value} aria-current={stage===value?'page':undefined} className={`rounded-lg px-2 py-1 transition-colors hover:bg-brand-muted ${stage===value?'text-brand underline underline-offset-4':'text-muted'}`} href={`?station=${key}&phase=${value}`}>{label}</Link>)}</nav>
    </aside>
    {trying?<InterviewRehearsalRunner key={station.id} station={studentStation(station)} allowUntracked/>:<section className="mx-auto max-w-4xl space-y-6">
      <header><p className="text-sm font-semibold text-brand">Practice · MMI role-play rehearsal</p><h1 className="mt-3 text-balance font-display text-3xl font-semibold leading-tight sm:text-4xl">{station.title}</h1></header>
      <RoleplayStage stage={stage} seconds={stage==='preparation'?120:240} scenario={station.preparation} question={station.questions[stage==='reflection'?1:0]} recording/>
      <Link className={practiceButtonSecondary} href="/prototypes/interviews/practice">Back to practice preview</Link>
    </section>}
  </Wrapper>
}
