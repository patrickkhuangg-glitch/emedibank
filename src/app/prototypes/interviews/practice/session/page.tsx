import { InterviewPracticeRunner } from '@/components/interview-practice-runner'
import { getInterviewStation } from '@/lib/interviews/stations'

export default function InterviewPracticeSessionPrototypePage() {
  return <InterviewPracticeRunner station={getInterviewStation('mmi', 'mmi-patient-autonomy')} />
}
