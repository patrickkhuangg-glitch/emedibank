import { trialStations } from '@/lib/interviews/trial-stations'
import { InterviewPracticeLobby } from '@/components/interview-practice-lobby'

export default function InterviewPracticePrototypePage() {
  return <InterviewPracticeLobby stations={trialStations()} />
}
