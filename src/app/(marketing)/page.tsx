import Link from 'next/link'
import type { ReactNode } from 'react'
import { Container } from '@/components/container'
import { Reveal } from '@/components/reveal'

export default function Home() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(58rem 30rem at 88% -12%, rgba(21,125,114,0.10), transparent 70%)' }} />
        <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div className="eb-rise">
            <span className="eb-soft inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> UCAT · GAMSAT · ISAT · Interviews
            </span>
            <h1 className="mt-5 text-balance font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Practise in the <span className="text-brand">real</span> exam interface.
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted">
              Exam-accurate question banks and full timed mocks, with written and video explanations for every answer. Now with XP, streaks and a mastery map.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/app" className="eb-press group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-ink-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
                Open EMediBank <ArrowUpRight />
              </Link>
              <Link href="/pricing" className="rounded-full border border-border bg-surface px-5 py-3 font-medium transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-muted">
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">Full mock exams are free. No card to start.</p>
          </div>

          <div className="eb-rise" style={{ animationDelay: '140ms' }}>
            <div className="eb-soft rounded-[2rem] border border-border bg-surface/50 p-2">
              <ExamPreview />
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------- Gamified prep ---------------- */}
      <section id="progress" className="border-t border-border bg-surface/50">
        <Container className="py-20 sm:py-28">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Your progress, gamified</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">Revision that plays like a game you want to win.</h2>
            <p className="mt-3 max-w-xl text-muted">Every answer earns XP. Levels, streaks, a mastery map and a weakness heatmap turn dry practice into visible momentum.</p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            <GameCard delay={0} className="md:col-span-2" title="Earn XP for every answer" body="Faster and more accurate answers earn more, with bonus multipliers for accuracy streaks under time pressure." icon={<BoltIcon />} />
            <GameCard delay={80} title="Daily streaks" body="Keep a Duolingo-style streak alive, day after day." icon={<FlameIcon />} />
            <GameCard delay={160} title="Level up each section" body="See where you're a Level 8 and where you're a Level 2." icon={<BarsIcon />} />
            <GameCard delay={0} title="Mastery map" body="Sub-skills unlock as accuracy climbs." icon={<PathIcon />} />
            <GameCard delay={80} className="md:col-span-2" title="Weakness heatmap" body="Accuracy and speed by question type, so a weak pattern-recognition topic glows red and you know exactly where to drill." icon={<GridIconSm />} />
            <GameCard delay={160} title="Spaced review" body="Missed questions return at the perfect moment." icon={<RepeatIcon />} />
          </div>
        </Container>
      </section>

      {/* ---------------- Exams ---------------- */}
      <section id="exams" className="border-t border-border bg-surface/50">
        <Container className="py-16 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">One platform, every admissions exam.</h2>
          <p className="mt-2 max-w-xl text-muted">Pick an exam and you drop straight into its question bank and mocks. Switch whenever you like.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <ExamCard name="UCAT" blurb="University Clinical Aptitude Test. Verbal Reasoning, Decision Making, Quantitative Reasoning and Situational Judgement." />
            <ExamCard name="GAMSAT" blurb="Graduate Medical School Admissions Test across the three reasoning sections." />
            <ExamCard name="ISAT" blurb="International Student Admissions Test for undergraduate medicine and dentistry." />
            <ExamCard name="Interviews" blurb="MMI and panel interview preparation." soon />
          </div>
        </Container>
      </section>

      {/* ---------------- Interface ---------------- */}
      <section id="interface">
        <Container className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">It looks and times like test day.</h2>
            <p className="mt-3 max-w-md text-muted">
              The runner mirrors the real interface down to the layout, fonts and pacing, so nothing on exam day is a surprise.
            </p>
            <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {['Full-screen kiosk mode', 'On-screen TI-108 calculator', 'Keyboard shortcuts', 'Per-section timers', 'Flag and review navigator', 'Authentic question types'].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm">
                  <CheckDot /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <InteractionRows />
          </div>
        </Container>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="border-t border-border bg-surface/50">
        <Container className="py-16 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">From cold start to exam-ready.</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="font-display text-3xl font-semibold text-brand/80">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-2 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ---------------- Why ---------------- */}
      <section id="why">
        <Container className="py-16 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built to teach, not just test.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Feature className="md:col-span-2" title="Every answer, worked through" body="Written rationales on every question, plus video explanations that show exactly how to reach the answer under time." />
            <Feature title="Real interactions" body="Yes/No grids, drag-and-drop, most/least appropriate. Not everything is multiple choice." />
            <Feature title="Timed full mocks, free" body="Sit complete, section-timed exams at no cost. Upgrade for the full bank and video." />
            <Feature className="md:col-span-2" title="See where you stand" body="Every attempt is tracked, so your accuracy per section shows against the EMediBank cohort average." />
          </div>
        </Container>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="border-t border-border bg-surface/50">
        <Container className="py-16 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Questions, answered.</h2>
            <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {FAQS.map((f) => (
                <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                    {f.q}
                    <span className="text-muted transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section>
        <Container className="py-16 sm:py-24">
          <div className="rounded-3xl bg-ink px-8 py-14 text-center text-ink-foreground sm:px-12">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Start with a free mock today.</h2>
            <p className="mx-auto mt-3 max-w-md text-ink-foreground/70">Pick your exam and practise in the interface you will actually sit.</p>
            <Link href="/app" className="eb-press mt-7 inline-flex items-center gap-1.5 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              Open EMediBank <ArrowUpRight />
            </Link>
          </div>
        </Container>
      </section>
    </>
  )
}

const STEPS = [
  { title: 'Pick your exam', body: 'Choose UCAT, GAMSAT or ISAT. The whole app scopes to it.' },
  { title: 'Practise by set', body: 'Drill a section or category, timed or untimed, one set at a time.' },
  { title: 'Sit a mock', body: 'Full, section-timed exams in the real interface.' },
  { title: 'Review and repeat', body: 'Read the rationale, watch the video, track your accuracy.' },
]

const FAQS = [
  { q: 'Which exams are covered?', a: 'UCAT, GAMSAT and ISAT are live, with Interviews coming next.' },
  { q: 'Is there a free option?', a: 'Yes. Full, timed mock exams are free for every exam. A subscription unlocks the full question bank and video explanations.' },
  { q: 'Do explanations include video?', a: 'Every question has a written rationale, and paid plans add a video walkthrough for each one.' },
  { q: 'Does it match the real test?', a: 'The runner replicates the layout, fonts, timing and question types of the real interface, including a kiosk mode and on-screen calculator.' },
]

function ExamCard({ name, blurb, soon }: { name: string; blurb: string; soon?: boolean }) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 flex-none place-items-center rounded-lg font-display text-sm font-bold ${soon ? 'bg-surface-muted text-muted' : 'bg-brand-muted text-brand'}`}>{name.slice(0, 1)}</span>
        <span className="font-display text-lg font-semibold">{name}</span>
        {soon ? <span className="ml-auto rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-muted">Coming soon</span> : <ArrowRight className="ml-auto" />}
      </div>
      <p className="mt-3 text-sm text-muted">{blurb}</p>
    </>
  )
  if (soon) return <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 opacity-80">{inner}</div>
  return (
    <Link href="/app" className="eb-press group block rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md">
      {inner}
    </Link>
  )
}

function Feature({ title, body, className = '' }: { title: string; body: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-6 ${className}`}>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  )
}

/* ---- The signature: a real mini exam-interface preview ---- */
function ExamPreview() {
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[#0a5286] shadow-xl" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ background: 'linear-gradient(#1a78bf,#1268ad)' }}>
        <span className="text-sm font-semibold">Verbal Reasoning</span>
        <span className="text-xs tabular-nums">09:41 · 1 of 4</span>
      </div>
      <div className="flex items-center gap-5 px-4 py-1.5 text-xs text-white" style={{ background: '#4e82c4' }}>
        <span>Explain Answer</span><span>Calculator</span><span className="ml-auto">Flag</span>
      </div>
      <div className="bg-white p-4 text-[#1b1b1b]">
        <p className="text-[13px] leading-relaxed text-gray-700">
          A clinic schedules patients in fixed 15-minute slots from 9am. If three slots are held for emergencies each morning, and the clinic runs until 1pm...
        </p>
        <p className="mt-3 text-sm font-medium">How many routine patients can be booked before midday?</p>
        <div className="mt-3 space-y-2 text-sm">
          {[['A', '9', false], ['B', '12', true], ['C', '15', false], ['D', '16', false]].map(([l, t, sel]) => (
            <div key={l as string} className="flex items-center gap-2.5">
              <span className={`grid h-4 w-4 flex-none place-items-center rounded-full border-2 ${sel ? 'border-[#1268ad]' : 'border-gray-400'}`}>{sel ? <span className="h-1.5 w-1.5 rounded-full bg-[#1268ad]" /> : null}</span>
              <span className="font-medium">{l as string}.</span>
              <span>{t as string}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2 text-xs text-white" style={{ background: 'linear-gradient(#1268ad,#0c5f9c)' }}>
        <span>End Exam</span>
        <span className="flex gap-4"><span className="text-[#ffd21e]">Previous</span><span>Navigator</span><span className="text-[#ffd21e]">Next</span></span>
      </div>
    </div>
  )
}

function InteractionRows() {
  const rows = [
    { k: 'Verbal Reasoning', v: 'Passage sets, four questions each' },
    { k: 'Decision Making', v: 'Yes/No conclusion grids, drag-and-drop' },
    { k: 'Quantitative Reasoning', v: 'Data, tables and the on-screen calculator' },
    { k: 'Situational Judgement', v: 'Most and least appropriate ranking' },
  ]
  return (
    <div className="divide-y divide-border">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <span className="text-sm font-medium">{r.k}</span>
          <span className="text-right text-xs text-muted">{r.v}</span>
        </div>
      ))}
    </div>
  )
}

function CheckDot() {
  return <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-brand-muted text-brand"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5L20 7" /></svg></span>
}
function ArrowRight({ className = '' }: { className?: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-brand ${className}`} aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}
function GameCard({ title, body, icon, delay = 0, className = '' }: { title: string; body: string; icon: ReactNode; delay?: number; className?: string }) {
  return (
    <Reveal delay={delay} className={`h-full ${className}`}>
      <div className="eb-soft group h-full rounded-3xl border border-border bg-surface p-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-muted text-brand transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110">{icon}</span>
        <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted">{body}</p>
      </div>
    </Reveal>
  )
}

const LINE = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
function BoltIcon() { return <svg {...LINE}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg> }
function FlameIcon() { return <svg {...LINE}><path d="M12 3s5 3.5 5 8.5A5 5 0 0 1 7 12c0-2 1-3 1-3 0 1.5 1 2.5 2 2.5 0-3 2-5.5 2-8.5Z" /></svg> }
function BarsIcon() { return <svg {...LINE}><path d="M5 20V10M12 20V4M19 20v-7" /></svg> }
function PathIcon() { return <svg {...LINE}><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8 16.5 16 7.5" /><circle cx="12" cy="12" r="1" /></svg> }
function GridIconSm() { return <svg {...LINE}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg> }
function RepeatIcon() { return <svg {...LINE}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg> }

function ArrowUpRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17 17 7M8 7h9v9" /></svg>
}
