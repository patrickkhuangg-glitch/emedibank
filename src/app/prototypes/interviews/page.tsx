'use client'

import { useState } from 'react'

type Format = 'mmi' | 'panel'

const FORMAT_COPY: Record<Format, { action: string; label: string; minutes: string; station: string; prompt: string; detail: string; practiceTitle: string; practiceDescription: string; practiceTags: string[]; listeningFor: string[] }> = {
  mmi: {
    action: 'Open an MMI circuit', label: 'MMI circuit guide', minutes: '56 min', station: 'Station 03',
    prompt: 'A patient with capacity declines a treatment you believe would be beneficial. How would you respond?',
    detail: 'Ethics · autonomy · communication',
    practiceTitle: 'How would you respond when a patient declines treatment?',
    practiceDescription: 'Use this MMI scenario to rehearse a response that balances autonomy, empathy and clear communication.',
    practiceTags: ['Ethics', 'MMI', 'Scenario'],
    listeningFor: ['Acknowledge the patient’s right to decide', 'Explain options with empathy and clarity', 'Show the boundaries of your role'],
  },
  panel: {
    action: 'Open a panel rehearsal', label: 'Panel rehearsal guide', minutes: '18 min', station: 'Question 01',
    prompt: 'What has confirmed that medicine is the right path for you, and what have you learnt about the work itself?',
    detail: 'Motivation · reflection · clinical exposure',
    practiceTitle: 'Why do you want to study medicine?',
    practiceDescription: 'A panel question that tests your insight into the profession—not how compelling your script sounds.',
    practiceTags: ['Motivation', 'Panel', 'Core question'],
    listeningFor: ['A specific, reflected reason', 'Evidence you understand the role', 'Values that show up in your choices'],
  },
}

export function InterviewsDashboard({ embedded = false, preview = false }: { embedded?: boolean; preview?: boolean }) {
  const [format, setFormat] = useState<Format>('mmi')
  const [highlighted, setHighlighted] = useState(false)
  const [note, setNote] = useState('')
  const [savedNote, setSavedNote] = useState('')
  const copy = FORMAT_COPY[format]

  return (
    <main className="relative z-[2] min-h-screen bg-background pb-16 text-foreground">
      {!embedded ? <PreviewHeader preview={preview} /> : null}

      <div className="mx-auto max-w-[1440px] px-5 pt-9 sm:px-8 sm:pt-12">
        <section className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <h1 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-6xl">Your interview dashboard.</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">Plan, practise and reflect across the MMI and panel skills that matter for Australian medical and dental interviews.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {preview ? <span className="rounded-full bg-brand-muted px-3 py-1.5 text-xs font-semibold text-brand">Illustrative preview</span> : null}
                <FormatSwitch format={format} setFormat={setFormat} />
              </div>
            </div>

            <section className="mt-8 grid overflow-hidden rounded-3xl bg-ink text-ink-foreground eb-soft lg:grid-cols-[minmax(0,1fr)_290px]">
              <div className="flex min-h-[278px] flex-col px-6 py-7 sm:px-9 sm:py-8">
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[#d4cbea]">
                  <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-mint" /> Next focused practice</span>
                  <span className="font-mono text-xs tabular-nums">{copy.minutes}</span>
                </div>
                <div className="mt-7 max-w-2xl">
                  <p className="text-sm font-medium text-[#d4cbea]">{copy.station} · {copy.label}</p>
                  <p className="mt-3 text-pretty font-display text-2xl font-medium leading-snug sm:text-3xl">{copy.prompt}</p>
                  <p className="mt-4 text-sm text-[#d4cbea]">{copy.detail}</p>
                </div>
                <div className="mt-auto pt-7"><a href="#practice" className="eb-press inline-flex items-center gap-2 rounded-full bg-surface px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"><PlayIcon /> {copy.action} <ArrowIcon /></a></div>
              </div>
              <div className="bg-white/[0.055] p-6 lg:border-l lg:border-white/10">
                <p className="text-sm font-medium text-[#d4cbea]">Your practice summary</p>
                <dl className="mt-5 space-y-4"><SummaryRow value="0" label="responses recorded" /><SummaryRow value="0" label="reflection notes" /><SummaryRow value="4" label="focus areas to explore" /></dl>
                <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-[#b5acc9]">Your own completion and reflection trends will appear here as you practise.</p>
              </div>
            </section>
          </div>

          <ReadinessPanel />
        </section>

        <section className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]"><FocusMap preview={preview} /><StudyNotes note={note} savedNote={savedNote} setNote={setNote} onSave={() => setSavedNote(note.trim())} /></section>

        <section id="practice" className="mt-12 scroll-mt-24 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><h2 className="font-display text-3xl font-semibold tracking-tight">Practice</h2><p className="mt-2 text-sm text-muted">Move from context to a natural, well-reasoned response.</p></div>
              <button type="button" onClick={() => setHighlighted((value) => !value)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${highlighted ? 'border-brand bg-brand-muted text-brand' : 'border-border bg-surface text-foreground hover:border-brand/40'}`}><BookmarkIcon filled={highlighted} /> {highlighted ? 'Highlighted for this session' : 'Highlight this prompt'}</button>
            </div>
            <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface eb-soft">
              <div className="grid border-b border-border md:grid-cols-[1.15fr_.85fr]">
                <div className="p-6 sm:p-8"><p className="font-display text-2xl font-semibold tracking-tight">{copy.practiceTitle}</p><p className="mt-4 max-w-xl text-sm leading-6 text-muted">{copy.practiceDescription}</p><div className="mt-7 flex flex-wrap gap-2">{copy.practiceTags.map((tag) => <span key={tag} className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted">{tag}</span>)}</div></div>
                <div className="bg-brand-muted/55 p-6 sm:p-8"><p className="text-sm font-semibold text-brand">What interviewers are listening for</p><ul className="mt-4 space-y-3 text-sm leading-5 text-foreground">{copy.listeningFor.map((item) => <li key={item} className="flex gap-3"><CheckIcon className="mt-0.5 shrink-0 text-mint-deep" /> {item}</li>)}</ul></div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8"><span className="inline-flex items-center gap-2 text-sm text-muted"><ClockIcon /> 2 min preparation · 3 min response</span><a href="#notes" className="eb-press inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">Plan your response <ArrowIcon /></a></div>
            </div>
          </div>
          <StoryBank />
        </section>

        <section id="resources" className="mt-7 scroll-mt-24 rounded-3xl border border-border bg-surface p-6 eb-soft sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-display text-3xl font-semibold tracking-tight">Resources for your next session</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Keep the frameworks close, then return to a prompt and make the answer your own.</p></div><a href="#practice" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">Back to practice <ArrowIcon /></a></div>
          <div className="mt-6 grid gap-3 md:grid-cols-3"><ResourceTile title="MMI response guide" body="A calm way to frame ethical and communication scenarios." icon={<GuideIcon />} /><ResourceTile title="Panel answer structure" body="Turn your experience into a clear, reflected answer." icon={<SpeechIcon />} /><ResourceTile title="Australian interview checklist" body="Format, timing and setup points to confirm before the day." icon={<ChecklistIcon />} /></div>
        </section>
      </div>
    </main>
  )
}

export default function InterviewPreviewPage() { return <InterviewsDashboard preview /> }

function PreviewHeader({ preview }: { preview: boolean }) {
  return <header className="border-b border-border bg-surface/80 backdrop-blur"><div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-sm font-bold text-white">S</span><span className="font-display text-xl font-semibold tracking-tight">Studocyte</span><span className="hidden h-5 w-px bg-border sm:block" /><span className="hidden text-sm font-medium text-muted sm:block">Interviews</span></div><nav aria-label="Preview navigation" className="hidden items-center gap-1 rounded-full bg-surface-muted p-1 md:flex"><NavItem active href="#overview" label="Overview" /><NavItem href="#practice" label="Practice" /><NavItem href="#story-bank" label="Stories" /><NavItem href="#resources" label="Resources" /></nav>{preview ? <span className="rounded-full bg-brand-muted px-3 py-1.5 text-xs font-semibold text-brand">Preview</span> : null}</div></header>
}

function ReadinessPanel() {
  const rows = [['Motivation', 'Choose one prompt'], ['Communication', 'Practise aloud'], ['Ethics', 'Use a scenario'], ['Clinical exposure', 'Gather an example']] as const
  return <aside className="rounded-3xl border border-border bg-surface p-6 eb-soft"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold tracking-tight">Readiness plan</h2><span className="rounded-full bg-mint-muted px-2.5 py-1 text-xs font-semibold text-mint-deep">Starter plan</span></div><p className="mt-2 text-sm leading-6 text-muted">A practical sequence for your first few interview sessions.</p><div className="mt-6 space-y-4">{rows.map(([name, status]) => <div key={name} className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{name}</span><span className="text-xs text-muted">{status}</span></div>)}</div><div className="mt-7 rounded-2xl bg-surface-muted p-4"><p className="text-sm font-semibold">One focused next step</p><p className="mt-1 text-sm leading-6 text-muted">Choose a question, practise it out loud, then write down one thing to improve.</p></div></aside>
}

function FocusMap({ preview }: { preview: boolean }) {
  const areas = ['Motivation', 'Teamwork', 'Ethics', 'Communication', 'Equity']
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return <section id="overview" className="scroll-mt-24 rounded-3xl border border-border bg-surface p-6 eb-soft sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-display text-2xl font-semibold tracking-tight">Practice focus map</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">A simple view of the skills you decide to visit each week. Completed practice will build this into your own heatmap.</p></div><span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted">{preview ? 'Sample layout' : 'No sessions yet'}</span></div><div className="mt-7 overflow-x-auto"><div className="min-w-[590px]"><div className="grid grid-cols-[130px_repeat(7,minmax(0,1fr))] gap-2 text-xs text-muted"><span />{days.map((day) => <span key={day} className="text-center font-mono">{day}</span>)}</div><div className="mt-2 space-y-2">{areas.map((area, row) => <div key={area} className="grid grid-cols-[130px_repeat(7,minmax(0,1fr))] items-center gap-2"><span className="text-sm font-medium">{area}</span>{days.map((day, column) => <span key={day} className={`h-7 rounded-lg ${preview && ((row + column * 2) % 7 === 0 || (row === 2 && column === 3)) ? 'bg-mint' : 'bg-surface-muted'}`} aria-label={`${area}, ${day}`} />)}</div>)}</div></div></div><div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-surface-muted" /> Not practised</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-mint" /> Preview of a logged practice session</span></div></section>
}

function StudyNotes({ note, savedNote, setNote, onSave }: { note: string; savedNote: string; setNote: (value: string) => void; onSave: () => void }) {
  return <section id="notes" className="scroll-mt-24 rounded-3xl border border-border bg-surface p-6 eb-soft"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold tracking-tight">Study notes</h2><NoteIcon /></div><p className="mt-2 text-sm leading-6 text-muted">Capture one idea you want to carry into the next response. Notes stay in this browser for this preview.</p><label className="sr-only" htmlFor="interview-note">Your study note</label><textarea id="interview-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} placeholder="For example: start with the patient’s perspective before discussing options." className="mt-5 min-h-28 w-full resize-none rounded-2xl border border-border bg-background p-3.5 text-sm leading-6 outline-none placeholder:text-muted focus:border-brand" /><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-muted">{note.length}/280</span><button type="button" disabled={!note.trim()} onClick={onSave} className="eb-press rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-45">Save note</button></div>{savedNote ? <div className="mt-5 rounded-2xl bg-mint-muted p-3.5"><p className="text-xs font-semibold text-mint-deep">Saved for this session</p><p className="mt-1 text-sm leading-6 text-foreground">{savedNote}</p></div> : null}</section>
}

function StoryBank() { return <aside id="story-bank" className="scroll-mt-24 rounded-3xl border border-border bg-surface p-6 eb-soft"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold tracking-tight">Stories</h2><BookIcon /></div><p className="mt-2 text-sm leading-6 text-muted">Use these prompts to identify experiences you may want to bring to an answer.</p><div className="mt-6 space-y-3"><StoryRow title="A difficult team conversation" tags="Prompt · teamwork and reflection" /><StoryRow title="A community or service experience" tags="Prompt · equity and service" /><StoryRow title="A lesson from caring for someone" tags="Prompt · motivation and boundaries" /></div><p className="mt-6 text-sm font-semibold text-brand">Build your own examples as the story bank grows.</p></aside> }
function SummaryRow({ value, label }: { value: string; label: string }) { return <div><dt className="font-mono text-2xl font-medium text-white tabular-nums">{value}</dt><dd className="mt-0.5 text-xs text-[#b5acc9]">{label}</dd></div> }
function StoryRow({ title, tags }: { title: string; tags: string }) { return <div className="rounded-2xl bg-surface-muted/70 p-3.5"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted">{tags}</p></div> }
function ResourceTile({ title, body, icon }: { title: string; body: string; icon: React.ReactNode }) { return <div className="rounded-2xl bg-background p-5"><span className="text-brand">{icon}</span><h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{body}</p></div> }
function FormatSwitch({ format, setFormat }: { format: Format; setFormat: (format: Format) => void }) { return <div className="flex rounded-full bg-surface-muted p-1" role="group" aria-label="Interview format">{(['mmi', 'panel'] as const).map((item) => <button type="button" key={item} onClick={() => setFormat(item)} className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${format === item ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}>{item === 'mmi' ? 'MMI practice' : 'Panel practice'}</button>)}</div> }
function NavItem({ href, label, active = false }: { href: string; label: string; active?: boolean }) { return <a href={href} className={`rounded-full px-3 py-2 text-sm font-medium ${active ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}>{label}</a> }
function ArrowIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
function PlayIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="m6.5 4 8 6-8 6V4Z" /></svg> }
function CheckIcon({ className = '' }: { className?: string }) { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className={`h-4 w-4 ${className}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 10 3.5 3.5L16 5.5" /></svg> }
function ClockIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></svg> }
function BookmarkIcon({ filled }: { filled: boolean }) { return <svg aria-hidden viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} className="h-4 w-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13l-5-3-5 3v-13Z" /></svg> }
function BookIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-brand" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5c2.5-1 4.5-.5 6 1.2 1.5-1.7 3.5-2.2 6-1.2v11c-2.5-1-4.5-.5-6 1.2-1.5-1.7-3.5-2.2-6-1.2v-11Z" /><path d="M10 5.7v11" /></svg> }
function NoteIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-brand" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13H5z" /><path d="M8 7h4M8 10h5M8 13h3" /></svg> }
function GuideIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13H5z" /><path d="M8 7h4M8 10h4M8 13h2" /></svg> }
function SpeechIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 4.5h13v9h-8l-3.5 3v-12Z" /><path d="M7 8h6M7 10.5h4" /></svg> }
function ChecklistIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13H5z" /><path d="m7 8 1 1 2-2M11 8h2M7 12l1 1 2-2M11 12h2" /></svg> }
