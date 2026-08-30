import type { Metadata } from 'next'
import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireUser, getProfile } from '@/lib/auth/dal'
import { getCurrentExam, listExams } from '@/lib/exam/current'
import { getDashboard, mostRecentExamId, type HeatCell, type MasterySection } from '@/lib/dashboard/stats'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dashboard' }

const CARD = 'eb-soft rounded-3xl border border-border bg-surface'
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted'

export default async function DashboardPage() {
  const user = await requireUser('/dashboard')
  const profile = await getProfile()
  const first = profile?.full_name?.split(' ')[0] ?? 'there'
  // Prefer the pinned exam; otherwise the one they've practised most recently.
  let exam = await getCurrentExam()
  if (!exam) {
    const exams = await listExams()
    const recent = await mostRecentExamId(user.id)
    exam = exams.find((e) => e.id === recent) ?? exams[0]
  }

  if (!exam) {
    return (
      <Container className="py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Hi {first} 👋</h1>
        <p className="mt-2 text-muted">No exams are set up yet.</p>
      </Container>
    )
  }

  const d = await getDashboard(user.id, exam.slug, exam.id)

  return (
    <Container className="py-10 sm:py-14">
      {/* header */}
      <div className="eb-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={EYEBROW}>{exam.name} · your progress</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Hi {first}.</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/practice/${exam.slug}`} className="eb-press group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            Practise <Arrow />
          </Link>
        </div>
      </div>

      {/* bento */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Level / XP */}
        <section className={`${CARD} eb-rise p-6 lg:col-span-4`} style={delay(40)}>
          <p className={EYEBROW}>Overall level</p>
          <div className="mt-4 flex items-center gap-5">
            <XpRing level={d.level} into={d.hasData ? d.into : 0.04} />
            <div>
              <div className="eb-pop font-display text-3xl font-semibold tabular-nums">{d.totalXp.toLocaleString()}<span className="ml-1 text-sm font-normal text-muted">XP</span></div>
              <p className="mt-1 text-sm text-muted">{d.hasData ? `${d.toNext.toLocaleString()} XP to level ${d.level + 1}` : 'Answer questions to earn XP'}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted">Correct answers earn more when you&rsquo;re fast and on a streak.</p>
        </section>

        {/* Streak */}
        <section className={`${CARD} eb-rise flex flex-col p-6 lg:col-span-3`} style={delay(90)}>
          <p className={EYEBROW}>Daily streak</p>
          <div className="mt-4 flex items-center gap-3">
            <Flame active={d.practisedToday} />
            <div>
              <div className="eb-pop font-display text-4xl font-semibold leading-none tabular-nums">{d.dailyStreak}</div>
              <p className="text-sm text-muted">day{d.dailyStreak === 1 ? '' : 's'}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">{d.practisedToday ? 'Practised today. Nice.' : d.dailyStreak > 0 ? 'Practise today to keep it alive.' : 'Start a streak today.'}</p>
          <div className="mt-auto flex items-center gap-2 pt-4 text-[11px] text-muted">
            <span className="rounded-full bg-surface-muted px-2 py-0.5">❄ Streak freeze · soon</span>
          </div>
        </section>

        {/* Predicted score */}
        <section className={`${CARD} eb-rise flex flex-col justify-between p-6 lg:col-span-5`} style={delay(140)}>
          <div className="flex items-start justify-between">
            <p className={EYEBROW}>Predicted band</p>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] text-muted">{d.predicted.label}</span>
          </div>
          <div className="mt-2 flex items-end gap-3">
            <span className="eb-pop font-display text-5xl font-semibold tracking-tight tabular-nums">{d.predicted.band}</span>
            {d.accuracy != null ? <span className="pb-1.5 text-sm text-muted">{d.accuracy}% accuracy · {d.attempted} answered</span> : null}
          </div>
          <p className="mt-3 text-xs text-muted">A rough guide from recent accuracy. It tightens as you practise more.</p>
        </section>

        {/* Section levels */}
        <section className={`${CARD} eb-rise p-6 lg:col-span-7`} style={delay(190)}>
          <p className={EYEBROW}>Levels by section</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {d.sections.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="font-display text-lg font-semibold text-brand">Lv {s.level}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div className="eb-bar h-full rounded-full bg-brand" style={{ width: `${Math.round((s.attempted ? s.into : 0) * 100)}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                  <span>{s.accuracy != null ? `${s.accuracy}% acc` : 'Not started'}</span>
                  {s.streak > 0 ? <span className="font-medium text-[#c47a1e]">🔥 {s.streak} in a row</span> : <span>{s.attempted} done</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Review queue */}
        <section className={`${CARD} eb-rise flex flex-col p-6 lg:col-span-5`} style={delay(240)}>
          <p className={EYEBROW}>Review queue</p>
          <div className="mt-3 flex items-end gap-3">
            <span className="eb-pop font-display text-5xl font-semibold tabular-nums">{d.reviewDue.length}</span>
            <span className="pb-1.5 text-sm text-muted">due to revisit</span>
          </div>
          <p className="mt-1 text-xs text-muted">Missed questions come back on a spaced schedule so the concepts stick.</p>
          <div className="mt-3 flex gap-1.5 text-[11px] text-muted">
            {['1 day', '3 days', '7 days'].map((t) => <span key={t} className="rounded-full bg-surface-muted px-2 py-0.5">{t}</span>)}
          </div>
          <div className="mt-auto pt-4">
            {d.reviewDue.length > 0 ? (
              <Link href={`/session?exam=${exam.slug}&mode=review`} className="eb-press group inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                Review {d.reviewDue.length} now <Arrow />
              </Link>
            ) : (
              <p className="text-xs text-muted">{d.reviewUpcoming > 0 ? `${d.reviewUpcoming} question${d.reviewUpcoming === 1 ? '' : 's'} will be ready tomorrow.` : 'Nothing to review yet. Miss a few and they turn up here.'}</p>
            )}
          </div>
        </section>

        {/* Weakness heatmap */}
        <section className={`${CARD} eb-rise p-6 lg:col-span-7`} style={delay(290)}>
          <div className="flex items-center justify-between">
            <p className={EYEBROW}>Weakness heatmap</p>
            <span className="text-[11px] text-muted">accuracy · speed</span>
          </div>
          <Heatmap cells={d.heatmap} />
        </section>

        {/* Mastery */}
        <section className={`${CARD} eb-rise p-6 lg:col-span-5`} style={delay(340)}>
          <p className={EYEBROW}>Mastery map</p>
          <p className="mt-1 text-xs text-muted">Nodes unlock as your accuracy climbs.</p>
          <Mastery sections={d.mastery} />
        </section>

        {/* Placeholder for future features */}
        <section className="eb-rise rounded-3xl border border-dashed border-border p-6 text-sm text-muted lg:col-span-12" style={delay(390)}>
          <p className={EYEBROW}>Coming to your dashboard</p>
          <p className="mt-2 max-w-2xl">Streak freezes and repair tokens, an interactive skill tree, challenge modes, and a live weekly summary. This space is reserved so new features slot straight in.</p>
        </section>
      </div>

      {!d.hasData ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl bg-brand-muted p-8 text-center">
          <p className="font-display text-xl font-semibold">Your dashboard is waiting.</p>
          <p className="max-w-md text-sm text-muted">Answer your first questions to start earning XP, building a streak, and revealing your weak spots.</p>
          <Link href={`/practice/${exam.slug}`} className="eb-press mt-1 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            Start practising <Arrow />
          </Link>
        </div>
      ) : null}
    </Container>
  )
}

function delay(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` }
}

function XpRing({ level, into }: { level: number; into: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0.03, Math.min(1, into)))
  return (
    <div className="relative h-32 w-32 flex-none">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-muted)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--brand)" strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="eb-ring" style={{ ['--ring-circ']: `${circ}` } as CSSProperties} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Level</div>
          <div className="font-display text-4xl font-semibold leading-none">{level}</div>
        </div>
      </div>
    </div>
  )
}

function Flame({ active }: { active: boolean }) {
  return (
    <span className={`grid h-14 w-14 flex-none place-items-center rounded-2xl ${active ? 'bg-[#fbe6cf]' : 'bg-surface-muted'}`}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3s5 3.5 5 8.5A5 5 0 0 1 7 12c0-2 1-3 1-3 0 1.5 1 2.5 2 2.5 0-3 2-5.5 2-8.5Z" stroke={active ? '#e08a2b' : 'currentColor'} strokeWidth="1.5" fill={active ? '#f4b15f' : 'none'} className={active ? '' : 'text-muted'} strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function accClasses(acc: number | null): string {
  if (acc == null) return 'bg-surface-muted text-muted'
  if (acc >= 80) return 'bg-brand-muted text-brand'
  if (acc >= 60) return 'bg-[#f6ecd6] text-[#b0761f]'
  return 'bg-[#f8e2df] text-[#c0554b]'
}
function speedClasses(s: number | null): string {
  if (s == null) return 'bg-surface-muted text-muted'
  if (s <= 30) return 'bg-brand-muted text-brand'
  if (s <= 60) return 'bg-[#f6ecd6] text-[#b0761f]'
  return 'bg-[#f8e2df] text-[#c0554b]'
}

function Heatmap({ cells }: { cells: HeatCell[] }) {
  const bySection = new Map<string, HeatCell[]>()
  for (const c of cells) {
    const arr = bySection.get(c.section) ?? []
    arr.push(c)
    bySection.set(c.section, arr)
  }
  if (cells.length === 0) return <p className="mt-4 text-sm text-muted">Practise a few categories to light this up.</p>
  return (
    <div className="mt-4 space-y-4">
      {[...bySection.entries()].map(([section, list]) => (
        <div key={section}>
          <p className="mb-1.5 text-xs font-medium text-foreground/70">{section}</p>
          <div className="space-y-1">
            {list.map((c) => (
              <div key={c.tag} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-foreground/80">{c.tag}</span>
                <span className={`w-14 rounded-md px-2 py-0.5 text-center text-[11px] font-medium ${accClasses(c.accuracy)}`}>{c.accuracy != null ? `${c.accuracy}%` : '·'}</span>
                <span className={`w-14 rounded-md px-2 py-0.5 text-center text-[11px] font-medium ${speedClasses(c.avgSeconds)}`}>{c.avgSeconds != null ? `${c.avgSeconds}s` : '·'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Mastery({ sections }: { sections: MasterySection[] }) {
  if (sections.length === 0) return <p className="mt-4 text-sm text-muted">No mastery paths yet.</p>
  return (
    <div className="mt-4 space-y-4">
      {sections.map((s) => (
        <div key={s.name}>
          <p className="mb-2 text-xs font-medium text-foreground/70">{s.name}</p>
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
            {s.nodes.map((n, i) => (
              <span key={n.tag} className="flex items-center">
                <span
                  title={`${n.tag}${n.accuracy != null ? ` · ${n.accuracy}%` : ' · locked'}`}
                  className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold ${
                    n.state === 'mastered' ? 'bg-brand text-brand-foreground' : n.state === 'learning' ? 'border-2 border-brand bg-brand-muted text-brand' : 'border border-dashed border-border bg-surface-muted text-muted'
                  }`}
                >
                  {n.state === 'mastered' ? '★' : n.state === 'learning' ? n.accuracy ?? '' : '🔒'}
                </span>
                {i < s.nodes.length - 1 ? <span className={`h-[2px] w-3 ${n.state === 'mastered' ? 'bg-brand' : 'bg-border'}`} /> : null}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Arrow(): ReactNode {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </span>
  )
}
