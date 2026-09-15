import Link from 'next/link'
import { InterviewPrompt, InterviewTimerBar } from '@/components/interviews/question-display'
import { INTERVIEW_STATIONS } from '@/lib/interviews/stations'
import { practiceButtonSecondary } from '@/components/interviews/practice-buttons'

export default async function QuestionDisplayPreview({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = 'response' } = await searchParams
  const station = INTERVIEW_STATIONS.find(s => s.format === 'mmi')!
  const panel = INTERVIEW_STATIONS.find(s => s.format === 'panel')!
  const preparation = view === 'preparation', isPanel = view === 'panel'
  return <main className="mx-auto max-w-4xl space-y-6 px-5 py-10 sm:px-8">
    <nav aria-label="Question layout previews" className="flex flex-wrap gap-2">
      <Link href="/prototypes/interviews/practice" className={practiceButtonSecondary}>Practice preview</Link>
      {['preparation', 'response', 'panel'].map(item => <Link key={item} href={`?view=${item}`} aria-current={item === view ? 'page' : undefined} className={`${practiceButtonSecondary} aria-[current=page]:bg-brand-muted aria-[current=page]:text-brand`}>{item === 'preparation' ? 'MMI reading' : item === 'response' ? 'MMI question' : 'Panel question'}</Link>)}
    </nav>
    <h1 className="text-balance font-display text-3xl font-semibold leading-tight sm:text-4xl">{isPanel ? 'Full panel interview' : station.title}</h1>
    <p className="text-sm text-muted">Layout preview · example timer, no recording</p>
    <InterviewTimerBar label={isPanel ? 'Question 1 of 10 · Recording' : preparation ? 'Station 1 of 8 · Timed reading' : 'Station 1 of 8 · Recording'} seconds={preparation ? 120 : isPanel ? 120 : 480} />
    <InterviewPrompt preparation={preparation} text={isPanel ? panel.questions[0] : preparation ? station.preparation : station.questions[0]} questionNumber={1} questionCount={isPanel ? 10 : station.questions.length} scenario={isPanel ? undefined : station.preparation} />
  </main>
}
