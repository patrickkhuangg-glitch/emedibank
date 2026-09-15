import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { SampleExpertReview } from '@/components/marketing/interviews/sample-expert-review'
import styles from '@/components/marketing/interviews/landing.module.css'

export const metadata: Metadata = {
  title: 'Sample Interview Review',
  description: 'Explore an illustrative MMI review with personal feedback, domain scores, supporting evidence and the original written answers.',
  alternates: { canonical: '/interview-preparation/sample-review' },
}

export default function SampleReviewPage() {
  return <div className={styles.page}>
    <section className={styles.section}>
      <Container>
        <Link href="/interview-preparation#expert-feedback" className={styles.textLink}>← Back to Interview Preparation</Link>
        <h1>Sample expert review</h1>
        <p className={styles.body}>Read the full feedback, explore each domain score and see the answers behind the assessment.</p>
        <SampleExpertReview/>
        <Link href="/interview-preparation#expert-feedback" className={styles.textLink}>← Back to Interview Preparation</Link>
      </Container>
    </section>
  </div>
}
