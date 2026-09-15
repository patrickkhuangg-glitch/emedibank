'use client'

import { useReviewMotion } from './mock-report/review-motion'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { StudocyteMark } from '@/components/ui/studocyte-mark'
import { aggregateReview, formatQuestionTime, reviewByType, reviewGroups, type ReviewItem, type ReviewSection } from '@/lib/mock/review'
import { percentileLabel, UCAT_ANZ_2026 } from '@/lib/ucat/benchmarks'
import type { AnzPercentile } from '@/lib/ucat/benchmarks'
import styles from './mock-review.module.css'
import { ErrorClassification } from './mock-report/error-classification'
import type { ErrorCategory } from '@/lib/mock/report/reflection'
import type { MockReport } from '@/lib/mock/report/types'
import { PreviousMockAverage } from './mock-report/previous-average'
import { LockedReport } from './mock-report/panels'
import { PercentileCurve } from './percentile-curve'
import { percentileBand } from './percentile-bands'

const statusText = { correct: 'Correct', partial: 'Partial credit', incorrect: 'Incorrect', unanswered: 'Unanswered', unavailable: 'Marking unavailable' }

function AnswerRationale({ text }: { text: string }) {
  const sections = text.split(/\n{2,}/).map(section => section.trim()).filter(Boolean)
  return <div className={styles.rationale}>{sections.map((section, index) => {
    const isAnswerHeading = section.startsWith('Most appropriate:') || section.startsWith('Least appropriate:')
    return <p className={isAnswerHeading ? styles.rationaleHeading : undefined} key={`${index}-${section.slice(0, 24)}`}>{section}</p>
  })}</div>
}

export function MockReview({ label, examSlug, items, sections, totalScore, totalPercentile, demo = false, variant = 'mock', onReveal, sectionNavigation, onSectionSelect, premiumAnalytics = true, takeaways, reportContent, initialSelected = null, comparisonReport, comparisonLoading = false, onClassify }: {
  label: string; examSlug: string; items: ReviewItem[]; sections: ReviewSection[]
  totalScore: number | null; totalPercentile: AnzPercentile | null; demo?: boolean; variant?: 'mock' | 'practice'
  onClassify?: (questionId:string,category:ErrorCategory|null)=>Promise<void>
  comparisonReport?: MockReport | null; comparisonLoading?: boolean
  premiumAnalytics?: boolean; takeaways?: ReactNode; reportContent?: ReactNode; initialSelected?: string | null
  onReveal?: (id: string) => Promise<void>; sectionNavigation?: ReactNode; onSectionSelect?: (slug: string) => void
}) {
  const reviewRef=useReviewMotion()
  const [selected, setSelected] = useState<string | null>(initialSelected)
  const [filter, setFilter] = useState('all')
  const [type, setType] = useState('all')
  const [loading, setLoading] = useState<string | null>(null)
  const [revealError, setRevealError] = useState(false)
  const stats = aggregateReview(items)
  const groups = reviewGroups(items)
  const byType = reviewByType(items)
  const current = items.find(q => q.id === selected)
  const navigationItems=current?items.filter(q=>q.section===current.section):items
  const score = sections.length === 1 ? sections[0].scaled : totalScore
  const percentile = sections.length === 1 ? sections[0].percentile : totalPercentile
  const visible = (q: ReviewItem) => (filter === 'all' || q.status !== 'correct') && (type === 'all' || q.questionType === type)
  async function select(q: ReviewItem) {
    setSelected(q.id)
    setRevealError(false)
    document.querySelector('[data-review-scroll]')?.scrollTo({ top: 0, behavior: 'instant' })
    if (!q.graded && onReveal) {
      setLoading(q.id)
      try { await onReveal(q.id) } catch { setRevealError(true) } finally { setLoading(null) }
    }
  }
  function questionNumbers(questions: ReviewItem[], sectionName: string) {
    return <nav className={styles.questionStrip} aria-label="Jump to a review question">
          <div className={styles.questionStripHeading}><strong>{sectionName} · Questions</strong><span>Green: correct · Red: incorrect · Purple: partial · Grey: unanswered · Outlined: current</span></div>
          <div className={styles.questionStripNumbers}>{questions.map(q => <button
            key={q.id} type="button" data-status={q.status}
            aria-label={`Question ${q.number}: ${statusText[q.status]}`}
            aria-current={q.id === selected ? 'step' : undefined}
            title={`Question ${q.number} · ${statusText[q.status]}`}
            onClick={() => select(q)}
          >{q.number}</button>)}</div>
        </nav>
  }
  function rows(questions: ReviewItem[]) {
    return <div className={styles.questionRows}>{questions.filter(visible).map(q => <button className={styles.questionRow} key={q.id} onClick={() => select(q)} aria-label={`${q.sectionName}: review question ${q.number}`}>
      <span className={styles.questionNumber}>{q.number}</span>
      <span className={styles.questionTitle}><strong>{q.question?.stem ?? 'Question unavailable'}</strong><small>{q.questionType}</small></span>
      <span className={styles.status} data-status={q.status}>{statusText[q.status]}</span>
      <span className={styles.rowTime}>{formatQuestionTime(q.seconds)}<small>on question</small></span>
      <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
    </button>)}</div>
  }
  function groupBreakdown(sectionItems: ReviewItem[]){
    const scopedGroups=reviewGroups(sectionItems)
    return <>            {scopedGroups.filter(g => g.items.length > 1 && g.items.some(visible)).map((group, i) => <details className={styles.set} key={group.id} >
              <summary><span className={styles.setHeading}><b>Questions {group.items[0].number}–{group.items[group.items.length - 1].number}</b><span>{group.title}</span></span><span className={styles.setStats}><b>{group.complete ? group.raw : '—'}/{group.maximum} marks</b><span>{formatQuestionTime(group.seconds)} total</span><strong>{formatQuestionTime(group.averageSeconds)} / question</strong></span><svg className={styles.setToggle} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></summary>
              {rows(group.items)}
            </details>)}
            {scopedGroups.some(g => g.items.length === 1 && g.items.some(visible)) && <section className={styles.singles}><h3>Standalone questions <span>{scopedGroups.filter(g => g.items.length === 1).length} individual sets</span></h3>{rows(scopedGroups.filter(g => g.items.length === 1).flatMap(g => g.items))}</section>}
</>
  }
  return <div ref={reviewRef} className={styles.review} data-detail={!!reportContent} data-overview={!current && sections.length > 1} data-review-scroll>
    <div className={styles.depthField} aria-hidden="true"><span/><span/></div>
    <header className={styles.header}><div className={styles.headerInner}>
      <Link href="/dashboard" className={styles.logo}><StudocyteMark variant="clean" size={32} /><span>Studocyte<small>Part of EMeducate</small></span></Link>
      <Link href={variant === 'practice' ? `/practice/${examSlug}` : `/mock/${examSlug}`} className={styles.back}>Back to {variant === 'practice' ? 'practice' : 'mock exams'}</Link>
    </div></header>
    <main className={styles.main}>{sectionNavigation}
      {demo && <div className={styles.previewNote}>Review preview · Real questions with example answers and timings. This is not a saved student attempt.</div>}
      {reportContent ? reportContent : current ? <>
        <button className={styles.textButton} onClick={() => setSelected(null)}>Back to your results</button>
        {questionNumbers(navigationItems,current.sectionName)}
        <div className={styles.titleRow}><div><h1>Question {current.number}</h1><p>{current.sectionName} · {current.setTitle} · {current.questionType}</p></div><span className={styles.status} data-status={current.status}>{statusText[current.status]}</span></div>
        <div className={styles.detailStats}>{comparisonReport?.confidenceChoices?.[current.id]&&<span>Confidence before marking: <strong>{comparisonReport.confidenceChoices[current.id]}</strong></span>}<span><strong>{current.score ?? '—'} / {current.maximum}</strong> marks</span><span><strong>{formatQuestionTime(current.seconds)}</strong> on this question</span><span><strong>{formatQuestionTime(groups.find(g => g.items.some(q => q.id === current.id))?.averageSeconds ?? current.seconds)}</strong> average per question in this set</span></div>
        <div className={styles.answerLayout}>
          <section className={styles.stimulus}><h2>Question and information</h2>
            {current.question?.passage && <p className={styles.passage}>{current.question.passage}</p>}
            {(current.question?.tables ?? []).map((table, i) => <div key={i} className={styles.tableScroll}><table className={styles.stimulusTable}><thead><tr>{table.headers.map((h, j) => <th key={j}>{h}</th>)}</tr></thead><tbody>{table.rows.map((row, j) => <tr key={j}>{row.map((value, k) => <td key={k}>{value}</td>)}</tr>)}</tbody></table></div>)}
            {(current.question?.images ?? []).map((src, i) => <img key={i} src={src} alt={`Question ${current.number} diagram ${i + 1}`} className={styles.diagram} />)}
            <h3 className={styles.stem}>{current.question?.stem}</h3>
            {current.graded?.kind === 'mcq' && <div className={styles.answers}>{current.question?.options.map(option => {
              const g = current.graded!
              if (g.kind !== 'mcq') return null
              const correct = g.result.correct_option_id === option.id, picked = g.selectedId === option.id
              return <div key={option.id} className={styles.answer} data-correct={correct} data-picked={picked}><b>{option.label}</b><span>{option.body}</span><small>{correct ? picked ? 'Your answer · correct' : 'Correct answer' : picked ? 'Your answer' : ''}</small></div>
            })}</div>}
            {current.graded?.kind === 'grid' && <div className={styles.answers}>{current.question?.statements?.map(statement => {
              const g = current.graded!; if (g.kind !== 'grid') return null
              const answer = g.result.per_statement.find(s => s.index === statement.index)
              return <div key={statement.index} className={styles.gridAnswer}><span>{statement.text}</span><small>Your answer: {g.answers[statement.index] ?? 'Unanswered'} · Correct: {answer?.correct_answer}</small></div>
            })}</div>}
            {current.graded?.kind === 'ml' && <div className={styles.answers}>{(['most', 'least'] as const).map(slot => {
              const g = current.graded!; if (g.kind !== 'ml') return null
              const correctIndex = slot === 'most' ? g.result.correct_most : g.result.correct_least
              return <div key={slot} className={styles.gridAnswer}><b>{slot === 'most' ? 'Most appropriate' : 'Least appropriate'}</b><span>Your answer: {current.question?.mostLeast?.actions.find(a => a.index === g.choice[slot])?.text ?? 'Unanswered'}</span><span>Correct answer: {current.question?.mostLeast?.actions.find(a => a.index === correctIndex)?.text}</span></div>
            })}</div>}
          </section>
          <section className={styles.explanation}><h2>Answer explanation</h2>{loading === current.id ? <p role="status">Loading explanation…</p> : current.graded?.result.explanation_text ? <AnswerRationale text={current.graded.result.explanation_text} /> : <><p>{revealError ? 'The explanation could not be loaded.' : 'No explanation is available for this question yet.'}</p>{onReveal && <button className={styles.textButton} onClick={() => select(current)}>Try again</button>}</>}{onClassify&&comparisonReport&&current.score!=null&&current.score<current.maximum&&<ErrorClassification confidence={comparisonReport.confidenceChoices?.[current.id]} key={current.id} category={comparisonReport.annotations?.find(a=>a.questionId===current.id)?.category??null} onSave={category=>onClassify(current.id,category)}/>}</section>
        </div>
        <nav className={styles.questionNavigation} aria-label="Review question navigation"><button disabled={navigationItems[0]?.id === current.id} onClick={() => select(navigationItems[navigationItems.indexOf(current) - 1])}>Previous question</button><span>{current.number} of {navigationItems.length}</span><button disabled={navigationItems[navigationItems.length - 1]?.id === current.id} onClick={() => select(navigationItems[navigationItems.indexOf(current) + 1])}>Next question</button></nav>
      </> : <>
        <div className={styles.titleRow}><div><h1>Your {variant === 'practice' ? 'practice' : 'mock'} review</h1><p>{label}</p></div><button className={styles.primary} onClick={() => { const first = items.find(q => q.status !== 'correct'); if (first) select(first) }} disabled={items.every(q => q.status === 'correct')}>Review missed questions</button></div>
        <div className={styles.metrics}>
          <div><span>Raw score</span><strong>{stats.complete ? stats.raw : '—'}<small> / {stats.maximum}</small></strong><p>{stats.correct} of {stats.count} fully correct</p></div>
          {variant === 'practice' ? <>
            <div><span>Accuracy</span><strong className={styles.violet}>{stats.complete && stats.maximum ? Math.round(stats.raw / stats.maximum * 100) : '—'}<small> %</small></strong><p>Percentage of available marks</p></div>
            <div><span>Questions answered</span><strong className={styles.percentile}>{items.filter(q => q.status !== 'unanswered').length}<small> / {items.length}</small></strong><p>{items.filter(q => q.status === 'unanswered').length} left unanswered</p></div>
          </> : <>
          <div><span>Estimated scaled score</span><strong className={styles.violet}>{score ?? '—'}<small> / {sections.length === 1 ? 900 : 2700}</small></strong><p>{sections.length === 1 ? sections[0].name : 'Cognitive total · SJT separate'}</p></div>
          <div data-percentile-band={percentileBand(percentile)}><span>Estimated ANZ percentile</span><strong className={styles.percentile}>{percentile ? percentile.kind === 'estimate' ? `${percentile.value}` : percentile.kind === 'above' ? '> 90' : '< 10' : '—'}<small>{percentile?.kind === 'estimate' ? ' / 100' : ''}</small></strong><div className={styles.percentileCurve}><PercentileCurve percentile={percentile}/></div><p>{percentile ? percentileLabel(percentile) : 'Unavailable until marking completes'}</p></div>
          </>}
          {variant === 'mock' ? <PreviousMockAverage report={comparisonReport} loading={comparisonLoading} score={score} section={sections.length===1?sections[0].slug:undefined}/> : <div><span>Time on questions</span><strong>{formatQuestionTime(stats.seconds)}</strong><p>{formatQuestionTime(stats.averageSeconds)} average per question</p></div>}
        </div>
        {variant === 'mock' && <div className={styles.percentileLegend} aria-label="Percentile colour bands"><span>Percentile bands</span>{['0–19','20–39','40–59','60–79','80–100'].map((label,index)=><span key={label} data-percentile-band={index}><i aria-hidden="true"/>{label}</span>)}</div>}
        {sections.length === 1 && questionNumbers(items,sections[0].name)}
        {sections.length > 1 && <section className={styles.overviewSections} aria-label="Section results">
          <div className={styles.overviewHeading}><h2>Explore your sections</h2><p>Select a section to review its questions and analytics.</p></div>
          <div className={styles.scoreColumns} aria-hidden="true"><span>Section</span><span>Raw marks</span><span>Estimated score</span><span>Estimated ANZ percentile</span><span>Previous average / trend</span><span/></div>
          {sections.map(section => {
            const sectionItems=items.filter(q=>q.section===section.slug), summary=aggregateReview(sectionItems);
            const abbreviation=({'verbal-reasoning':'VR','decision-making':'DM','quantitative-reasoning':'QR','situational-judgement':'SJT'} as Record<string,string>)[section.slug];
            return <button className={styles.scoreRow} data-section={section.slug} key={section.slug} onClick={()=>onSectionSelect?.(section.slug)} aria-label={`Open ${section.name} review`}>
              <span className={styles.scoreIdentity}><b className={styles.sectionBadge}>{abbreviation}</b><span><strong>{section.name}</strong><small>{summary.count} questions · {reviewGroups(sectionItems).length} sets</small></span></span>
              <span className={styles.scoreRaw}><small className={styles.mobileLabel}>Raw marks</small><strong>{section.complete?section.raw:'—'}<em> / {section.maximum}</em></strong><small>{summary.correct} fully correct</small></span>
              <span className={styles.scoreScaled}><small className={styles.mobileLabel}>Estimated score</small><strong>{section.scaled ?? '—'}<em> / 900</em></strong><span className={styles.scoreTrack} aria-hidden="true"><i style={{width:`${section.scaled == null ? 0 : Math.max(0,Math.min(100,(section.scaled-300)/600*100))}%`}}/></span></span>
              <span className={styles.scorePercentile} data-percentile-band={percentileBand(section.percentile)}><small className={styles.mobileLabel}>Estimated ANZ percentile</small><strong>{section.percentile ? percentileLabel(section.percentile) : 'Unavailable'}</strong><PercentileCurve percentile={section.percentile}/>{section.slug==='situational-judgement' && <small>Provisional · separate from total</small>}</span>
              <PreviousMockAverage report={comparisonReport} loading={comparisonLoading} score={section.scaled} section={section.slug} compact/>
              <svg className={styles.scoreArrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
            </button>
          })}
        </section>}
        {takeaways}
        {sections.length === 1 && <div className={styles.reviewLayout}>
          <section className={styles.breakdown}><div className={styles.sectionHeading}><div><h2>Question breakdown</h2><p>Time includes every visit to a question.</p></div></div>
            <div className={styles.filters}><div role="group" aria-label="Filter by result"><button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All questions</button><button aria-pressed={filter === 'missed'} onClick={() => setFilter('missed')}>Missed questions</button></div>{premiumAnalytics && <select aria-label="Filter by question type" value={type} onChange={event => setType(event.target.value)}><option value="all">All question types</option>{byType.map(row => <option key={row.name}>{row.name}</option>)}</select>}</div>
            {groupBreakdown(items)}
            {!items.some(visible) && <p className={styles.empty}>No questions match this filter.</p>}
          </section>
          <aside className={styles.analytics}>{premiumAnalytics ? <><h2>By question type</h2><p>Accuracy and pace within this {variant === 'practice' ? 'practice session' : 'mock'}.</p><div className={styles.typeColumns}><span>Type / marks</span><span>Avg. time</span></div>{byType.map(row => <button key={row.name} onClick={() => setType(type === row.name ? 'all' : row.name)} aria-pressed={type === row.name} className={styles.typeRow}><span><strong>{row.name}</strong><small>{row.raw}/{row.maximum} marks · {row.count} question{row.count === 1 ? '' : 's'}</small><i><em style={{ width: `${row.maximum ? row.raw / row.maximum * 100 : 0}%` }} /></i></span><b>{formatQuestionTime(row.averageSeconds)}</b></button>)}<p className={styles.analyticsNote}>Small groups describe this attempt, not your overall ability. Select a type to filter the questions.</p></> : <LockedReport title="Full question-type breakdown" preview/>}</aside>
        </div>}
        <details className={styles.method}><summary>About scores, comparisons, bell curves and timing</summary><p>Previous averages use up to ten earlier completed mocks with an available estimated score. This mock is excluded. Overall comparisons use cognitive totals; SJT remains separate. The change shows this result versus that average. Forms can differ in difficulty and repeats may benefit from familiarity.</p><p>Bell curves illustrate percentile rank, not the observed score distribution. Shaded tails indicate below the 10th or above the 90th percentile. The centre is the 50th percentile.</p>{variant === 'mock' && <p>Scores and percentiles are practice estimates. Percentiles compare the estimated scaled score with <a href={UCAT_ANZ_2026.source} target="_blank" rel="noreferrer">official 2026 ANZ statistics</a>, interpolating between published quartiles and deciles. Outside that range, we report below the 10th or above the 90th percentile.</p>}{variant === 'practice' && <p>Practice sessions show earned marks and accuracy. Scaled scores and percentiles are shown after mock exams.</p>}<p>Time includes repeat visits and time with the calculator or navigator open on a question. Loading, marking, section breaks and reviewing answers are excluded. Set averages divide the set’s total time by all questions in that set, including unanswered questions.</p>{sections.some(s => s.band != null) && <p>SJT uses a provisional percentage-based ANZ score and is separate from the cognitive total.</p>}</details>
      </>}
    </main>
  </div>
}
