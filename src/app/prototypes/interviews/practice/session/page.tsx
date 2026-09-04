import { InterviewPracticeRunner } from '@/components/interview-practice-runner'
import { getInterviewStation } from '@/lib/interviews/stations'

export default function InterviewPracticeSessionPrototypePage() {
  const station = getInterviewStation('panel', 'panel-motivation')
  if (!station) return null
  return <InterviewPracticeRunner station={station} />
}
