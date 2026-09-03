'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { haptic } from '@/lib/haptics'
import { SET_COUNTS, setsForMinutes } from '@/lib/practice/timing'

type TimedOption = { minutes: number; questions: number | null; full: boolean }

export function TimingPicker({
  examSlug,
  subtestId,
  categoryKey,
  timedOptions,
  minutesPerSet,
  availableSets,
  availableQuestions,
}: {
  examSlug: string
  subtestId: string
  categoryKey: string
  timedOptions: TimedOption[]
  minutesPerSet: number
  availableSets: number
  availableQuestions: number
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customMin, setCustomMin] = useState(20)

  // A timed session holds whole question sets sized to the clock (e.g. Verbal
  // Reasoning = 2 min per 4-question set, so 10 min = 5 sets), capped at what
  // the section/category actually has.
  const setsFor = (minutes: number) =>
    Math.min(Math.max(1, availableSets), setsForMinutes(minutes, minutesPerSet))

  function base() {
    const p = new URLSearchParams()
    p.set('exam', examSlug)
    p.set('subtests', subtestId)
    if (categoryKey) p.set('tags', categoryKey)
    return p
  }
  function startTimed(minutes: number, key: string) {
    haptic(12)
    setSelected(key)
    const p = base()
    p.set('mode', 'timed')
    p.set('minutes', String(minutes))
    p.set('sets', String(setsFor(minutes)))
    router.push('/session?' + p.toString())
  }
  function startSets(n: number) {
    haptic(12)
    setSelected(`sets-${n}`)
    const p = base()
    p.set('mode', 'sets')
    p.set('sets', String(n))
    router.push('/session?' + p.toString())
  }

  const timed = timedOptions.map((o) => ({
    key: `t-${o.minutes}`,
    minutes: o.minutes,
    label: `${o.minutes} minutes`,
    // When the section is proportioned by pace, label the amount in questions;
    // otherwise fall back to the number of whole sets the clock loads.
    detail: o.questions != null ? `${Math.min(o.questions, availableQuestions)} questions` : `${setsFor(o.minutes)} question set${setsFor(o.minutes) > 1 ? 's' : ''}`,
    full: o.full,
  }))
  const setCounts = SET_COUNTS.filter((n) => n <= Math.max(1, availableSets))

  const rowCls = (active: boolean) =>
    `eb-press group flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-colors duration-200 ${
      active ? 'border-brand bg-brand-muted shadow-sm' : 'border-border bg-surface hover:border-brand/40 hover:bg-surface-muted'
    }`

  return (
    <div className="mt-8 space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Timed practice</h2>
        <p className="mb-3 text-xs text-muted">Work against the clock. The session ends when time runs out.</p>
        <div className="space-y-2.5">
          {timed.map((t, idx) => (
            <div key={t.key} className="eb-rise" style={{ animationDelay: `${idx * 45}ms` }}>
              <button onClick={() => startTimed(t.minutes, t.key)} className={rowCls(selected === t.key)}>
                <IconTile active={selected === t.key}><ClockIcon /></IconTile>
                <span className="flex-1">
                  <span className="block font-medium">{t.label}</span>
                  <span className="block text-xs text-muted">{t.detail}</span>
                </span>
                {t.full ? <span className="rounded-full bg-brand-muted px-2.5 py-0.5 text-[11px] font-medium text-brand">Full section</span> : null}
                <Arrow />
              </button>
            </div>
          ))}
          <div className="eb-rise" style={{ animationDelay: `${timed.length * 45}ms` }}>
            <button onClick={() => { haptic(8); setCustomOpen((v) => !v) }} className={rowCls(customOpen)}>
              <IconTile active={customOpen}><ClockIcon /></IconTile>
              <span className="flex-1 font-medium">Choose timing…</span>
              <span className={`text-muted transition-transform duration-300 ${customOpen ? 'rotate-90' : ''}`}><Chevron /></span>
            </button>
            {customOpen ? (
              <div className="eb-expand mt-2.5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-muted/50 px-5 py-4">
                <label className="text-sm font-medium">Minutes</label>
                <input
                  type="number" min={1} max={180} value={customMin}
                  onChange={(e) => setCustomMin(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
                  className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
                <button onClick={() => startTimed(customMin, 't-custom')} className="eb-press rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90">
                  Start →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Untimed practice</h2>
        <p className="mb-3 text-xs text-muted">Question numbers per set vary by section and topic.</p>
        {setCounts.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-5 py-4 text-sm text-muted">No question sets available here yet.</p>
        ) : (
          <div className="space-y-2.5">
            {setCounts.map((n, idx) => (
              <div key={n} className="eb-rise" style={{ animationDelay: `${idx * 45}ms` }}>
                <button onClick={() => startSets(n)} className={rowCls(selected === `sets-${n}`)}>
                  <IconTile active={selected === `sets-${n}`}><NoTimerIcon /></IconTile>
                  <span className="flex-1 font-medium">{n} question set{n > 1 ? 's' : ''}</span>
                  <Arrow />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function IconTile({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl transition-colors duration-200 ${active ? 'bg-brand text-brand-foreground' : 'bg-surface-muted text-muted group-hover:bg-brand-muted group-hover:text-brand'}`}>
      {children}
    </span>
  )
}
function Arrow() {
  return <span className="-translate-x-1 text-muted opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"><Chevron /></span>
}
function Chevron() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
}
function ClockIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
}
function NoTimerIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /><path d="m4 4 16 16" /></svg>
}
