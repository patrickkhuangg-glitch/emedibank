'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Container } from '@/components/container'
import { practiceProgressPreview } from '@/lib/interviews/practice-progress-preview'
import { InterviewPracticeProgress } from '@/components/interviews/practice-progress'
import { InterviewLibraryRefresh } from '@/components/interviews/library-refresh'
import { practiceDay, suggestPractice, type PracticeProgressData } from '@/lib/interviews/practice-progress'
import { InterviewStudyNotes } from '@/components/interview-study-notes'

export function InterviewsDashboard({ embedded = false, preview = false, progress }: { embedded?: boolean; preview?: boolean; progress?: PracticeProgressData }) {
  const [noteCount, setNoteCount] = useState(0)
  const today = progress?.today ?? practiceDay(new Date())
  const data: PracticeProgressData = progress ?? (preview ? practiceProgressPreview(today) : { today, month: today.slice(0, 7), logs: [], available: true, suggestions: suggestPractice([], today), thisWeek: { count: 0, average: null, activeDays: 0 } })
  const next = data.suggestions[0]


  return <main className="relative z-[2] min-h-screen bg-background pb-16 text-foreground">
    {!embedded ? <PreviewHeader preview={preview} /> : null}
    <Container className="pt-9 sm:pt-12">
      <section data-interview-tour="dashboard-start" className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div>
          <h1 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-6xl">Your interview dashboard.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">See your interview preparation at a glance, choose a focused next step and keep the reflection that will sharpen your next answer.</p>
          {preview ? <span className="mt-5 inline-flex rounded-full bg-brand-muted px-3 py-1.5 text-xs font-semibold text-brand">Illustrative preview</span> : null}
          <section className="mt-8 grid overflow-hidden rounded-3xl bg-ink text-ink-foreground eb-soft lg:grid-cols-2">
            <div className="flex min-h-[278px] flex-col px-6 py-7 sm:px-9 sm:py-8"><div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[#d4cbea]"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-mint" /> Your next focused session</span><span className="font-mono text-xs tabular-nums">{next?.format === 'panel' ? '3 min response' : '8 min response'}</span></div><div className="mt-7 max-w-2xl"><p className="text-sm font-medium text-[#d4cbea]">{next?.theme ?? 'Choose a question'}</p><p className="mt-3 text-pretty font-display text-2xl font-medium leading-snug sm:text-3xl">{next?.title ?? 'Choose an MMI or panel prompt, then practise your response out loud.'}</p><p className="mt-4 text-sm text-[#d4cbea]">{next?.reason ?? 'Open practice to choose your next response.'}</p></div><div className="mt-auto pt-7"><Link href={next?.href ?? '/interviews/practice'} className="eb-press inline-flex items-center gap-2 rounded-full bg-surface px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5">Open practice <ArrowIcon /></Link></div></div>
            <aside className="bg-white/[0.055] p-6 lg:border-l lg:border-white/10"><p className="text-sm font-medium text-[#d4cbea]">Your practice summary</p><dl className="mt-5 space-y-4"><SummaryRow value={data.available ? String(data.thisWeek.count) : '—'} label="practised this week" /><SummaryRow value={data.available && data.thisWeek.average !== null ? `${data.thisWeek.average.toFixed(1)}/5` : '—'} label="average self-rating this week" /><SummaryRow value={String(noteCount)} label="reflection notes" /></dl><p className="mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-[#b5acc9]">Completed rehearsals and saved mock responses count toward your practice. Ratings are your own reflections.</p></aside>
          </section>
        </div>
        <ReadinessPanel suggestions={data.suggestions} available={data.available} />
      </section>

      <InterviewPracticeProgress key={data.month} data={data} notes={<InterviewStudyNotes preview={preview} onNoteCountChange={setNoteCount} />} />
      {embedded && <InterviewLibraryRefresh message="Updating your practice history…" />}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><PathCard href="/interviews/practice" title="Practice" body="Rehearse MMI and panel prompts in a focused response loop." icon={<PracticeIcon />} /><PathCard href="/interviews/mock-interviews" title="Mock Interviews" body="Record a timed interview, review your video, and request marking feedback." icon={<VideoIcon />} /><PathCard href="/interviews/stories" title="Stories" body="Find real experiences that show reflection, not a script." icon={<StoryIcon />} /><PathCard href="/interviews/resources" title="Resources" body="Keep answer frameworks and interview-day preparation close." icon={<GuideIcon />} /></section>
    </Container>
  </main>
}

export default function InterviewPreviewPage() { return <InterviewsDashboard preview /> }

function PreviewHeader({ preview }: { preview: boolean }) { return <header className="border-b border-border bg-surface/80 backdrop-blur"><Container className="flex h-16 items-center justify-between gap-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-sm font-bold text-white">S</span><span className="font-display text-xl font-semibold tracking-tight">Studocyte</span><span className="hidden h-5 w-px bg-border sm:block" /><span className="hidden text-sm font-medium text-muted sm:block">Interviews</span></div><nav aria-label="Preview navigation" className="hidden items-center gap-1 rounded-full bg-surface-muted p-1 md:flex"><NavItem active href="/prototypes/interviews" label="Overview" /><NavItem href="/interviews/practice" label="Practice" /><NavItem href="/interviews/mock-interviews" label="Mock Interviews" /><NavItem href="/interviews/stories" label="Stories" /><NavItem href="/interviews/resources" label="Resources" /></nav>{preview ? <span className="rounded-full bg-brand-muted px-3 py-1.5 text-xs font-semibold text-brand">Preview</span> : null}</Container></header> }
function ReadinessPanel({ suggestions, available }: { suggestions: PracticeProgressData['suggestions']; available: boolean }) {
  return <aside className="rounded-3xl border border-border bg-surface p-6 eb-soft"><h2 className="font-display text-xl font-semibold tracking-tight">What to practise next</h2><p className="mt-2 text-sm leading-6 text-muted">A balanced next step from your past 28 days of practice and self-ratings.</p>{available ? <ol className="mt-5 divide-y divide-border">{suggestions.map(suggestion => <li key={suggestion.theme} className="py-4"><Link href={suggestion.href} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">Practise {suggestion.theme.toLowerCase()} <ArrowIcon /></Link><p className="mt-1 text-sm leading-6 text-muted">{suggestion.reason}</p></li>)}</ol> : <p className="mt-6 text-sm leading-6 text-muted">Suggestions will return when your practice history is available.</p>}<p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted">Suggestions balance less-practised themes with lower self-ratings. They are a practice guide, not an assessment of exam readiness.</p></aside>
}
function PathCard({ href, title, body, icon }: { href: string; title: string; body: string; icon: React.ReactNode }) { return <Link href={href} className="group rounded-3xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm"><span className="text-brand">{icon}</span><h2 className="mt-6 font-display text-xl font-semibold tracking-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{body}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand">Open {title.toLowerCase()} <ArrowIcon /></span></Link> }
function SummaryRow({ value, label }: { value: string; label: string }) { return <div><dt className="font-mono text-2xl font-medium text-white tabular-nums">{value}</dt><dd className="mt-0.5 text-xs text-[#b5acc9]">{label}</dd></div> }
function NavItem({ href, label, active = false }: { href: string; label: string; active?: boolean }) { return <Link href={href} className={`rounded-full px-3 py-2 text-sm font-medium ${active ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}>{label}</Link> }
function ArrowIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
function PracticeIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="12" height="14" rx="2" /><path d="M8 8h4M8 11h4M8 14h2" /></svg> }
function StoryIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5h12v11H7l-3 2.5v-13.5Z" /><path d="M7 8h6M7 11h4" /></svg> }
function GuideIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13H5z" /><path d="M8 7h4M8 10h4M8 13h2" /></svg> }

function VideoIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="10" height="12" rx="2" /><path d="m12 8 6-3v10l-6-3" /></svg> }
