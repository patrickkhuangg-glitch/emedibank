import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { ExamPicker } from '@/app/(app)/app/exam-picker'
import { SiteNav } from '@/components/site-nav'

export default function EntryPreview() {
  return <WorkspaceFrame preview welcomeOnEntry name="Maya" navigation={<SiteNav workspace role="student" currentExamSlug={null}/>} examSwitcher={<span className="text-sm font-semibold text-muted">Choose your exam</span>}>
    <ExamPicker preview first="Maya" exams={['ucat','gamsat','isat','interviews'].map(slug => ({id:slug,slug,name:slug === 'interviews' ? 'Interviews' : slug.toUpperCase(),kind:slug === 'interviews' ? 'interview' : 'mcq',entitled:false}))}/>
  </WorkspaceFrame>
}
