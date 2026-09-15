import { buildTimelineScale, TIMELINE_LABEL_WIDTH, type TimelineEvent } from '@/lib/study-plans/timeline'

export function StudyPlanTimeline({ events, now }: { events: TimelineEvent[]; now: Date }) {
  const scale = buildTimelineScale(events, now)
  return <section className="mt-8 overflow-hidden rounded-3xl bg-ink text-white eb-soft" aria-labelledby="study-timeline-title">
    <header className="border-b border-white/10 px-6 py-5 sm:px-8">
      <h2 id="study-timeline-title" className="font-display text-2xl font-semibold tracking-tight">Your preparation timeline</h2>
      <p className="mt-1 text-sm text-white/65">The next three months, through {scale.endLabel}.</p>
    </header>
    {scale.events.length || scale.laterEvents.length ? <>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_auto]">
      <div role="region" aria-label="Timeline with month scale. Scroll horizontally for later dates." tabIndex={0} className="min-w-0 overflow-x-auto px-6 py-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mint sm:px-8">
        <div style={{ minWidth: scale.width + TIMELINE_LABEL_WIDTH }}>
          <div className="relative" style={{ width: `calc(100% - ${TIMELINE_LABEL_WIDTH}px)` }}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {scale.months.map(month => <div key={month.day} className="absolute bottom-0 top-10 border-l border-white/10" style={{ left: `${month.position}%` }} />)}
              <div className="absolute bottom-0 top-10 border-l border-dashed border-mint/50" style={{ left: `${scale.todayPosition}%` }} />
            </div>
            <div className="relative h-12 border-b border-white/25" aria-label="Months">
              {scale.months.map(month => <span key={month.day} className="absolute top-0 whitespace-nowrap text-sm font-semibold text-white/75" style={{ left: `${month.position}%` }}>{month.label}</span>)}
            </div>
            <div className="relative h-14">
              <div className="absolute top-0" style={{ left: `${scale.todayPosition}%` }}>
                <span aria-hidden="true" className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-mint" />
                <p className="mt-3 whitespace-nowrap text-xs font-semibold text-mint">Today · {scale.todayLabel}</p>
              </div>
            </div>
            {scale.events.length === 0 && <p className="relative pb-6 text-sm text-white/65">No lessons or exams in the next three months.</p>}
            <ol className="relative grid grid-cols-1 gap-y-6 pb-3">
              {scale.events.map(event => <li key={event.id} className="relative pl-4" style={{ gridColumn: 1, gridRow: event.row + 1, marginLeft: `${event.position}%`, width: TIMELINE_LABEL_WIDTH }}>
                <span aria-hidden="true" className={`absolute left-0 top-1 h-2 w-2 -translate-x-1/2 rounded-full ${event.kind === 'exam' ? 'bg-white' : 'bg-mint'}`} />
                <time dateTime={event.date} className="text-xs tabular-nums text-white/70">{event.label}</time>
                <p className="mt-2 break-words font-display text-base font-semibold leading-snug">{event.title}</p>
                <p className="mt-1 text-xs text-white/65">{event.detail}</p>
              </li>)}
            </ol>
          </div>
        </div>
      </div>
      {scale.laterEvents.length > 0 && <aside className="border-t border-white/10 px-6 py-6 lg:w-64 lg:border-l lg:border-t-0" aria-label="Later dates and bookings">
        <h3 className="font-display text-lg font-semibold">Later dates</h3>
        <p className="mt-1 text-xs text-white/65">After {scale.endLabel}</p>
        <ol className="mt-5 divide-y divide-white/10">
          {scale.laterEvents.map(event => <li key={event.id} className="py-4 first:pt-0 last:pb-0">
            <time dateTime={event.date} className="text-xs tabular-nums text-mint">{event.label}</time>
            <p className="mt-1 break-words text-sm font-semibold">{event.title}</p>
            <p className="mt-1 text-xs text-white/65">{event.detail}</p>
          </li>)}
        </ol>
      </aside>}
      </div>
      <p className="border-t border-white/10 px-6 py-3 text-xs text-white/65 sm:px-8">Scroll across the three-month timeline. All dates use Sydney time.</p>
    </> : <div className="px-6 py-10 sm:px-8"><p className="max-w-xl font-display text-2xl font-semibold tracking-tight">Start by adding an exam date.</p><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Your plan will then arrange each lesson and milestone in the order it is coming up.</p></div>}
  </section>
}
