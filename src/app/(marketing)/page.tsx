import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { WorkspaceEntryLink } from '@/components/workspace/entry-link'
import { Container } from '@/components/container'
import { Cyto } from '@/components/ui/cyto'
import type { CytoMood } from '@/lib/mascot/mood'
import { FormatSection } from '@/components/format-section'
import { LaunchWaitlist } from '@/components/launch-waitlist'
import { CinematicHeading, ScrollPhrase } from '@/components/marketing/cinematic-page'
import { HomeHero } from '@/components/marketing/home/hero'
import { HomeMotion } from '@/components/marketing/home/motion'
import { SITE_URL } from '@/lib/site'
import styles from './home.module.css'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const studocyteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Studocyte',
      alternateName: 'Studocyte by EMeducate',
      publisher: { '@id': 'https://emeducate.com.au/#organization' },
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#application`,
      url: `${SITE_URL}/`,
      name: 'Studocyte',
      alternateName: 'Studocyte by EMeducate',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      description:
        'Exam-style UCAT, GAMSAT and ISAT practice, plus Australian MMI and panel interview preparation, with written explanations, timed practice and performance analytics.',
      provider: { '@id': 'https://emeducate.com.au/#organization' },
      isPartOf: { '@id': `${SITE_URL}/#website` },
    },
  ],
}

export default async function Home() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <HomeMotion>
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(studocyteJsonLd) }} />
      <div className={styles.announcement}>
        <span>Studocyte is launching soon.</span>{' '}
        <a href="#opening-list">Join the opening list <Arrow /></a>
      </div>

      <HomeHero>
        <p data-cinematic-enter="intro" className={styles.brandLine}>Studocyte by EMeducate</p>
        <CinematicHeading id="home-title" first="Build real exam" second="immunity." />
        <p data-cinematic-enter="body" className={styles.intro}>Whatever stage you&rsquo;re at, sitting the UCAT, prepping for GAMSAT or ISAT, or getting ready for your interviews, Studocyte gives you the practice and feedback to walk in ready.</p>
        <div data-cinematic-enter="actions" className={styles.actions}>
          <a href="#opening-list" className={styles.primary}>Join the opening list <Arrow /></a>
          <Link href="/app" className={styles.textLink}>Existing students <Arrow /></Link>
        </div>
        <p data-cinematic-enter="note" className={styles.heroNote}>Coming soon. Built for future doctors.</p>
        <p data-cinematic-enter="note" className={styles.small}>Opening-list members receive the subscriber launch offer.</p>
      </HomeHero>

      <nav className={styles.examNav} aria-label="Explore Studocyte exams">
        <Container>
          <Link href="/ucat-preparation">UCAT <Arrow /></Link>
          <Link href="/gamsat-preparation">GAMSAT <Arrow /></Link>
          <Link href="/isat-preparation">ISAT <Arrow /></Link>
          <Link href="/interview-preparation">Interviews <Arrow /></Link>
        </Container>
      </nav>

      <FormatSection />

      <section id="why" className={styles.softSection}>
        <Container className={`${styles.section} ${styles.featureScene}`}>
          <h2 className={styles.sectionTitle}>Built to teach,<br /><span>not just test.</span></h2>
          <div className={styles.features} data-story-stack>
            {FEATURES.map((feature, index) => <article key={feature.title} data-stack-card style={{ '--stack-index': index } as CSSProperties}><span className={styles.chapterNumber}>0{index + 1}</span><h3>{feature.title}</h3><p>{feature.body}</p></article>)}
          </div>
        </Container>
      </section>

      <section id="progress" className={styles.section}>
        <Container>
          <div className={styles.progressIntro} data-home-reveal>
            <div><ScrollPhrase>Revision that plays like a game you want to win.</ScrollPhrase></div>
            <div><p className={styles.body}>Every answer earns XP. Levels, streaks, a mastery map and a weakness heatmap turn dry practice into visible momentum.</p><p className={styles.progressLabel}>Your progress, gamified</p></div>
          </div>
          <div className={styles.cytoSection} data-home-reveal>
            <div className={styles.cytoPortrait}><div className={styles.cytoOrbit} aria-hidden="true" data-cinematic-parallax="-55"/><div data-cinematic-parallax="65"><Cyto mood="thriving" size={220} title="Cyto, thriving" /></div></div>
            <div>
              <h3>Meet Cyto, your study cell.</h3>
              <p className={styles.body}>Cyto reacts to how you&rsquo;re really going. Keep your accuracy up and your streak alive and it&rsquo;s thriving, crown and all. Let the streak lapse and it dozes off. A small, friendly nudge to come back tomorrow.</p>
              <div className={styles.moods}>
                {([['sleepy', 'Off the streak'], ['worried', 'Slipping'], ['focused', 'Steady'], ['happy', 'On track'], ['thriving', 'Thriving']] as [CytoMood, string][]).map(([mood, label]) => <div key={mood}><Cyto mood={mood} size={46} /><span>{label}</span></div>)}
              </div>
            </div>
          </div>
          <div className={styles.gameFeatures}>
            {GAMES.map(game => <article key={game.title} data-home-reveal><h3>{game.title}</h3><p>{game.body}</p></article>)}
          </div>
        </Container>
      </section>

      <section id="how" className={styles.softSection}>
        <Container className={styles.section}>
          <h2 data-home-reveal>From cold start<br /><span>to exam-ready.</span></h2>
          <ol className={styles.steps}>
            {STEPS.map((step, i) => <li key={step.title} data-home-reveal><span className={styles.stepNumber}>{String(i + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}
          </ol>
        </Container>
      </section>

      <section id="opening-list" className={styles.section}>
        <Container>
          <div className={styles.waitlist} data-home-reveal>
            <div><h2>Studocyte is coming soon.</h2><p className={styles.body}>Leave your email to be notified when the platform opens and receive our subscriber-only opening offer.</p></div>
            <div><h3 className={styles.waitlistLabel}>Opening list</h3><LaunchWaitlist /></div>
          </div>
        </Container>
      </section>

      <section id="faq" className={styles.faqSection}>
        <Container className={styles.faqLayout}>
          <h2 data-home-reveal>Questions,<br /><span>answered.</span></h2>
          <div className={styles.faqs}>
            {FAQS.map(faq => <details key={faq.q}><summary>{faq.q}<span aria-hidden="true">+</span></summary><p>{faq.a}</p></details>)}
          </div>
        </Container>
      </section>

      <section className={styles.final}>
        <Container>
          <div data-footer-reveal><h2>Start with a free<br />mock today.</h2><p>Pick your exam and practise in the interface you will actually sit.</p><WorkspaceEntryLink href="/app" className={styles.primary}>Open Studocyte <Arrow /></WorkspaceEntryLink></div>
        </Container>
      </section>
    </HomeMotion>
  )
}

const FEATURES = [
  { title: 'Feedback from a tutor', body: 'Submit an essay or interview response for tutor marking. Get a clear account of what you did well, what needs work and how to improve your next attempt. Marking uses credits.' },
  { title: 'Practice that targets your gaps', body: "Flag questions, revisit weak topics, and build custom quizzes from any section so your study time goes where it's needed most." },
  { title: 'Practice that suits the format', body: 'Sit complete, section-timed mocks for UCAT, GAMSAT and ISAT, or rehearse with timed MMI circuits and full panel interviews. Record your answers, read your transcripts and save personal stories to revisit.' },
  { title: 'See where you stand', body: 'Every attempt is tracked, so your accuracy per section shows against the Studocyte cohort average.' },
]
const GAMES = [
  { title: 'Earn XP for every answer', body: 'Faster and more accurate answers earn more, with bonus multipliers for accuracy streaks under time pressure.' },
  { title: 'Daily streaks', body: 'Keep a Duolingo-style streak alive, day after day.' },
  { title: 'Level up each section', body: "See where you're a Level 8 and where you're a Level 2." },
  { title: 'Mastery map', body: 'Sub-skills unlock as accuracy climbs.' },
  { title: 'Weakness heatmap', body: 'Accuracy and speed by question type, so a weak pattern-recognition topic glows red and you know exactly where to drill.' },
  { title: 'Spaced review', body: 'Missed questions return at the perfect moment.' },
]

const STEPS = [
  { title: 'Pick your focus', body: 'Choose UCAT, GAMSAT, ISAT or Interviews. Your next action is ready when you are.' },
  { title: 'Practise by set', body: 'Drill a section or category, timed or untimed, one set at a time.' },
  { title: 'Sit a mock', body: 'Full, section-timed exams in the real interface.' },
  { title: 'Review and repeat', body: 'Read the rationale, review your mistakes, track your accuracy.' },
]

const FAQS = [
  { q: 'Which exams are covered?', a: 'UCAT, GAMSAT and ISAT practice are available, alongside MMI and panel interview practice with recordings, private transcripts, a saved story bank and tutor marking.' },
  { q: 'Is there a free option?', a: 'Yes. Full, timed mock exams are free for every exam. A subscription unlocks the full question bank.' },
  { q: 'How do explanations help?', a: 'Written rationales explain the reasoning behind each answer, so you can understand your mistakes and approach the next question with more confidence.' },
  { q: 'Does it match the real test?', a: 'The runner replicates the layout, fonts, timing and question types of the real interface, including a kiosk mode and on-screen calculator.' },
]

function Arrow() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}
