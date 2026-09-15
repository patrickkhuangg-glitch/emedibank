import type { ReactNode } from 'react'
import styles from './question-display.module.css'

/** Shared reading layout; callers control when timed content becomes visible. */
export function InterviewQuestionPreview({ title, category, preparation, questions, timing, firstQuestion = 1, preparationLabel = 'Scenario', children, className }: {
  title: string; category: string; preparation: string; questions: string[]; timing: string; firstQuestion?: number; preparationLabel?: string; children?: ReactNode; className?: string
}) {
  return <section className={`${styles.preview} overflow-hidden rounded-3xl border border-border bg-surface ${className ?? ''}`} aria-label="Selected station preview">
    <header className={`${styles.previewHeader} flex flex-col gap-4 border-b border-border px-6 py-6 sm:px-8 sm:py-7`}>
      <h2 className="text-balance font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h2>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted">{category}</p>
        <p className="rounded-full bg-surface-muted px-3 py-1.5 text-muted">{timing}</p>
      </div>
    </header>
    <div className={`${styles.previewBody} grid lg:grid-cols-2`}>
      <div className={`${styles.scenarioPane} px-6 py-6 sm:px-8 sm:py-8`}>
        <h3 className="text-base font-semibold">{preparationLabel}</h3>
        <p className="mt-3 max-w-prose whitespace-pre-line text-base leading-7 text-muted">{preparation}</p>
      </div>
      <div className={`${styles.questionPane} border-t border-border px-6 py-6 sm:px-8 sm:py-8 lg:border-t-0 lg:border-l`}>
        <h3 className="text-base font-semibold">{questions.length === 1 ? 'Your question' : 'Questions'}</h3>
        <ol start={firstQuestion} className="mt-2 divide-y divide-border">
          {questions.map((question, index) => <li key={`${index}-${question}`} className={`${styles.questionRow} flex gap-3 py-4 text-base leading-7`}>
            <span aria-hidden="true" className={`${styles.questionNumber} mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums`}>{index + firstQuestion}</span>
            <span className="min-w-0">{question}</span>
          </li>)}
        </ol>
      </div>
    </div>
    {children && <footer className="flex flex-col items-start gap-4 border-t border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">{children}</footer>}
  </section>
}

export function InterviewPrompt({ text, preparation = false, questionNumber = 1, questionCount = 1, scenario, children }: {
  text: string; preparation?: boolean; questionNumber?: number; questionCount?: number; scenario?: string; children?: ReactNode
}) {
  return <section className={`${styles.prompt} overflow-hidden rounded-3xl border border-border bg-surface`} data-preparation={preparation || undefined} aria-label={preparation ? 'Station scenario' : 'Current interview question'}>
    <div className={`${styles.promptHeader} flex items-center justify-between gap-4 border-b border-border px-6 py-4 sm:px-8`}>
      <p className="font-semibold">{preparation ? 'Read the scenario' : `Question ${questionNumber}`}</p>
      {!preparation && questionCount > 1 && <span className="rounded-full bg-brand-muted px-3 py-1 text-sm font-semibold tabular-nums text-brand">{questionNumber} of {questionCount}</span>}
    </div>
    <div className={`${styles.promptBody} px-6 py-7 sm:px-8 sm:py-9`}>
      {preparation ? <p className="max-w-prose whitespace-pre-line text-lg leading-8">{text}</p> : <h2 className="max-w-prose whitespace-pre-line font-sans text-2xl font-medium leading-relaxed sm:text-3xl sm:leading-relaxed">{text}</h2>}
      {!preparation && scenario && <details key={text} className="mt-7 border-t border-border pt-4 text-sm">
        <summary className="w-fit cursor-pointer rounded-lg py-2 font-semibold text-brand outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4">Refer to the scenario</summary>
        <p className="mt-3 max-w-prose whitespace-pre-line text-base leading-7 text-muted">{scenario}</p>
      </details>}
    </div>
    {children && <footer className="flex flex-wrap items-center gap-4 border-t border-border px-6 py-5 sm:px-8">{children}</footer>}
  </section>
}

export function InterviewTimerBar({ label, seconds, tone = 'neutral' }: { label: string; seconds: number; tone?: 'neutral' | 'preparation' | 'response' }) {
  return <div className={`${styles.timer} flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4`} data-tone={tone} data-urgent={seconds <= 30 || undefined}>
    <p role="status" className={`${styles.timerLabel} text-sm font-medium`}><span aria-hidden="true" />{label}</p>
    <p className="shrink-0 font-mono text-3xl font-medium tabular-nums text-foreground" aria-label={`${seconds} seconds remaining`}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p>
  </div>
}
