'use client'

import { Cyto } from '@/components/ui/cyto'
import type { CytoMood } from '@/lib/mascot/mood'

type ParsedFeedback = {
  score: string | null
  strengths: string[]
  improvements: string[]
  sections: Array<{ label: string; text: string }>
  fallback: string | null
}

function cleanList(text: string, marker: string) {
  return text
    .split('\n')
    .map((line) => line.trim().replace(new RegExp(`^${marker}\\s*`), ''))
    .filter(Boolean)
}

function parseFeedback(text: string): ParsedFeedback {
  const scoreMatch = text.match(/🎯\s*Score:\s*([^\n]+)/i)
  const strengthsMatch = text.match(/🌟\s*Things it does well:\s*([\s\S]*?)(?=🛠️?\s*Things it could improve:|🎯\s*Score:)/i)
  const improvementsMatch = text.match(/🛠️?\s*Things it could improve:\s*([\s\S]*?)(?=🎯\s*Score:)/i)
  const bodyStart = scoreMatch?.index != null ? scoreMatch.index + scoreMatch[0].length : 0
  const body = text.slice(bodyStart).trim()
  const rowPattern = /(?:^|\n)(Intro(?:duction)?|Body Paragraph \d+|Conclusion|Overall Feedback):\s*/gi
  const matches = [...body.matchAll(rowPattern)]
  const sections = matches.map((match, index) => ({
    label: match[1].replace(/^Intro$/i, 'Introduction'),
    text: body.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? body.length).trim(),
  })).filter((row) => row.text)

  return {
    score: scoreMatch?.[1]?.trim() ?? null,
    strengths: strengthsMatch ? cleanList(strengthsMatch[1], '✅') : [],
    improvements: improvementsMatch ? cleanList(improvementsMatch[1], '🔹') : [],
    sections,
    fallback: sections.length ? null : body || text,
  }
}

function scoreMidpoint(score: string | null) {
  if (!score) return null
  const values = score.match(/\d+/g)?.map(Number) ?? []
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function moodForScore(score: string | null): CytoMood {
  const midpoint = scoreMidpoint(score)
  if (midpoint == null) return 'happy'
  if (midpoint >= 78) return 'thriving'
  if (midpoint >= 68) return 'happy'
  if (midpoint >= 60) return 'focused'
  return 'worried'
}

export function EssayFeedbackReview({
  theme,
  task,
  body,
  feedback,
  words,
  timed,
  minutes,
  elapsedLabel,
  onBack,
  onAgain,
}: {
  theme: string
  task: string
  body: string
  feedback: string
  words: number
  timed: boolean
  minutes: number
  elapsedLabel: string
  onBack: () => void
  onAgain: () => void
}) {
  const parsed = parseFeedback(feedback)
  const mood = moodForScore(parsed.score)

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-background text-foreground">
      <main className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6 sm:py-7">
        <nav className="flex items-center justify-between">
          <button onClick={onBack} className="rounded-full px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-foreground">
            ← Back to essays
          </button>
          <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted">Tutor reviewed</span>
        </nav>

        <header className="mt-6 grid items-center gap-4 sm:grid-cols-[1fr_145px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">Your marked essay</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">You have plenty to build on.</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
              Your tutor reviewed <span className="font-semibold text-foreground">{theme}</span>. Start with the summary, then compare each note with your submitted essay.
            </p>
          </div>
          <div className="hidden justify-center sm:flex">
            <Cyto mood={mood} size={116} title="Cyto reacting to your essay feedback" />
          </div>
        </header>

        <section className="mt-7 grid gap-3 md:grid-cols-[210px_1fr_1fr]">
          <article className="rounded-2xl border border-brand/20 bg-brand-muted p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand">Indicative score</p>
            <p className="mt-3 font-display text-5xl font-semibold tracking-[-0.06em] text-brand">{parsed.score ?? 'Marked'}</p>
            <p className="mt-1 text-xs text-muted">GAMSAT Section 2</p>
            <span className="mt-5 inline-flex rounded-full border border-brand/20 bg-surface px-2.5 py-1 text-[11px] font-semibold text-brand">Feedback ready</span>
          </article>

          <SummaryCard title="🌟 Things it did well" items={parsed.strengths} tone="good" empty="See the detailed feedback below." />
          <SummaryCard title="🛠️ Things to improve" items={parsed.improvements} tone="improve" empty="See the detailed feedback below." />
        </section>

        <section className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,.8fr)]">
          <article className="rounded-2xl border border-border bg-surface p-6 shadow-[0_12px_35px_-28px_rgba(55,37,97,.34)] sm:p-8 lg:sticky lg:top-4 lg:min-h-[680px]">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">Your submitted essay</h2>
                <p className="mt-1 text-xs text-muted">{words} words · Read-only</p>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span>Task {task}</span>
                <span>{timed ? `${minutes} min` : 'Untimed'}</span>
                <span>{elapsedLabel}</span>
              </div>
            </div>
            <div className="mt-6 whitespace-pre-wrap pr-1 font-serif text-[16px] leading-[1.82] text-foreground/90 lg:max-h-[720px] lg:overflow-auto lg:pr-4">
              {body.trim() || 'This essay was left blank.'}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-6 shadow-[0_12px_35px_-28px_rgba(55,37,97,.34)]">
            <div className="border-b border-border pb-4">
              <h2 className="font-display text-2xl font-semibold tracking-tight">Your tutor&apos;s feedback</h2>
              <p className="mt-1 text-xs text-muted">Read each note beside the paragraph it refers to.</p>
            </div>
            {parsed.sections.length ? parsed.sections.map((section) => (
              <section key={section.label} className="border-b border-border py-5 last:border-0 last:pb-0">
                <h3 className="text-xs font-bold text-brand">{section.label}</h3>
                <p className="mt-2 whitespace-pre-wrap font-serif text-[14.5px] leading-[1.7] text-foreground/85">{section.text}</p>
              </section>
            )) : (
              <p className="mt-5 whitespace-pre-wrap font-serif text-[14.5px] leading-[1.7] text-foreground/85">{parsed.fallback}</p>
            )}
          </article>
        </section>

        <footer className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={onBack} className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-brand transition-transform active:scale-[0.98]">Back to Section 2</button>
          <button onClick={onAgain} className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-transform active:scale-[0.98]">Write again</button>
        </footer>
      </main>
    </div>
  )
}

function SummaryCard({ title, items, tone, empty }: { title: string; items: string[]; tone: 'good' | 'improve'; empty: string }) {
  const marker = tone === 'good' ? '✅' : '🔹'
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-[0_12px_35px_-28px_rgba(55,37,97,.34)]">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <ul className="mt-4 space-y-3">
        {(items.length ? items : [empty]).map((item) => (
          <li key={item} className="grid grid-cols-[22px_1fr] gap-2 text-[13.5px] leading-snug text-muted">
            <span aria-hidden>{marker}</span><span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}
