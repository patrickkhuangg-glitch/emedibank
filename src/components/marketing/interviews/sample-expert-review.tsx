import sample from '@/lib/interviews/marketing-sample-review.json'
import styles from './sample-expert-review.module.css'

const domainNames: Record<string, string> = {
  communication_rapport: 'Communication & Rapport',
  content_reasoning: 'Content & Reasoning',
  ethical_professional: 'Ethical & Professional Judgement',
  empathy: 'Empathy & Interpersonal Sensitivity',
  insight_reflection: 'Insight & Reflection',
}

function QuestionReferences({ references }: { references: string[] }) {
  return <span className={styles.references}>{references.length === 1 ? 'Question' : 'Questions'} {references.map(ref => ref.slice(1)).join(' & ')}</span>
}

/** Public, user-supplied written example; never loads a student's assessment. */
export function SampleExpertReview() {
  return <article id="sample-review" className={styles.report} aria-labelledby="sample-review-title">
    <header className={styles.header}>
      <p className={styles.eyebrow}>Inside a sample review</p>
      <h3 id="sample-review-title">{sample.title}</h3>
      <p>MMI · Ethics · Written example · Questions 1–3 answered</p>
    </header>

    <details className={styles.context}>
      <summary>Read the station and sample answers <span aria-hidden="true">+</span></summary>
      <div className={styles.contextBody}>
        <h4>The scenario</h4><p>{sample.scenario}</p>
        {sample.questions.map(question => <details key={question.number} className={styles.question}>
          <summary><span><small>Question {question.number}{!question.answer && ' · No answer supplied'}</small>{question.prompt}</span><span aria-hidden="true">+</span></summary>
          <div className={styles.answer}><h5>Sample answer</h5>{question.answer ? question.answer.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>) : <p>No personal example was supplied. This part remains unassessed.</p>}</div>
        </details>)}
      </div>
    </details>

    <section className={styles.overall} aria-labelledby="sample-overall-title">
      <div><p className={styles.eyebrow}>Overall feedback</p><h4 id="sample-overall-title">A thoughtful approach to a difficult conversation.</h4><p>{sample.closing.verdict} {sample.closing.successful_improvement}</p></div>
      <aside className={styles.coverage}><span>{sample.displayRating.label}</span><strong>{sample.displayRating.score}/7</strong><p>Question 4 has no answer and remains unassessed. This sample score covers the supplied answers only.</p><small>4 domains assessed · 1 unassessed</small></aside>
    </section>

    <div className={styles.feedback}>
      <section aria-labelledby="sample-strengths-title"><h4 id="sample-strengths-title">What you did well</h4><ol>{sample.strengths.map((point, i) => <li key={point.domain}><span className={styles.number}>{String(i + 1).padStart(2, '0')}</span><div><p>{point.text}</p><QuestionReferences references={point.references}/></div></li>)}</ol></section>
      <section aria-labelledby="sample-improvements-title"><h4 id="sample-improvements-title">What to improve</h4><ol>{sample.priorities.map((point, i) => <li key={point.domain}><span className={styles.number}>{String(i + 1).padStart(2, '0')}</span><div><p>{point.text}</p><QuestionReferences references={point.references}/></div></li>)}</ol></section>
    </div>

    <section className={styles.domains} aria-labelledby="sample-domains-title">
      <h4 id="sample-domains-title">The detail behind each score</h4>
      <p>Open a domain to see the reasoning, words from the response and a specific improvement.</p>
      {sample.domains.map(domain => <details key={domain.key} className={styles.domain}>
        <summary><span>{domainNames[domain.key]}</span><span className={styles.domainScore}>{domain.score === null ? 'Unassessed' : `${domain.score}/7`}</span><span className={styles.toggle} aria-hidden="true">+</span></summary>
        <div className={styles.domainBody}>
          <div><h5>Why this rating</h5><p>{domain.rationale}</p><h5>{domain.score === null ? 'What is needed' : 'How to strengthen this'}</h5><p>{domain.improvement || domain.needed_evidence}</p></div>
          {domain.evidence.length > 0 && <div><h5>From the response</h5>{domain.evidence.map((evidence, i) => <blockquote key={i}><p>“{evidence.text}”</p><footer><QuestionReferences references={evidence.references}/></footer></blockquote>)}</div>}
        </div>
      </details>)}
    </section>
    <footer className={styles.footer}>Illustrative assessment based on a supplied written example, not a completed tutor review or a student testimonial. These example ratings assess the wording only; no audio or video was supplied.</footer>
  </article>
}
