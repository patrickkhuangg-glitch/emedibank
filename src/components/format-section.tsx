'use client'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Container } from './container'

// "Timed like the real exam" — a checklist of what a mock delivers, beside a
// tabbed breakdown of each exam's format. Client for the tab state only.
type Exam = { label: string; rows: [string, string][] }
const EXAMS: Record<string, Exam> = {
  ucat: { label: 'UCAT', rows: [
    ['Verbal Reasoning', 'Reading and interpreting written passages'],
    ['Decision Making', 'Weighing evidence and drawing conclusions'],
    ['Quantitative Reasoning', 'Solving problems using numbers and data'],
    ['Situational Judgement', 'Judging ethical scenarios'],
  ] },
  gamsat: { label: 'GAMSAT', rows: [
    ['Section 1', 'Humanities and social sciences passages'],
    ['Section 2', 'Two timed written communication tasks'],
    ['Section 3', 'Biology, chemistry and physics reasoning'],
    ['Full mocks', 'Real section lengths and break timing'],
  ] },
  isat: { label: 'ISAT', rows: [
    ['Critical Reasoning', 'Reading passages and drawing conclusions'],
    ['Quantitative Reasoning', 'Maths and data problems'],
    ['Full Mocks', '100 questions in 3 hours'],
  ] },
  interviews: { label: 'Interviews', rows: [
    ['MMI stations', 'Timed scenario-based rotations'],
    ['Panel interview', 'Structured behavioural questions'],
    ['Situational prompts', 'Ethical and clinical judgement calls'],
    ['Video practice', 'Record, review and get feedback'],
  ] },
}
const CHECKS = [
  'Full-screen kiosk mode',
  'Section-by-section score breakdown',
  'Per-section timers',
  'Written and video explanations',
  'Expert-written exam questions',
  'Percentile benchmarking',
]

export function FormatSection() {
  const [tab, setTab] = useState<keyof typeof EXAMS>('ucat')
  return (
    <section id="interface" className="border-t border-border bg-surface/50">
      <Container className="grid items-start gap-12 py-16 sm:py-20 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Timed like the real exam, explained like a tutor.</h2>
          <p className="mt-4 max-w-md text-muted">Every mock exam matches the real exam platform, and every question is written by exam experts. Finish a mock and get an instant results breakdown, with written and video explanations for every question.</p>
          <div className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {CHECKS.map((c) => (
              <div key={c} className="flex items-center gap-2.5 text-sm"><Tick /> {c}</div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Exam formats">
            {(Object.keys(EXAMS) as (keyof typeof EXAMS)[]).map((k) => {
              const on = tab === k
              return (
                <button
                  key={k} type="button" role="tab" aria-selected={on}
                  onClick={() => setTab(k)}
                  className={`eb-press rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    on ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-surface text-muted hover:text-foreground'
                  }`}
                >
                  {EXAMS[k].label}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-[13px] text-muted">Exact timing and format, plus feedback the moment you finish.</p>
          <div className="eb-soft mt-3 rounded-2xl border border-border bg-surface px-6">
            {EXAMS[tab].rows.map(([name, detail]) => (
              <div key={name} className="flex flex-col justify-between gap-1 border-b border-border py-5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6">
                <span className="font-semibold sm:whitespace-nowrap">{name}</span>
                <span className="text-sm text-muted sm:text-right">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

function Tick(): ReactNode {
  return (
    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-brand-muted">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  )
}
