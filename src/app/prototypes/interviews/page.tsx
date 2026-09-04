'use client'

import { useState } from 'react'

type Format = 'mmi' | 'panel'

const FORMAT_COPY: Record<Format, { title: string; description: string; action: string; label: string; minutes: string; station: string; prompt: string; detail: string }> = {
  mmi: {
    title: 'Your interview practice, made personal.',
    description: 'Build the calm, evidence-led answers Australian medical and dental schools look for.',
    action: 'Start a 7-station circuit',
    label: 'MMI circuit',
    minutes: '56 min',
    station: 'Station 03',
    prompt: 'A patient with capacity declines a treatment you believe would be beneficial. How would you respond?',
    detail: 'Ethics · autonomy · communication',
  },
  panel: {
    title: 'Practise the conversation, not a script.',
    description: 'Prepare for Australian panel interviews with questions that draw out your own experiences and judgement.',
    action: 'Start a panel rehearsal',
    label: 'Panel rehearsal',
    minutes: '18 min',
    station: 'Question 01',
    prompt: 'What has confirmed that medicine is the right path for you, and what have you learnt about the work itself?',
    detail: 'Motivation · reflection · clinical exposure',
  },
}

export default function InterviewPreviewPage() {
  const [format, setFormat] = useState<Format>('mmi')
  const [saved, setSaved] = useState(false)
  const copy = FORMAT_COPY[format]

  return (
    <main className="relative z-[2] min-h-screen bg-background pb-16 text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-sm font-bold text-white">S</span>
            <span className="font-display text-xl font-semibold tracking-tight">Studocyte</span>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <span className="hidden text-sm font-medium text-muted sm:block">Interviews</span>
          </div>
          <nav aria-label="Preview navigation" className="hidden items-center gap-1 rounded-full bg-surface-muted p-1 md:flex">
            <NavItem active label="Practice" />
            <NavItem label="Story bank" />
            <NavItem label="Mock circuits" />
          </nav>
          <span className="rounded-full bg-brand-muted px-3 py-1.5 text-xs font-semibold text-brand">Preview</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 pt-9 sm:px-8 sm:pt-12">
        <section className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_325px]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-6xl">{copy.title}</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">{copy.description}</p>
              </div>
              <FormatSwitch format={format} setFormat={setFormat} />
            </div>

            <section className="mt-8 overflow-hidden rounded-3xl border border-border bg-ink text-ink-foreground eb-soft">
              <div className="grid min-h-[412px] lg:grid-cols-[minmax(0,1fr)_285px]">
                <div className="flex flex-col px-6 py-7 sm:px-9 sm:py-9">
                  <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[#d4cbea]">
                    <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-mint" /> Next up · {copy.label}</span>
                    <span className="font-mono text-xs tabular-nums">{copy.minutes}</span>
                  </div>
                  <div className="mt-8 max-w-2xl">
                    <p className="text-sm font-medium text-[#d4cbea]">{copy.station}</p>
                    <p className="mt-3 text-pretty font-display text-2xl font-medium leading-snug sm:text-3xl">{copy.prompt}</p>
                    <p className="mt-5 text-sm text-[#d4cbea]">{copy.detail}</p>
                  </div>
                  <div className="mt-auto pt-8">
                    <button className="eb-press inline-flex items-center gap-2 rounded-full bg-surface px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5" type="button">
                      <PlayIcon /> {copy.action} <ArrowIcon />
                    </button>
                  </div>
                </div>
                <div className="border-t border-white/10 bg-white/[0.055] p-6 lg:border-l lg:border-t-0">
                  <p className="text-sm font-medium text-[#d4cbea]">Your circuit</p>
                  <ol className="mt-5 space-y-3">
                    {['Motivation', 'Teamwork', 'Ethics', 'Rural health'].map((item, index) => (
                      <li key={item} className={`flex items-center gap-3 text-sm ${index === 2 ? 'text-white' : 'text-[#b5acc9]'}`}>
                        <span className={`grid h-7 w-7 place-items-center rounded-full border text-xs ${index === 2 ? 'border-mint bg-mint text-mint-foreground' : 'border-white/15'}`}>{index < 2 ? <CheckIcon /> : index + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-[#b5acc9]">A realistic station flow, quiet preparation time and space to reflect after every answer.</p>
                </div>
              </div>
            </section>
          </div>

          <ReadinessPanel />
        </section>

        <section className="mt-12 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-semibold tracking-tight">Practise a question with purpose.</h2>
                <p className="mt-2 text-sm text-muted">Move from context to a natural, well-reasoned response.</p>
              </div>
              <button type="button" onClick={() => setSaved((value) => !value)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${saved ? 'border-brand bg-brand-muted text-brand' : 'border-border bg-surface text-foreground hover:border-brand/40'}`}>
                <BookmarkIcon filled={saved} /> {saved ? 'Saved to your plan' : 'Save for later'}
              </button>
            </div>
            <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface eb-soft">
              <div className="grid border-b border-border md:grid-cols-[1.15fr_.85fr]">
                <div className="p-6 sm:p-8">
                  <p className="font-display text-2xl font-semibold tracking-tight">Why do you want to study medicine?</p>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-muted">A common panel question that tests your insight into the profession—not how compelling your script sounds.</p>
                  <div className="mt-7 flex flex-wrap gap-2">
                    {['Motivation', 'Panel', 'Core question'].map((tag) => <span key={tag} className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted">{tag}</span>)}
                  </div>
                </div>
                <div className="bg-brand-muted/55 p-6 sm:p-8">
                  <p className="text-sm font-semibold text-brand">What interviewers are listening for</p>
                  <ul className="mt-4 space-y-3 text-sm leading-5 text-foreground">
                    <li className="flex gap-3"><CheckIcon className="mt-0.5 shrink-0 text-mint-deep" /> A specific, reflected reason</li>
                    <li className="flex gap-3"><CheckIcon className="mt-0.5 shrink-0 text-mint-deep" /> Evidence you understand the role</li>
                    <li className="flex gap-3"><CheckIcon className="mt-0.5 shrink-0 text-mint-deep" /> Values that show up in your choices</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8">
                <span className="inline-flex items-center gap-2 text-sm text-muted"><ClockIcon /> 2 min preparation · 3 min response</span>
                <div className="flex gap-2">
                  <button type="button" className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-muted">Learn first</button>
                  <button type="button" className="eb-press inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">Rehearse <ArrowIcon /></button>
                </div>
              </div>
            </div>
          </div>

          <StoryBank />
        </section>
      </div>
    </main>
  )
}

function ReadinessPanel() {
  const rows = [
    ['Motivation', 'Ready', 88],
    ['Communication', 'Build next', 58],
    ['Ethics', 'Build next', 46],
    ['Clinical exposure', 'New', 18],
  ] as const
  return <aside className="rounded-3xl border border-border bg-surface p-6 eb-soft">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-xl font-semibold tracking-tight">Readiness plan</h2>
      <span className="rounded-full bg-mint-muted px-2.5 py-1 text-xs font-semibold text-mint-deep">Sample view</span>
    </div>
    <p className="mt-2 text-sm leading-6 text-muted">Your plan gets clearer as you practise and receive feedback.</p>
    <div className="mt-6 space-y-4">
      {rows.map(([name, status, value]) => <div key={name}>
        <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{name}</span><span className="text-xs text-muted">{status}</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-mint" style={{ width: `${value}%` }} /></div>
      </div>)}
    </div>
    <div className="mt-7 rounded-2xl bg-surface-muted p-4">
      <p className="text-sm font-semibold">One focused next step</p>
      <p className="mt-1 text-sm leading-6 text-muted">Rehearse an ethics station, then review one feedback point before your next circuit.</p>
    </div>
  </aside>
}

function StoryBank() {
  return <aside className="rounded-3xl border border-border bg-surface p-6 eb-soft">
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold tracking-tight">Your story bank</h2><BookIcon /></div>
    <p className="mt-2 text-sm leading-6 text-muted">Keep the experiences that make your answers unmistakably yours.</p>
    <div className="mt-6 space-y-3">
      <StoryRow title="A difficult team conversation" tags="Teamwork · reflection" />
      <StoryRow title="Volunteering at the community kitchen" tags="Equity · service" />
      <StoryRow title="A lesson from caring for family" tags="Motivation · boundaries" />
    </div>
    <button type="button" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand">Open story bank <ArrowIcon /></button>
  </aside>
}

function StoryRow({ title, tags }: { title: string; tags: string }) {
  return <div className="rounded-2xl bg-surface-muted/70 p-3.5"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted">{tags}</p></div>
}

function FormatSwitch({ format, setFormat }: { format: Format; setFormat: (format: Format) => void }) {
  return <div className="flex rounded-full bg-surface-muted p-1" role="group" aria-label="Interview format">
    {(['mmi', 'panel'] as const).map((item) => <button type="button" key={item} onClick={() => setFormat(item)} className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${format === item ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}>{item === 'mmi' ? 'MMI practice' : 'Panel practice'}</button>)}
  </div>
}

function NavItem({ label, active = false }: { label: string; active?: boolean }) { return <span className={`rounded-full px-3 py-2 text-sm font-medium ${active ? 'bg-surface text-foreground eb-soft' : 'text-muted'}`}>{label}</span> }

function ArrowIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
function PlayIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="m6.5 4 8 6-8 6V4Z" /></svg> }
function CheckIcon({ className = '' }: { className?: string }) { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className={`h-4 w-4 ${className}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 10 3.5 3.5L16 5.5" /></svg> }
function ClockIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></svg> }
function BookmarkIcon({ filled }: { filled: boolean }) { return <svg aria-hidden viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} className="h-4 w-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13l-5-3-5 3v-13Z" /></svg> }
function BookIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-brand" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5c2.5-1 4.5-.5 6 1.2 1.5-1.7 3.5-2.2 6-1.2v11c-2.5-1-4.5-.5-6 1.2-1.5-1.7-3.5-2.2-6-1.2v-11Z" /><path d="M10 5.7v11" /></svg> }
