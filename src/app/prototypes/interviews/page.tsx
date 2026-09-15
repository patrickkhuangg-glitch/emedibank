'use client'

import Link from 'next/link'
import styles from '@/components/workspace/interview-dashboard.module.css'
import { ExamHeaderBrand } from '@/components/exam-header-brand'
import { InterviewContinueCard, useInterviewContinue } from '@/components/interviews/continue-practice'
import type { ContinueAction, FeedbackToRead } from '@/lib/interviews/continue-practice'
import { Container } from '@/components/container'
import { practiceProgressPreview } from '@/lib/interviews/practice-progress-preview'
import { InterviewPracticeProgress } from '@/components/interviews/practice-progress'
import { InterviewLibraryRefresh } from '@/components/interviews/library-refresh'
import { practiceDay, suggestPractice, type PracticeProgressData } from '@/lib/interviews/practice-progress'
import { InterviewStudyNotes } from '@/components/interview-study-notes'
import { InterviewCytoCoach, type CytoNudge } from '@/components/interviews/cyto-coach'
import { InterviewProgressionDashboard } from '@/components/interviews/progression-dashboard'
import { progressionPreview, type InterviewProgressionData } from '@/lib/interviews/progression'

const noFeedback: FeedbackToRead[] = []
const previewContinue: ContinueAction = {
  kind: 'practice',
  title: 'Confidentiality and patient safety',
  description: 'Return to your unfinished question. You can prepare again and start a fresh timer.',
  label: 'Return to question',
  href: '/interviews/practice',
}
export function InterviewsDashboard({ embedded = false, preview = false, progress, progression, userId, studentName, feedback = noFeedback, shopHref }: { embedded?: boolean; preview?: boolean; progress?: PracticeProgressData; progression?: InterviewProgressionData; userId?: string; studentName?: string; feedback?: FeedbackToRead[]; shopHref?: string }) {
  const savedContinueAction = useInterviewContinue(userId, feedback)
  const continueAction = preview ? previewContinue : savedContinueAction
  const today = progress?.today ?? practiceDay(new Date())
  const data: PracticeProgressData = progress ?? (preview ? practiceProgressPreview(today) : { today, month: today.slice(0, 7), logs: [], available: true, suggestions: suggestPractice([], today), thisWeek: { count: 0, average: null, activeDays: 0 } })
  const progressionData = progression ?? progressionPreview(userId ?? 'preview-student', data.logs, today)
  const firstName = studentName?.trim().split(/\s+/)[0] || (preview ? 'Maya' : '')
  const greeting = timeAwareGreeting(new Date())
  const cytoMessages: CytoNudge[] = progressionData.daily.phase === 'complete' ? [
    { title: 'Tiny victory wiggle', body: 'Your retry is saved, including the improvement you worked on.' },
    { title: 'Cyto updated the filing cabinet', body: 'Your mastery and next review now include today’s work.' },
  ] : progressionData.daily.phase === 'retry' ? [
    { title: 'Cyto has circled your retry', body: 'Use the same scenario and focus on your Feedback Quest.' },
    { title: 'One brave little upgrade', body: 'One observable improvement is plenty for this retry.' },
  ] : progressionData.consistency.activeDays >= progressionData.consistency.goal ? [
    { title: 'Five days! Cyto can exhale', body: 'Your weekly goal is complete, and rest days keep your consistency intact.' },
    { title: 'The clipboard is officially happy', body: 'You can continue with today’s station or take a well-earned rest day.' },
  ] : data.thisWeek.count === 0 ? [
    { title: 'Cyto picked a starting point', body: 'Complete one response, review it, then retry one improvement.' },
    { title: 'Deep breath — your station is ready', body: 'Cyto has the prepared question waiting below.' },
  ] : [
    { title: `${data.thisWeek.count} ${data.thisWeek.count === 1 ? 'response' : 'responses'} this week — nice!`, body: `Cyto picked ${progressionData.daily.competencies.map(value => value.replaceAll('_', ' ')).join(' and ')} for today.` },
    { title: 'Today’s plan is on the clipboard', body: 'Your Daily Station is ready below whenever you are.' },
  ]


  return <main className={`relative z-[2] min-h-screen bg-background text-foreground ${styles.dashboard}`}>
    {!embedded ? <PreviewHeader preview={preview} /> : null}
    <Container className="page-shell">
      <section data-interview-tour="dashboard-start">
        <div className={styles.introGrid}>
          <header className={styles.intro}>
            <h1 className="page-title">{greeting}{firstName ? `, ${firstName}` : ''}.</h1>
            <p>Choose a focus or continue with today’s plan.</p>
          </header>
          <InterviewCytoCoach messages={cytoMessages} mood={data.thisWeek.count > 3 ? 'studying' : 'thinking'} />
        </div>
        <InterviewProgressionDashboard data={progressionData} shopHref={shopHref ?? (preview ? '/prototypes/workspace?exam=interviews&view=focus-shop' : undefined)} continueCard={continueAction ? <div className={styles.continueCard}><InterviewContinueCard action={continueAction} /></div> : undefined} />
      </section>

      <InterviewPracticeProgress key={data.month} data={data} showWeeklySummary={!progressionData.available} notes={<InterviewStudyNotes preview={preview} />} />
      {embedded && !preview && <InterviewLibraryRefresh message="Updating your practice history…" />}

      <section className={styles.pathGrid}><PathCard href="/interviews/practice" title="Practice" body="Rehearse MMI and panel prompts in a focused response loop." icon={<PracticeIcon />} /><PathCard href="/interviews/mock-interviews" title="Mock Interviews" body="Record a timed interview, review your video, and request marking feedback." icon={<VideoIcon />} /><PathCard href="/interviews/stories" title="Stories" body="Reflect on your own experiences and review them over time" icon={<StoryIcon />} /><PathCard href="/interviews/resources" title="Resources" body="Keep answer frameworks and interview-day preparation close." icon={<GuideIcon />} /></section>
    </Container>
  </main>
}

export default function InterviewPreviewPage() { return <InterviewsDashboard preview /> }

function timeAwareGreeting(date: Date) {
  const hour = Number(new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: 'Australia/Sydney',
  }).format(date))
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function PreviewHeader({ preview }: { preview: boolean }) { return <header className="border-b border-border bg-surface/80 backdrop-blur"><Container className="flex h-16 items-center justify-between gap-5"><ExamHeaderBrand label="Interviews" /><nav aria-label="Preview navigation" className="hidden items-center gap-1 rounded-full bg-surface-muted p-1 md:flex"><NavItem active href="/prototypes/interviews" label="Overview" /><NavItem href="/interviews/practice" label="Practice" /><NavItem href="/interviews/mock-interviews" label="Mock Interviews" /><NavItem href="/interviews/stories" label="Stories" /><NavItem href="/interviews/resources" label="Resources" /></nav>{preview ? <span className="rounded-full bg-brand-muted px-3 py-1.5 text-xs font-semibold text-brand">Preview</span> : null}</Container></header> }
function PathCard({ href, title, body, icon }: { href: string; title: string; body: string; icon: React.ReactNode }) { return <Link href={href} className={styles.pathCard}><span className={styles.pathIcon}>{icon}</span><h2>{title}</h2><p>{body}</p><span>Open {title.toLowerCase()} <ArrowIcon /></span></Link> }
function NavItem({ href, label, active = false }: { href: string; label: string; active?: boolean }) { return <Link href={href} className={`rounded-full px-3 py-2 text-sm font-medium ${active ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}>{label}</Link> }
function ArrowIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
function PracticeIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="12" height="14" rx="2" /><path d="M8 8h4M8 11h4M8 14h2" /></svg> }
function StoryIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5h12v11H7l-3 2.5v-13.5Z" /><path d="M7 8h6M7 11h4" /></svg> }
function GuideIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13H5z" /><path d="M8 7h4M8 10h4M8 13h2" /></svg> }

function VideoIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="10" height="12" rx="2" /><path d="m12 8 6-3v10l-6-3" /></svg> }
