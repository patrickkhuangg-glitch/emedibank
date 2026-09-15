import { StudyPlanTimeline } from '@/components/study-plan-timeline'
import type { TimelineEvent } from '@/lib/study-plans/timeline'

const events: TimelineEvent[] = [
  { id: '1', kind: 'lesson', title: 'MMI practice with your tutor', detail: 'Tutoring lesson', date: '2026-09-10T05:00:00Z' },
  { id: '2', kind: 'lesson', title: 'Panel interview preparation', detail: 'Tutoring lesson', date: '2026-09-12T05:00:00Z' },
  { id: '3', kind: 'exam', title: 'University interview', detail: 'Exam day', date: '2026-10-16' },
  { id: '4', kind: 'lesson', title: 'GAMSAT Section II review', detail: 'Tutoring lesson', date: '2026-11-02T05:00:00Z' },
  { id: '5', kind: 'exam', title: 'GAMSAT', detail: 'Exam day', date: '2027-03-12' },
]
export default function TimelinePreview() {
  return <main className="mx-auto w-full min-w-0 max-w-7xl px-5 py-10 sm:px-8">
    <h1 className="font-display text-3xl font-semibold">Study-plan timeline</h1>
    <p className="mt-2 text-muted">Layout preview with example dates.</p>
    <StudyPlanTimeline events={events} now={new Date('2026-09-08T02:00:00Z')} />
  </main>
}
