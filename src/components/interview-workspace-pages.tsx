'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

type Format = 'mmi' | 'panel'

const FORMAT_COPY: Record<Format, { label: string; minutes: string; station: string; prompt: string; detail: string; title: string; description: string; tags: string[]; listeningFor: string[] }> = {
  mmi: {
    label: 'MMI practice guide', minutes: '5 min', station: 'Station 03',
    prompt: 'A patient with capacity declines a treatment you believe would be beneficial. How would you respond?',
    detail: 'Ethics · autonomy · communication',
    title: 'How would you respond when a patient declines treatment?',
    description: 'Use this MMI scenario to rehearse a response that balances autonomy, empathy and clear communication.',
    tags: ['Ethics', 'MMI', 'Scenario'],
    listeningFor: ['Acknowledge the patient’s right to decide', 'Explain options with empathy and clarity', 'Show the boundaries of your role'],
  },
  panel: {
    label: 'Panel practice guide', minutes: '5 min', station: 'Question 01',
    prompt: 'What has confirmed that medicine is the right path for you, and what have you learnt about the work itself?',
    detail: 'Motivation · reflection · clinical exposure',
    title: 'Why do you want to study medicine?',
    description: 'A panel question that tests your insight into the profession—not how compelling your script sounds.',
    tags: ['Motivation', 'Panel', 'Core question'],
    listeningFor: ['A specific, reflected reason', 'Evidence you understand the role', 'Values that show up in your choices'],
  },
}

export function InterviewPracticeWorkspace() {
  const [format, setFormat] = useState<Format>('mmi')
  const [highlighted, setHighlighted] = useState(false)
  const copy = FORMAT_COPY[format]

  return <WorkspaceShell title="Practise interview answers with purpose." description="Choose an MMI or panel prompt, prepare in a realistic window, then identify one thing to improve before the next attempt.">
    <div className="flex justify-end"><FormatSwitch format={format} setFormat={setFormat} /></div>
    <section className="mt-6 grid overflow-hidden rounded-3xl bg-ink text-ink-foreground eb-soft lg:grid-cols-[minmax(0,1fr)_290px]">
      <div className="flex min-h-[340px] flex-col px-6 py-7 sm:px-9 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[#d4cbea]"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-mint" /> {copy.label}</span><span className="font-mono text-xs tabular-nums">{copy.minutes}</span></div>
        <div className="mt-8 max-w-2xl"><p className="text-sm font-medium text-[#d4cbea]">{copy.station}</p><p className="mt-3 text-pretty font-display text-2xl font-medium leading-snug sm:text-3xl">{copy.prompt}</p><p className="mt-5 text-sm text-[#d4cbea]">{copy.detail}</p></div>
        <div className="mt-auto pt-8"><a href="#response-guide" className="eb-press inline-flex items-center gap-2 rounded-full bg-surface px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"><PlayIcon /> Start with the guide <ArrowIcon /></a></div>
      </div>
      <aside className="bg-white/[0.055] p-6 lg:border-l lg:border-white/10"><p className="text-sm font-medium text-[#d4cbea]">A focused practice loop</p><ol className="mt-5 space-y-4 text-sm text-[#b5acc9]"><li className="flex gap-3"><StepNumber number="1" /> Read the prompt without scripting.</li><li className="flex gap-3"><StepNumber number="2" /> Take a short preparation window.</li><li className="flex gap-3"><StepNumber number="3" /> Answer out loud, then reflect.</li></ol><p className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-[#b5acc9]">This guide does not record or assess your response.</p></aside>
    </section>
    <section id="response-guide" className="mt-7 overflow-hidden rounded-3xl border border-border bg-surface eb-soft"><div className="grid border-b border-border md:grid-cols-[1.15fr_.85fr]"><div className="p-6 sm:p-8"><h2 className="font-display text-2xl font-semibold tracking-tight">{copy.title}</h2><p className="mt-4 max-w-xl text-sm leading-6 text-muted">{copy.description}</p><div className="mt-7 flex flex-wrap gap-2">{copy.tags.map((tag) => <span key={tag} className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted">{tag}</span>)}</div></div><div className="bg-brand-muted/55 p-6 sm:p-8"><p className="text-sm font-semibold text-brand">What interviewers are listening for</p><ul className="mt-4 space-y-3 text-sm leading-5 text-foreground">{copy.listeningFor.map((item) => <li key={item} className="flex gap-3"><CheckIcon className="mt-0.5 shrink-0 text-mint-deep" /> {item}</li>)}</ul></div></div><div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8"><span className="inline-flex items-center gap-2 text-sm text-muted"><ClockIcon /> 2 min preparation · 3 min response</span><button type="button" onClick={() => setHighlighted((value) => !value)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${highlighted ? 'border-brand bg-brand-muted text-brand' : 'border-border bg-surface text-foreground hover:border-brand/40'}`}><BookmarkIcon filled={highlighted} /> {highlighted ? 'Highlighted for this session' : 'Highlight this prompt'}</button></div></section>
  </WorkspaceShell>
}

export function InterviewStoriesWorkspace() {
  const prompts = [
    ['A difficult team conversation', 'What did you notice, how did you respond, and what would you do differently?'],
    ['A community or service experience', 'What did it reveal about access, equity or the people around you?'],
    ['A lesson from caring for someone', 'How did it shape your understanding of boundaries, empathy or responsibility?'],
    ['A moment you changed your mind', 'What new information changed your perspective and why?'],
  ] as const
  return <WorkspaceShell title="Build a bank of stories worth telling." description="Strong answers draw on real experiences. Use these prompts to find the moments that show reflection, not rehearsed slogans.">
    <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_330px]"><div className="space-y-3">{prompts.map(([title, body]) => <article key={title} className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-brand/40"><div className="flex items-start gap-4"><span className="mt-0.5 text-brand"><StoryIcon /></span><div><h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">{body}</p></div></div></article>)}</div><aside className="h-fit rounded-3xl bg-ink p-6 text-ink-foreground eb-soft"><h2 className="font-display text-2xl font-semibold tracking-tight">A useful story has a shape.</h2><div className="mt-6 space-y-5 text-sm leading-6 text-[#d4cbea]"><p><b className="text-white">Context</b><br />Set the scene quickly.</p><p><b className="text-white">Choice</b><br />Explain what you did and why.</p><p><b className="text-white">Reflection</b><br />Show what you learnt and how it matters now.</p></div><p className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-[#b5acc9]">Saving personal examples will be added when the story-bank workspace is connected.</p></aside></section>
  </WorkspaceShell>
}

export function InterviewResourcesWorkspace() {
  const resources = [
    ['MMI response guide', 'A calm way to frame ethical and communication scenarios.', <GuideIcon key="guide" />],
    ['Panel answer structure', 'Turn your experience into a clear, reflected answer.', <SpeechIcon key="speech" />],
    ['Australian interview checklist', 'Format, timing and setup points to confirm before the day.', <ChecklistIcon key="checklist" />],
  ] as const
  return <WorkspaceShell title="Resources for your next session." description="Use a framework when it helps, then return to the prompt and make the answer your own.">
    <section className="grid gap-5 md:grid-cols-3">{resources.map(([title, body, icon]) => <article key={title} className="rounded-3xl border border-border bg-surface p-6 eb-soft"><span className="text-brand">{icon}</span><h2 className="mt-8 font-display text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-3 text-sm leading-6 text-muted">{body}</p><a href="#resource-note" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-brand">Open guide <ArrowIcon /></a></article>)}</section>
    <section id="resource-note" className="mt-7 rounded-3xl bg-surface-muted p-6 sm:p-8"><h2 className="font-display text-2xl font-semibold tracking-tight">A quick reminder before you practise</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Interview frameworks should make your thinking clearer, not turn every answer into the same script. Keep your examples specific and your reflection honest.</p><Link href="/interviews/practice" className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground">Go to practice <ArrowIcon /></Link></section>
  </WorkspaceShell>
}

function WorkspaceShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="min-h-screen bg-background pb-16 text-foreground"><div className="mx-auto max-w-[1240px] px-5 pt-10 sm:px-8 sm:pt-14"><header className="max-w-3xl"><h1 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl">{title}</h1><p className="mt-4 text-base leading-7 text-muted sm:text-lg">{description}</p></header><div className="mt-9">{children}</div></div></main>
}

function FormatSwitch({ format, setFormat }: { format: Format; setFormat: (format: Format) => void }) { return <div className="flex w-fit rounded-full bg-surface-muted p-1" role="group" aria-label="Interview format">{(['mmi', 'panel'] as const).map((item) => <button type="button" key={item} onClick={() => setFormat(item)} className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${format === item ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}>{item === 'mmi' ? 'MMI practice' : 'Panel practice'}</button>)}</div> }
function StepNumber({ number }: { number: string }) { return <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/20 font-mono text-xs text-white">{number}</span> }
function ArrowIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
function PlayIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="m6.5 4 8 6-8 6V4Z" /></svg> }
function CheckIcon({ className = '' }: { className?: string }) { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className={`h-4 w-4 ${className}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 10 3.5 3.5L16 5.5" /></svg> }
function ClockIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></svg> }
function BookmarkIcon({ filled }: { filled: boolean }) { return <svg aria-hidden viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} className="h-4 w-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13l-5-3-5 3v-13Z" /></svg> }
function StoryIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5h12v11H7l-3 2.5v-13.5Z" /><path d="M7 8h6M7 11h4" /></svg> }
function GuideIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13H5z" /><path d="M8 7h4M8 10h4M8 13h2" /></svg> }
function SpeechIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 4.5h13v9h-8l-3.5 3v-12Z" /><path d="M7 8h6M7 10.5h4" /></svg> }
function ChecklistIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13H5z" /><path d="m7 8 1 1 2-2M11 8h2M7 12l1 1 2-2M11 12h2" /></svg> }
