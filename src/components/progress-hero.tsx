'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import styles from './progress-hero.module.css'

const SECTIONS = [
  { name: 'Decision Making', accuracy: 72, level: 6 },
  { name: 'Quantitative Reasoning', accuracy: 84, level: 8 },
  { name: 'Verbal Reasoning', accuracy: 46, level: 3 },
]

const SCREENS = [
  { id: 'progress', label: 'Progress', title: 'Your progress dashboard', Screen: ProgressScreen },
  { id: 'essay', label: 'Marked essay', title: 'A marked GAMSAT essay', Screen: MarkedEssayScreen },
  { id: 'ucat', label: 'UCAT practice', title: 'A fit-to-size UCAT question', Screen: UcatScreen },
] as const

/** A deliberate, user-controlled tour through the most valuable product moments. */
export function ProgressHero() {
  const [active, setActive] = useState(0)
  const screen = SCREENS[active]
  const Screen = screen.Screen

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const interval = window.setInterval(() => {
      setActive((current) => (current + 1) % SCREENS.length)
    }, 5200)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <section className={styles.carousel} aria-label="Studocyte product tour">
      <div className={styles.screenViewport} aria-live="off">
        <div className={styles.screen} key={screen.id} aria-label={screen.title}><Screen /></div>
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
      <main className={styles.ucatBody}>
        <div className={styles.ucatMeta}><span>Situational Judgement</span></div>
        <p className={styles.ucatScenario}>Aisha, a final-year medical student, is assisting in a busy emergency department. A registrar asks her to close a deep forearm wound while he reviews another patient. Aisha has practised simple suturing in simulation and has closed small superficial wounds under direct supervision, but she has never assessed or closed a wound of this depth. The registrar says he will be nearby and tells her to begin preparing the patient.</p>
        <h2>How important is it for Aisha to take the following consideration into account when deciding how to respond?</h2>
        <p className={styles.ucatConsideration}>That she has not previously assessed or closed a wound of this depth</p>
        <div className={styles.ucatOptions}>
          <div><i /><b>A.</b><span>Very important</span></div>
          <div><i /><b>B.</b><span>Important</span></div>
          <div><i /><b>C.</b><span>Of minor importance</span></div>
          <div><i /><b>D.</b><span>Not important at all</span></div>
        </div>
      </main>
      <footer className={styles.ucatFooter}><span>↪ End Exam</span><i>⌘ Navigator</i><strong>Finish →</strong></footer>
    </div>
  )
}
