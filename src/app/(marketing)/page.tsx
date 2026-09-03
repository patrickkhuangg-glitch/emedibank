import Link from 'next/link'
import type { ReactNode } from 'react'
import { Container } from '@/components/container'
import { Reveal } from '@/components/reveal'
import { Cyto } from '@/components/ui/cyto'
import type { CytoMood } from '@/lib/mascot/mood'
import { FormatSection } from '@/components/format-section'

const LEAD_LINK = 'font-semibold text-brand underline decoration-brand/40 underline-offset-2 transition-colors hover:decoration-brand'

export default function Home() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(58rem 30rem at 88% -12%, rgba(106,69,201,0.12), transparent 70%)' }} />
        <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div className="eb-rise">
            <span className="eb-soft inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] text-muted">
              <StethoIcon color="#6a45c9" />
              <span>Built for <b className="font-semibold text-foreground">future doctors</b></span>
            </span>
            <p className="mt-6 font-display text-2xl font-bold tracking-tight text-brand">Ready to become a doctor?</p>
            <h1 className="mt-1.5 text-balance font-display text-5xl font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              Build real exam <span className="text-brand">immunity</span>.
            </h1>
            <div className="mt-7 flex flex-wrap gap-2">
              {['UCAT', 'GAMSAT', 'ISAT', 'Interviews'].map((t) => (
                <span key={t} className="rounded-md bg-[#fbe7df] px-2.5 py-1 font-mono text-xs font-medium text-[#b8451f]">{t}</span>
              ))}
            </div>
            <p className="mt-5 max-w-md text-muted">
              Whatever stage you&rsquo;re at, sitting the <Link href="/#exams" className={LEAD_LINK}>UCAT</Link>, prepping for <Link href="/#exams" className={LEAD_LINK}>GAMSAT</Link> or <Link href="/#exams" className={LEAD_LINK}>ISAT</Link>, or getting ready for your <Link href="/#exams" className={LEAD_LINK}>interviews</Link>, Studocyte gives you the practice and feedback to walk in ready.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/app" className="eb-press eb-soft-hover group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-ink-foreground transition-all duration-300 hover:-translate-y-0.5">
                Open Studocyte <ArrowUpRight />
              </Link>
              <Link href="/pricing" className="rounded-full border border-border bg-surface px-5 py-3 font-medium transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-muted">
                See pricing
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted"><CheckMini /> Full mock exams are free. No card needed to start.</p>
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
              <div className="relative flex-none py-4">
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
      <FormatSection />

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
            <Feature title="Practice that targets your gaps" body="Flag questions, revisit weak topics, and build custom quizzes from any section so your study time goes where it's needed most." />
            <Feature title="Timed full mocks, free" body="Sit complete, section-timed mocks for UCAT, GAMSAT, ISAT and interviews at no cost. Upgrade for the full bank and video." />
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
            <Link href="/app" className="eb-press eb-soft-hover mt-7 inline-flex items-center gap-1.5 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground transition-all duration-200 hover:-translate-y-0.5">
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
    <Link href="/app" className="eb-press eb-soft-hover group block rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40">
      {inner}
    </Link>
  )
}

function Feature({ title, body, className = '' }: { title: string; body: string; className?: string }) {
  return (
    <div className={`eb-soft-hover rounded-2xl border border-border bg-surface p-7 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand/40 ${className}`}>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2.5 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  )
}

/* ---- The hero panel: the study cell on a vitals monitor ---- */
function StudyCellHero() {
  return (
    <div
      className="eb-soft relative aspect-[1/0.92] overflow-hidden rounded-[28px]"
      style={{
        background: '#171331',
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      <span className="absolute left-6 top-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 font-mono text-[13px] text-[#b39ee8]">
        <StethoIcon color="#b39ee8" size={15} /> 82% immunity
      </span>

      {/* heartbeat */}
      <svg className="absolute inset-x-0 top-1/2 h-[120px] w-full -translate-y-1/2 opacity-55" viewBox="0 0 800 120" preserveAspectRatio="none" aria-hidden>
        <path className="eb-ekg" d="M0,60 L140,60 L165,60 L180,20 L200,100 L220,40 L240,60 L620,60 L640,60 L655,20 L675,100 L695,40 L715,60 L800,60" fill="none" stroke="#8b6fd8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* orbit + mascot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div aria-hidden className="absolute h-[52%] w-[52%] rounded-full blur-2xl" style={{ background: 'radial-gradient(circle, rgba(240,72,59,0.28), transparent 70%)' }} />
        <div aria-hidden className="absolute h-[64%] w-[64%] rounded-full border border-dashed border-white/15" />
        <svg className="eb-float relative w-[40%]" viewBox="-4 -4 108 108" role="img" aria-label="Cyto, the study-cell mascot">
          <defs>
            <radialGradient id="cellBody" cx="42%" cy="34%" r="72%">
              <stop offset="0%" stopColor="#ff9184" /><stop offset="55%" stopColor="#f0483b" /><stop offset="100%" stopColor="#d61f27" />
            </radialGradient>
          </defs>
          <path d="M36 12 q-3 -8 3 -10" stroke="#b3231f" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M64 12 q3 -8 -3 -10" stroke="#b3231f" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M50 8 C70 8 80 19 84 35 C88 51 94 60 89 73 C84 88 68 96 50 96 C32 96 16 88 11 73 C6 60 12 51 16 35 C20 19 30 8 50 8 Z" fill="url(#cellBody)" stroke="#b3231f" strokeWidth="3" />
          <ellipse cx="27" cy="62" rx="7" ry="4.6" fill="#ffd2c0" opacity="0.85" /><ellipse cx="73" cy="62" rx="7" ry="4.6" fill="#ffd2c0" opacity="0.85" />
          <circle cx="37" cy="50" r="11.5" fill="#fff" /><circle cx="63" cy="50" r="11.5" fill="#fff" />
          <circle cx="38.5" cy="52" r="6" fill="#1d1836" /><circle cx="64.5" cy="52" r="6" fill="#1d1836" />
          <circle cx="41" cy="49" r="2.4" fill="#fff" /><circle cx="67" cy="49" r="2.4" fill="#fff" />
          <path d="M40 70 q10 9 20 0" stroke="#8a1c1c" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* floating stethoscopes */}
      <span className="absolute left-[12%] top-[22%]"><StethoIcon color="rgba(255,255,255,0.35)" size={34} strokeWidth={1.6} /></span>
      <span className="absolute bottom-[18%] right-[10%]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c1.9 0 3.3 1 4 2.3C11.2 6 12.6 5 14.5 5 18 5 20.5 8.5 18.5 12.5 16 16.65 12 21 12 21z" /></svg>
      </span>

      <span className="absolute bottom-6 right-6 z-10 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 font-mono text-[13px] text-[#B7B4D6]">Lvl 6 · +14 immunity pts</span>
    </div>
  )
}

function StethoIcon({ color = 'currentColor', size = 16, strokeWidth = 2 }: { color?: string; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <path d="M4.5 3v6.5a4 4 0 0 0 8 0V3" /><path d="M8.5 9.5V13a5.5 5.5 0 0 0 11 0v-2" /><circle cx="19" cy="8" r="2.3" />
    </svg>
  )
}
function CheckMini() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
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
