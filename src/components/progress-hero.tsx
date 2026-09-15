'use client'

import type { CSSProperties } from 'react'
import { Cyto } from '@/components/ui/cyto'
import styles from './progress-hero.module.css'

const SECTIONS = [
  { name: 'Decision Making', accuracy: 72, level: 6 },
  { name: 'Quantitative Reasoning', accuracy: 84, level: 8 },
  { name: 'Verbal Reasoning', accuracy: 46, level: 3 },
]

const SCREENS = [
  { id: 'progress', label: 'Progress', title: 'Your progress dashboard', Screen: ProgressScreen },
  { id: 'essay', label: 'Marked essay', title: 'A marked GAMSAT essay', Screen: MarkedEssayScreen },
  { id: 'ucat', label: 'UCAT practice', title: 'An example UCAT practice question', Screen: UcatScreen },
] as const

/** Scroll and button controlled; no timed rotation competes with reading. */
export function ProgressHero({ active, onSelect }: { active: number; onSelect: (index: number) => void }) {

  return (
    <section className={styles.stage} aria-label="Studocyte product tour" aria-describedby="hero-preview-caption">
      <div className={styles.carousel}>
        <div className={styles.screenViewport} aria-live="off">
          {SCREENS.map(({ id, title, Screen }, index) => (
            <div key={id} id={`hero-preview-${id}`} className={styles.screen} data-active={index === active} aria-hidden={index !== active} inert={index !== active} aria-label={title}>
              <Screen />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.previewFooter}>
      <div>
      <p id="hero-preview-caption" className={styles.previewCaption}>Example screens · scores and feedback are illustrative.</p>
      <div className={styles.controls} aria-label="Choose a product preview">
        <div className={styles.screenChoices}>{SCREENS.map(({ id, label }, index) => <button key={id} type="button" aria-pressed={index === active} aria-controls={`hero-preview-${id}`} onClick={() => onSelect(index)}>{label}</button>)}</div>
      </div>
      </div>
      <div className={styles.cytoPerch} aria-hidden="true">
        <span className={styles.cytoGlow} />
        <div className={styles.cytoMotion}>
          <Cyto mood="happy" size={72} className={styles.cytoWatching} />
        </div>
      </div>
      </div>
    </section>
  )
}

function ProgressScreen() {
  return (
    <div className={styles.dashboard}>
      <header className={styles.dashboardHeader}><div><span>UCAT · your progress</span><h2>Hi, Maya.</h2></div><b>Practise →</b></header>
      <div className={styles.overview}>
        <article className={styles.level}><span>Overall level</span><div><b>7</b><i>2,460 XP</i></div><small>340 XP to level 8</small></article>
        <article><span>Daily streak</span><b className={styles.streak}>🔥 12</b><small>Practised today. Nice.</small></article>
        <article className={styles.range}><span>Predicted band</span><b>2,100–2,200</b><small>78% accuracy · 126 answered</small></article>
      </div>
      <section className={styles.sections}><div className={styles.sectionHeading}><span>Levels by section</span><small>Updated from your recent practice</small></div>
        {SECTIONS.map((section, index) => (
          <div className={styles.row} key={section.name} style={{ '--delay': `${80 + index * 65}ms`, '--progress': `${section.accuracy}%` } as CSSProperties}>
            <span>{section.name}</span><b>Lv {section.level}</b><i><em /></i><small>{section.accuracy}% accuracy</small>
          </div>
        ))}
      </section>
      <footer className={styles.review}><span>Review queue</span><b>08</b><small>due to revisit</small><strong>Review now →</strong></footer>
    </div>
  )
}

function MarkedEssayScreen() {
  return (
    <div className={styles.essay}>
      <header className={styles.essayHeader}><div><span>← Back to essays</span><h2>You have plenty to build on.</h2></div><b>Tutor reviewed</b></header>
      <p className={styles.essayIntro}>Your tutor reviewed <b>Justice</b>. Start with the summary, then compare each note with your submitted essay.</p>
      <div className={styles.essaySummary}>
        <div className={styles.score}><span>Indicative score</span><b>63–65</b><small>GAMSAT Section 2</small></div>
        <article><b>🌟 Things it did well</b><p>Clear concern with unequal moral judgement in the introduction.</p></article>
        <article><b>🛠️ Things to improve</b><p>Define the injustice more precisely, rather than letting key ideas blur into one claim.</p></article>
      </div>
      <div className={styles.essayBody}>
        <article className={styles.submitted}><span>Your submitted essay · 406 words</span><div className={styles.essayExcerpt} aria-label="Submitted essay excerpt intentionally blurred"><p>Crime is often treated as a parasite to respectable society, yet in reality, the line between criminality and enterprising is often finer than we choose to believe.</p><p>Financiers and others with respectable positions can be opportunist, taking risks and often exploiting others to succeed and get what they want.</p><p>This contradiction exposes a larger problem in society, where existing power structures are in place to serve only the powerful.</p></div></article>
        <aside className={styles.feedback}><span>Your tutor&apos;s feedback</span><div><b>Body paragraph 1</b><p>Your comparison between financiers and burglars is the essay&apos;s strongest source of tension.</p></div><div><b>Overall feedback</b><p>Give each body paragraph a separate question to answer, then use a concrete case to show how the injustice works.</p></div><p className={styles.feedbackMore}>… 3 more detailed notes on the introduction, body paragraph 2 and conclusion</p></aside>
      </div>
    </div>
  )
}

function UcatScreen() {
  return (
    <div className={styles.ucat}>
      <header className={styles.ucatHeader}><b>UCAT · Practice</b><strong>▤&nbsp; 1 of 5</strong></header>
      <div className={styles.ucatTools}><span>▭&nbsp; Calculator</span><span>⚑ Flag for Review</span></div>
      <div className={styles.ucatBody}>
        <div className={styles.ucatMeta}><span>Situational Judgement</span></div>
        <p className={styles.ucatScenario}>Aisha, a final-year medical student, is asked to close a deep wound. She has only sutured superficial wounds under supervision. The registrar will be nearby, but is seeing another patient.</p>
        <h2>How important is this consideration when deciding how to respond?</h2>
        <p className={styles.ucatConsideration}>That she has not previously assessed or closed a wound of this depth</p>
        <div className={styles.ucatOptions}>
          <div><i /><b>A.</b><span>Very important</span></div>
          <div><i /><b>B.</b><span>Important</span></div>
          <div><i /><b>C.</b><span>Of minor importance</span></div>
          <div><i /><b>D.</b><span>Not important at all</span></div>
        </div>
      </div>
      <footer className={styles.ucatFooter}><span>↪ End Exam</span><i>⌘ Navigator</i><strong>Finish →</strong></footer>
    </div>
  )
}
