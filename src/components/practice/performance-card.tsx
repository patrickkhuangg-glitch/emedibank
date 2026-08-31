import type { SectionStat } from '@/lib/practice/stats'

/**
 * Sidebar performance chart — per-section accuracy, your score against the pooled
 * platform average. Mirrors the layout of the reference practice dashboard in the
 * Studocyte brand (violet = you, muted ink = the cohort).
 */
export function PerformanceCard({ stats }: { stats: SectionStat[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Performance</h2>
        <div className="flex flex-wrap justify-end gap-1.5 text-xs">
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-muted">All time</span>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-muted">All sections</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">Your accuracy against the Studocyte average.</p>

      <div className="mt-5 space-y-4">
        {stats.map((s, idx) => (
          <div key={s.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">{s.name}</span>
              <span className="tabular-nums text-xs text-muted">
                {s.yourPct === null ? 'Not started' : `${s.yourPct}%`}
              </span>
            </div>
            <Bar value={s.yourPct} tone="you" delay={idx * 80} />
            <div className="mt-1" />
            <Bar value={s.avgPct} tone="avg" delay={idx * 80 + 40} />
          </div>
        ))}
      </div>

      {/* axis */}
      <div className="mt-3 flex justify-between text-[10px] tabular-nums text-muted">
        <span>0%</span>
        <span>100%</span>
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Your score
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[color:var(--muted)]/40" /> Avg. Studocyte student
        </span>
      </div>
    </section>
  )
}

function Bar({ value, tone, delay }: { value: number | null; tone: 'you' | 'avg'; delay: number }) {
  const pct = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className={`eb-bar h-full rounded-full ${tone === 'you' ? 'bg-brand' : 'bg-[color:var(--muted)]/40'}`}
        style={{ width: `${pct}%`, animationDelay: `${delay}ms` }}
      />
    </div>
  )
}
