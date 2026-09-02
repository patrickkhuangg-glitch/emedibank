import Link from 'next/link'
import type { ReactNode } from 'react'
import { Container } from '@/components/container'
import { Reveal } from '@/components/reveal'
import { Cyto } from '@/components/ui/cyto'
import type { CytoMood } from '@/lib/mascot/mood'

export default function Home() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(58rem 30rem at 88% -12%, rgba(106,69,201,0.12), transparent 70%)' }} />
        <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div className="eb-rise">
            <span className="eb-soft inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" /> UCAT · GAMSAT · ISAT · Interviews
            </span>
            <h1 className="mt-5 text-balance font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Build real exam <span className="text-mint">immunity</span>.
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted">
              Exam-accurate question banks and full timed mocks, with written and video explanations for every answer. Face each exam as a pathogen, fight it, and build the immunity that makes you exam-ready.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/app" className="eb-press group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-ink-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
                Open Studocyte <ArrowUpRight />
              </Link>
              <Link href="/pricing" className="rounded-full border border-border bg-surface px-5 py-3 font-medium transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-muted">
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">Full mock exams are free. No card to start.</p>
          </div>

          <div className="eb-rise" style={{ animationDelay: '140ms' }}>
            <StudyCellHero />
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
            <div className="eb-rise eb-soft md:col-span-4 flex flex-col items-center gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:gap-9 sm:p-8">
              <div className="relative flex-none">
                <div aria-hidden className="absolute inset-2 -z-10 rounded-full blur-xl" style={{ background: 'radial-gradient(circle, rgba(240,72,59,0.18), transparent 70%)' }} />
                <Cyto mood="thriving" size={132} title="Cyto, thriving" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-display text-2xl font-semibold tracking-tight">Meet Cyto — your study cell.</h3>
                <p className="mt-2 max-w-xl text-muted">Cyto reacts to how you&rsquo;re really going. Keep your accuracy up and your streak alive and it&rsquo;s thriving, crown and all — let the streak lapse and it dozes off. A small, friendly nudge to come back tomorrow.</p>
                <div className="mt-5 flex flex-wrap items-end justify-center gap-5 sm:justify-start">
                  {([['sleepy', 'Off the streak'], ['worried', 'Slipping'], ['focused', 'Steady'], ['happy', 'On track'], ['thriving', 'Thriving']] as [CytoMood, string][]).map(([m, label]) => (
                    <div key={m} className="flex flex-col items-center gap-1.5">
                      <Cyto mood={m} size={46} />
                      <span className="text-[11px] font-medium text-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Four exams, four pathogens.</h2>
          <p className="mt-2 max-w-xl text-muted">Each assessment becomes a pathogen with its own colour and personality. Pick one and you drop straight into its question bank and mocks — switch whenever you like.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <ExamCard name="UCAT" pathogen="Tachynon" accent="#F0503C" blurb="University Clinical Aptitude Test. Verbal Reasoning, Decision Making, Quantitative Reasoning and Situational Judgement." />
            <ExamCard name="GAMSAT" pathogen="Cerebrus" accent="#D9911F" blurb="Graduate Medical School Admissions Test across the three reasoning sections." />
            <ExamCard name="ISAT" pathogen="Enigmoeba" accent="#2789CE" blurb="International Student Admissions Test for undergraduate medicine and dentistry." />
            <ExamCard name="Interviews" pathogen="Flummox" accent="#DE4E8A" blurb="MMI and panel interview preparation." soon />
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
            <Feature className="md:col-span-2" title="See where you stand" body="Every attempt is tracked, so your accuracy per section shows against the Studocyte cohort average." />
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
              Open Studocyte <ArrowUpRight />
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

function ExamCard({ name, blurb, pathogen, accent, soon }: { name: string; blurb: string; pathogen: string; accent: string; soon?: boolean }) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 flex-none place-items-center rounded-lg font-display text-sm font-bold ${soon ? 'bg-surface-muted text-muted' : ''}`}
          style={soon ? undefined : { backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
        >
          {name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <span className="font-display text-lg font-semibold">{name}</span>
          <span className="ml-2 font-mono text-[11px] uppercase tracking-wide" style={{ color: soon ? 'var(--muted)' : accent }}>{pathogen}</span>
        </div>
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

/* ---- The signature: the study cell in its microscope field ---- */
function StudyCellHero() {
  return (
    <div
      className="eb-soft relative overflow-hidden rounded-[2rem] border border-border p-6 sm:p-8"
      style={{ background: 'radial-gradient(120% 90% at 50% 0%, #241C3D, #130F20 72%)' }}
    >
      {/* field grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage: 'radial-gradient(120% 90% at 50% 10%, #000, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 50% 10%, #000, transparent 72%)',
        }}
      />
      <div className="relative mx-auto grid aspect-square max-w-sm place-items-center">
        <div aria-hidden className="absolute inset-[6%] rounded-full" style={{ border: '1px dashed rgba(255,255,255,0.22)' }} />
        <div aria-hidden className="absolute inset-[18%] rounded-full" style={{ border: '1px solid rgba(255,255,255,0.10)' }} />
        <div aria-hidden className="absolute inset-[30%] rounded-full" style={{ border: '1px solid rgba(65,211,192,0.40)' }} />
        <div aria-hidden className="absolute inset-[20%] rounded-full blur-md" style={{ background: 'radial-gradient(circle, rgba(65,211,192,0.34), transparent 68%)' }} />
        <svg className="eb-float relative w-[62%]" viewBox="0 0 220 230" role="img" aria-label="Studocyte, the study-cell mascot">
          <defs>
            <radialGradient id="cellBody" cx="42%" cy="34%" r="72%">
              <stop offset="0%" stopColor="#6BEAD8" />
              <stop offset="60%" stopColor="#2ECBB6" />
              <stop offset="100%" stopColor="#17A493" />
            </radialGradient>
          </defs>
          <path d="M84 196 q-4 20 -14 22" stroke="#17A493" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M132 196 q6 20 16 20" stroke="#17A493" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M92 34 q-6 -22 -18 -28" stroke="#17A493" strokeWidth="7" fill="none" strokeLinecap="round" />
          <circle cx="72" cy="5" r="8" fill="#6BEAD8" />
          <path d="M128 32 q8 -20 22 -22" stroke="#17A493" strokeWidth="7" fill="none" strokeLinecap="round" />
          <circle cx="152" cy="9" r="7" fill="#6BEAD8" />
          <path d="M110 24 C150 22 176 44 180 78 C184 108 178 128 172 150 C164 180 140 196 110 196 C80 196 56 180 48 150 C42 128 36 108 40 78 C44 44 70 26 110 24 Z" fill="url(#cellBody)" />
          <path d="M110 24 C150 22 176 44 180 78 C184 108 178 128 172 150 C164 180 140 196 110 196 C80 196 56 180 48 150 C42 128 36 108 40 78 C44 44 70 26 110 24 Z" fill="none" stroke="#0E8677" strokeWidth="6" />
          <path d="M110 40 C142 40 162 58 165 84 C168 108 160 150 140 168 C124 182 96 182 80 168 C60 150 54 108 57 84 C60 58 78 40 110 40 Z" fill="none" stroke="#59D8C6" strokeWidth="3" opacity="0.55" />
          <circle cx="146" cy="150" r="16" fill="#0E8677" opacity="0.22" />
          <circle cx="70" cy="86" r="7" fill="#0E8677" opacity="0.16" />
          <g transform="rotate(-11 66 132)">
            <rect x="18" y="112" width="46" height="34" rx="6" fill="#FFFFFF" stroke="#0E8677" strokeWidth="4" />
            <line x1="26" y1="123" x2="56" y2="123" stroke="#6A45C9" strokeWidth="4" strokeLinecap="round" />
            <line x1="26" y1="133" x2="48" y2="133" stroke="#C9BEEF" strokeWidth="4" strokeLinecap="round" />
          </g>
          <path d="M64 138 q-14 -4 -18 -14" stroke="#17A493" strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M158 132 q16 -2 22 -14" stroke="#17A493" strokeWidth="11" fill="none" strokeLinecap="round" />
          <ellipse cx="90" cy="104" rx="15" ry="17" fill="#fff" />
          <ellipse cx="132" cy="104" rx="15" ry="17" fill="#fff" />
          <circle cx="93" cy="108" r="7.5" fill="#1F1B30" />
          <circle cx="135" cy="108" r="7.5" fill="#1F1B30" />
          <circle cx="90" cy="104" r="2.6" fill="#fff" />
          <circle cx="132" cy="104" r="2.6" fill="#fff" />
          <path d="M76 86 q14 -7 26 -1" stroke="#0E8677" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M120 85 q12 -6 24 1" stroke="#0E8677" strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="70" cy="128" rx="9" ry="6" fill="#FF9D8A" opacity="0.55" />
          <ellipse cx="150" cy="128" rx="9" ry="6" fill="#FF9D8A" opacity="0.55" />
          <path d="M96 132 q15 15 30 0" stroke="#1F1B30" strokeWidth="5.5" fill="none" strokeLinecap="round" />
          <path d="M176 60 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#F0B24C" />
        </svg>
      </div>
      {/* floating specimen chips */}
      <span className="absolute left-5 top-6 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-mono text-[11px] font-medium text-[#8FEEE1] backdrop-blur-sm">82% immunity</span>
      <span className="absolute bottom-6 right-5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-mono text-[11px] font-medium text-[#C9B6FF] backdrop-blur-sm">Level 6 · +14 XP</span>
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
