import Link from 'next/link'
import { Container } from '@/components/container'
import styles from './exam-coming-soon.module.css'

export function ExamComingSoon({ exam }: { exam: 'UCAT' | 'GAMSAT' | 'ISAT' }) {
  return <section className={styles.page}>
    <Container className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{exam} Preparation</p>
        <h1>Coming <span>soon.</span></h1>
        <p className={styles.description}>We’re getting {exam} ready for Studocyte. Join the opening list to hear when it launches.</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/#opening-list">Join the opening list <Arrow /></Link>
          <Link className={styles.secondary} href="/">Explore Studocyte <Arrow /></Link>
        </div>
      </div>
      <div className={styles.preview} aria-hidden="true">
        <div className={styles.previewHeader}><span>Studocyte<span className={styles.brand}>{exam}</span></span><span className={styles.badge}>Coming soon</span></div>
        <div className={styles.previewBody}>
          <span className={styles.label}>COMING TO STUDOCYTE</span>
          <p className={styles.title}>{exam}<span>on Studocyte.</span></p>
          <div className={styles.lines}><i /><i /><i /></div>
          <div className={styles.previewFooter}><span className={styles.dot} /> In preparation</div>
        </div>
      </div>
    </Container>
  </section>
}

function Arrow() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
}
