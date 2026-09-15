import Link from 'next/link'
import { Container, PageContainer } from '@/components/container'
import { Wordmark } from '@/components/ui/wordmark'
import { Button } from '@/components/ui/button'
import { InterviewsDashboard } from '@/app/prototypes/interviews/page'
import { InterviewPracticeLobby } from '@/components/interview-practice-lobby'
import { InterviewResourcesWorkspace } from '@/components/interview-workspace-pages'
import { InterviewAttemptReview } from '@/components/interview-attempt-review'
import { MockInterviewLobby } from '@/components/interviews/mock-lobby'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { trialStations } from '@/lib/interviews/trial-stations'
import { reviewLibrary } from '@/lib/interviews/review-library'
import { StoriesPreview } from './stories-preview'

const views = ['Dashboard', 'Practice', 'Stories', 'Mocks', 'Feedback', 'Resources', 'Account', 'Loading']
export default async function LayoutConsistencyPreview({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const {view='Dashboard'}=await searchParams
  return <>
    <header className="border-b border-border bg-surface"><Container className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3"><Wordmark/><span className="text-sm text-muted">Local layout preview · illustrative data</span></Container></header>
    <Container className="flex flex-wrap gap-2 py-4"><nav className="flex flex-wrap gap-2" aria-label="Preview pages">{views.map(v=><Link key={v} href={`?view=${v}`} aria-current={view===v?'page':undefined} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${view===v?'bg-brand text-brand-foreground':'border border-border hover:bg-brand-muted'}`}>{v}</Link>)}</nav></Container>
    {view==='Dashboard'?<InterviewsDashboard embedded preview/>:view==='Practice'?<InterviewPracticeLobby stations={trialStations()}/>:view==='Stories'?<StoriesPreview/>:view==='Mocks'?<MockInterviewLobby options={[]} enabled={false} userId="layout-preview" credits={20}/>:view==='Feedback'?<InterviewAttemptReview library={reviewLibrary([],{})} query={{}} selected={null} responseCount={0} credits={20}/>:view==='Resources'?<InterviewResourcesWorkspace/>:view==='Loading'?<PageSkeleton rows={4} sidebar/>:<PageContainer><h1 className="page-title">Account</h1><p className="mt-3 text-muted">Preview of the shared account and administration layout.</p><section className="mt-8 rounded-2xl border border-border bg-surface p-6"><h2 className="font-display text-xl font-semibold">Your details</h2><div className="mt-4 max-w-lg space-y-4"><label className="block text-sm font-medium">Name<input className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3" defaultValue="Example student"/></label><Button disabled>Save changes</Button><p className="text-sm text-muted">Illustrative form. No changes are saved.</p></div></section></PageContainer>}
  </>
}
