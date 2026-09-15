import Link from 'next/link'
import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { StudyDashboard } from '@/components/workspace/study-dashboard'
import { PracticeLibrary } from '@/components/workspace/practice-library'
import { PerformanceCard } from '@/components/practice/performance-card'
import { PracticeTabs } from '@/app/(app)/practice/[examSlug]/practice-tabs'
import { InterviewsDashboard } from '@/app/prototypes/interviews/page'
import { InterviewPracticeLobby } from '@/components/interview-practice-lobby'
import { InterviewResourcesWorkspace } from '@/components/interview-workspace-pages'
import { trialStations } from '@/lib/interviews/trial-stations'
import { StoriesPreview } from '@/app/prototypes/layout-consistency/stories-preview'
import { mocksForExam } from '@/lib/mock/config'
import { dashboardActivity } from '@/lib/dashboard/activity'
import { isEssaySection } from '@/lib/essays/config'
import type { Dashboard } from '@/lib/dashboard/stats'
import { FocusTokenShop } from '@/components/interviews/focus-token-shop'

const catalog: Record<string, [string,string][]> = {
  ucat: [['Verbal Reasoning','verbal-reasoning'],['Decision Making','decision-making'],['Quantitative Reasoning','quantitative-reasoning'],['Situational Judgement','situational-judgement']],
  gamsat: [['Reasoning in Humanities','humanities-and-social-sciences'],['Written Communication','written-communication'],['Reasoning in Sciences','biological-and-physical-sciences']],
  isat: [['Critical Reasoning','critical-reasoning'],['Quantitative Reasoning','quantitative-reasoning']],
}
export default async function WorkspacePreview({ searchParams }: { searchParams: Promise<{ exam?: string; view?: string; section?: string; state?: string }> }) {
  const query = await searchParams
  const exam = ['ucat','gamsat','isat','interviews'].includes(query.exam ?? '') ? query.exam! : 'ucat'
  const view = query.view ?? 'dashboard', empty = query.state === 'empty'
  const names = catalog[exam] ?? catalog.ucat
  const name = exam === 'interviews' ? 'Interviews' : exam.toUpperCase()
  const sections = names.map(([name,slug],i) => ({id: slug,name,slug,xp: empty ? 0 : 240 + i * 450,level: empty ? 1 : i + 3,into: empty ? 0 : .38,attempted: empty ? 0 : [86,124,92,64][i],correct: empty ? 0 : [43,92,77,49][i],accuracy: empty ? null : [50,74,84,77][i],avgSeconds: empty ? null : 34,streak: empty ? 0 : 3}))
  for (const section of sections) {
    if (isEssaySection(exam, section.slug)) { section.attempted = 0; section.correct = 0; section.accuracy = null; section.avgSeconds = null }
  }
  const attempted = sections.reduce((n,s) => n+s.attempted, 0)
  const correct = sections.reduce((n,s) => n+s.correct, 0)
  const data: Dashboard = {hasData: !empty,totalXp: empty ? 0 : 3240,level: empty ? 1 : 8,into: empty ? 0 : .55,toNext: empty ? 100 : 360,attempted,correct,accuracy: attempted ? Math.round(correct / attempted * 100) : null,dailyStreak: empty ? 0 : 6,practisedToday: !empty,sections,heatmap: empty ? [] : [{tag:'Inference',section:names[0][0],count:24,accuracy:50,avgSeconds:42},{tag:'Drawing conclusions',section:names[0][0],count:18,accuracy:67,avgSeconds:32}],mastery: empty ? [] : [{name:names[0][0],nodes:[{tag:'Inference',state:'learning',accuracy:50,count:24},{tag:'Reasoning',state:'mastered',accuracy:84,count:25}]}],predicted:{band:'—',label:''},reviewDue: empty ? [] : Array.from({length:8},(_,i)=>({questionId:`example-${i}`,section:names[i % names.length][0],tag:['Inference','Drawing conclusions','Interpreting information'][i%3],daysAgo:2})),reviewUpcoming:0}
  const previewNow = new Date('2026-09-10T12:00:00Z')
  data.activity = dashboardActivity(empty ? [] : [0,18,24,8,16,22,12].flatMap((count,index) => Array.from({length:count}, () => new Date(previewNow.getTime()-(6-index)*86400000).toISOString())), previewNow)
  data.mastery = empty ? [] : [{name:names[0][0],nodes:[
    {tag:'Inference',state:'learning',accuracy:50,count:24},
    {tag:'Drawing conclusions',state:'mastered',accuracy:84,count:25},
    {tag:'Interpreting information',state:'learning',accuracy:67,count:18},
    {tag:'Evaluating arguments',state:'locked',accuracy:null,count:0},
  ]}]
  const stats = sections.map(s => ({id:s.id,name:s.name,slug:s.slug,total:840,attempted:s.attempted,yourPct:s.accuracy,avgPct:68}))
  const url = (v: string) => `/prototypes/workspace?exam=${exam}&view=${v}${empty ? '&state=empty' : ''}`
  const nav = [['dashboard','Dashboard','▦'],['practice','Practice','▤'],['mock',exam === 'interviews' ? 'Mock interviews' : 'Mock exams','▣'],...(exam==='interviews' ? [['stories','Stories','▧'],['resources','Resources','▥']] : []),['study-plan','Study plan','☷'],...(exam==='interviews' ? [['focus-shop','Focus Token Shop','⊕']] : []),['account','Account','○']]
  return <WorkspaceFrame preview name="Maya" navigation={<nav aria-label="Preview navigation">{nav.map(([v,label,icon])=><Link key={v} href={url(v)} aria-current={view === v || (view === 'section' && v === 'practice') ? 'page' : undefined}><span aria-hidden>{icon}</span>{label}</Link>)}</nav>} examSwitcher={<div className="flex flex-wrap items-center gap-1" role="group" aria-label="Preview exam">{['ucat','gamsat','isat','interviews'].map(e=><Link key={e} href={`/prototypes/workspace?exam=${e}&view=dashboard${query.state==='free' ? '&state=free' : ''}`} aria-current={exam===e?'page':undefined} className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${exam===e?'bg-white text-brand shadow-sm':'text-muted'}`}>{e === 'interviews' ? 'Interviews' : e.toUpperCase()}</Link>)}</div>}>
    {view === 'dashboard' ? exam === 'interviews' ? <InterviewsDashboard embedded preview shopHref={url('focus-shop')} /> : <><StudyDashboard first="Maya" exam={{slug:exam,name}} data={data} access={sections.map((s,i)=>({id:s.id,name:s.name,slug:s.slug,isFree:query.state==='free' ? i===0 : true,locked:query.state==='free' && i>0}))} preview/><div className="page-frame pb-6 text-xs text-muted"><Link href={`${url('dashboard')}${empty ? '' : '&state=empty'}`}>{empty ? 'Empty state shown' : 'View first-time student state'}</Link>{empty && <Link className="ml-4" href={`/prototypes/workspace?exam=${exam}`}>Show example progress</Link>}</div></> :
    view==='focus-shop' && exam==='interviews' ? <FocusTokenShop balance={3} preview /> :
    view==='practice' ? exam==='interviews' ? <InterviewPracticeLobby stations={trialStations()} /> : <div className="page-frame page-shell"><div className="grid gap-8 lg:grid-cols-[1fr_360px]"><div><p className="text-xs text-muted">{name} · Practice</p><h1 className="page-title mt-2">Practice questions</h1><p className="mt-3 text-sm text-muted">Choose a focus. Make a little progress.</p><PracticeTabs historyCount={empty ? 0 : 2} newSession={<PracticeLibrary examSlug={exam} stats={stats} entitled preview/>} history={<div className="rounded-2xl border border-border bg-surface p-5"><h2 className="text-sm font-semibold">Recent sessions</h2><p className="mt-3 text-sm text-muted">{empty ? 'Your completed sessions will appear here.' : 'Example history · Verbal Reasoning, 14/20 · Decision Making, 18/24'}</p><p className="mt-2 text-xs text-muted">Preview data. No student records are shown.</p></div>}/></div><aside className="lg:self-start"><PerformanceCard stats={stats}/></aside></div></div> :
    view==='stories' ? <StoriesPreview/> : view==='resources' ? <InterviewResourcesWorkspace/> :
    <div className="page-frame page-shell"><p className="text-xs text-muted">{name} · {view === 'mock' ? 'Mock exams' : 'Your workspace'}</p><h1 className="page-title mt-2">{view==='mock' ? 'Practice exams' : view==='section' ? (sections.find(s=>s.slug===query.section)?.name ?? 'Choose your practice') : view==='account' ? 'Your account' : 'Your study plan'}</h1>
      {view==='mock' ? <><p className="mt-3 text-sm text-muted">Give yourself a test-day rehearsal.</p><section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">{(mocksForExam(exam).length ? mocksForExam(exam).slice(0,4).map(m=>({name:m.name,detail:`${m.sections.length} sections · ${m.sections.reduce((n,s)=>n+s.count,0)} questions`})) : [{name:exam==='interviews'?'MMI circuit':'Full practice exam',detail:'Timed practice and review'}]).map(m=><div key={m.name} className="flex items-center justify-between gap-4 border-b border-border p-5 last:border-0"><div><h2 className="text-sm font-semibold">{m.name}</h2><p className="mt-1 text-xs text-muted">{m.detail}</p></div><span className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">Preview</span></div>)}</section><p className="mt-4 text-xs text-muted">Exam launches are disabled in this design preview.</p></> :
      view==='section' ? <><p className="mt-3 text-sm text-muted">Choose a topic and set your pace.</p><section className="mt-6 rounded-2xl border border-border bg-surface p-5"><h2 className="text-sm font-semibold">Preview of session setup</h2><p className="mt-3 text-sm text-muted">The live workspace keeps your existing topic selection, timing controls and exam interface.</p><Link className="mt-4 inline-flex text-sm font-semibold text-brand" href={url('practice')}>← Back to practice</Link></section></> :
      view==='account' ? <section className="mt-6 rounded-2xl border border-border bg-surface p-6"><h2 className="text-base font-semibold">Profile</h2><label className="mt-4 block max-w-md text-sm">Name<input className="mt-2 block w-full rounded-lg border border-border p-3" defaultValue="Maya"/></label><p className="mt-4 text-xs text-muted">Illustrative account. Changes are not saved.</p></section> : <section className="mt-6 rounded-2xl border border-border bg-surface p-6"><h2 className="text-base font-semibold">Make room for your next session.</h2><p className="mt-2 text-sm text-muted">Your assigned study plan and tutoring sessions appear here in the live workspace.</p><Link className="mt-4 inline-flex text-sm text-brand" href={url('practice')}>Open practice →</Link></section>}
    </div>}
  </WorkspaceFrame>
}
