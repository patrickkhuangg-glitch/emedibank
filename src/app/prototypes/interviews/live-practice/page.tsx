import { LivePracticeEntry } from '@/components/interviews/live-practice-entry'
import { INTERVIEW_STATIONS } from '@/lib/interviews/stations'

export default function LivePracticePrototypePage() {
  return <LivePracticeEntry initialCode="" recent={[]} stations={INTERVIEW_STATIONS.slice(0, 14).map(item => ({ id: item.id, format: item.format, title: item.title, category: item.category, preparation: item.format === 'panel' ? item.preparation : '', questions: item.questions }))} />
}
