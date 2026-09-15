'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Container } from './container'
import styles from './format-section.module.css'

// "Timed like the real exam" — a checklist of what a mock delivers, beside a
// tabbed breakdown of each exam's format. Client for the tab state only.
type Exam = { label: string; rows: [string, string][] }
const EXAMS: Record<string, Exam> = {
  ucat: { label: 'UCAT', rows: [
    ['Verbal Reasoning', 'Reading and interpreting written passages'],
    ['Decision Making', 'Weighing evidence and drawing conclusions'],
    ['Quantitative Reasoning', 'Solving problems using numbers and data'],
    ['Situational Judgement', 'Judging ethical scenarios'],
  ] },
  gamsat: { label: 'GAMSAT', rows: [
    ['Section 1', 'Humanities and social sciences passages'],
    ['Section 2', 'Two timed written communication tasks'],
    ['Section 3', 'Biology, chemistry and physics reasoning'],
    ['Full mocks', 'Real section lengths and break timing'],
  ] },
  isat: { label: 'ISAT', rows: [
    ['Critical Reasoning', 'Reading passages and drawing conclusions'],
    ['Quantitative Reasoning', 'Maths and data problems'],
    ['Full Mocks', '100 questions in 3 hours'],
  ] },
  interviews: { label: 'Interviews', rows: [
    ['Timed mocks', 'MMI circuits and 20-minute full panels'],
    ['Record and review', 'Replay your answer and read its private transcript'],
    ['Your story bank', 'Save personal experiences and reflections'],
    ['Tutor marking', 'Scores, strengths and specific advice to improve'],
  ] },
}
const CHECKS = [
  'Full-screen kiosk mode',
  'Section-by-section score breakdown',
  'Per-section timers',
  'Written explanations',
  'Expert-written exam questions',
  'Percentile benchmarking',
]
const INTERVIEW_CHECKS = [
  'MMI and panel question practice',
  'Audio practice and video mocks',
  'Private transcripts and study notes',
  'Timed mock interviews',
  'Saved stories and reflections',
  'Tutor-reviewed marking reports',
]

export function FormatSection() {
  const [tab, setTab] = useState<keyof typeof EXAMS>('ucat')
  const interviews = tab === 'interviews'
  const checks = interviews ? INTERVIEW_CHECKS : CHECKS
  return (
    <section id="interface" className={styles.section}>
      <Container className={styles.layout}>
        <div data-home-reveal>
          <h2 >{interviews ? 'Practise out loud. Hear what to improve.' : 'Timed like the real exam, explained like a tutor.'}</h2>
          <p className={styles.body}>{interviews ? 'Choose an MMI or panel question, prepare, then record your answer. Listen back, review your transcript and keep notes for next time. Use marking credits when you want a tutor’s feedback.' : 'Every mock exam matches the real exam platform, and every question is written by exam experts. Finish a mock and get an instant results breakdown, with written explanations for every question.'}</p>
          <div className={styles.checks}>
            {checks.map((c) => (
              <div key={c} ><Tick /> {c}</div>
            ))}
          </div>
        </div>

        <div>
          <div className={styles.tabs} role="tablist" aria-label="Exam formats">
            {(Object.keys(EXAMS) as (keyof typeof EXAMS)[]).map((k) => {
              const on = tab === k
              return (
                <button
                  key={k} type="button" role="tab" aria-selected={on} id={`format-tab-${k}`} aria-controls="format-panel" tabIndex={on ? 0 : -1}
                  onKeyDown={event => {
                    const keys = Object.keys(EXAMS)
                    const index = keys.indexOf(k)
                    const next = event.key === 'ArrowRight' ? (index + 1) % keys.length : event.key === 'ArrowLeft' ? (index - 1 + keys.length) % keys.length : event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : -1
                    if (next < 0) return
                    event.preventDefault()
                    setTab(keys[next])
                    document.getElementById(`format-tab-${keys[next]}`)?.focus()
                  }}
                  onClick={() => setTab(k)}

                >
                  {EXAMS[k].label}
                </button>
              )
            })}
          </div>
          <div role="tabpanel" id="format-panel" aria-labelledby={`format-tab-${tab}`} tabIndex={0}>
          <p className={styles.note}>{interviews ? 'Practise individual questions or put your preparation to the test in a timed mock.' : 'Exact timing and format, plus feedback the moment you finish.'}</p>
          <div className={styles.rows}>
            {EXAMS[tab].rows.map(([name, detail]) => (
              <div key={name} className={styles.row}>
                <strong>{name}</strong>
                <span>{detail}</span>
              </div>
            ))}
          </div>
          {interviews ? <Link href="/interview-preparation" className={styles.link}>Explore Interviews <Arrow /></Link> : <Link href={`/${tab}-preparation`} className={styles.link}>{tab.toUpperCase()} · Coming soon <Arrow /></Link>}
          </div>
        </div>
      </Container>
    </section>
  )
}

function Arrow() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg> }

function Tick(): ReactNode {
  return (
    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-brand-muted">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  )
}
