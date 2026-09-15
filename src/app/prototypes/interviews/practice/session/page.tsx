import { SiteNav } from '@/components/site-nav'
import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { InterviewInteractionLayer } from '@/components/interviews/interaction-layer'
import { InterviewRehearsalRunner } from '@/components/interviews/rehearsal-runner'
import { trialStations } from '@/lib/interviews/trial-stations'

export default function InterviewPracticeSessionPrototypePage() {
  const station = trialStations().find(s=>s.format==='panel')
  if (!station) return null
  return <InterviewInteractionLayer><WorkspaceFrame
    preview
    name="Maya"
    navigation={<SiteNav workspace role="student" currentExamSlug="interviews" />}
    examSwitcher={<span className="text-sm font-semibold text-muted">Interviews</span>}
  >
    <InterviewRehearsalRunner station={station} allowUntracked />
  </WorkspaceFrame></InterviewInteractionLayer>
}
