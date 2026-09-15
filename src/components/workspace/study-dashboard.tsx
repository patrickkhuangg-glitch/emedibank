import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Dashboard } from '@/lib/dashboard/stats'
import type { SectionAccess } from '@/lib/access'
import { isEssaySection } from '@/lib/essays/config'
import { DailyPractice, DashboardAchievements } from './dashboard-achievements'
import { DashboardMotion } from './dashboard-motion'
import { AcademicAccessNotice } from './academic-access-notice'
import styles from './study-dashboard.module.css'

export function StudyDashboard({ first, exam, data: d, access, preview = false }: {
  first: string; exam: { name: string; slug: string }; data: Dashboard; access: SectionAccess[]; preview?: boolean
}) {
  const available = access.filter(s => !s.locked)
  const weakest = [...d.sections].filter(s => s.attempted >= 5 && s.accuracy !== null && available.some(a => a.id === s.id)).sort((a,b) => a.accuracy! - b.accuracy!)[0]
  const focus = weakest ?? available[0]
  const practice = `/practice/${exam.slug}`
  const href = (path: string) => preview ? `/prototypes/workspace?exam=${exam.slug}&view=${path.startsWith('/mock') ? 'mock' : 'practice'}` : path
  const sectionHref = (slug: string) => isEssaySection(exam.slug, slug) ? `/essays/${exam.slug}/${slug}` : `${practice}/${slug}`
  const review = d.reviewDue.length
  const primaryHref = review ? `/session?exam=${exam.slug}&mode=review` : focus ? sectionHref(focus.slug) : practice
  const mastered = d.mastery.flatMap(s => s.nodes).filter(n => n.state === 'mastered').length
  const started = d.mastery.flatMap(s => s.nodes).filter(n => n.count > 0).length
  const heat = [...d.heatmap].filter(c => c.count > 0).sort((a,b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))
  return <DashboardMotion key={`${exam.slug}-${d.attempted}`} className={`page-frame page-shell ${styles.dashboard}`}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>{exam.name} · Dashboard</p><h1 className="page-title">Welcome back, {first}.</h1><p>Small steps today. More confidence on exam day.</p></div>
      <span className={`${styles.status} ${d.practisedToday ? styles.mint : ''}`}><span aria-hidden>{d.practisedToday ? '✓' : '○'}</span>{d.practisedToday ? 'Practice logged today' : 'Ready when you are'}</span>
    </header>
    <AcademicAccessNotice exam={exam} access={access} />
    <div className={styles.topGrid}>
      <section className={styles.focus} aria-labelledby="next-practice-title">
        <div className={styles.focusTop}><span className={styles.eyebrow}><span className={styles.focusDot} /> Your next step</span><span className={styles.focusBadge}>{review ? 'Review due' : weakest ? 'Suggested practice' : 'Build your baseline'}</span></div>
        <h2 id="next-practice-title">{review ? 'Make your learning stick.' : weakest ? `A little focus on ${weakest.name.toLowerCase()}.` : 'Find your starting point.'}</h2>
        <p>{review ? `${review} question${review === 1 ? ' is' : 's are'} ready to revisit. Return to the ideas you missed and give them another try.` : weakest ? `${weakest.accuracy}% accuracy across ${weakest.attempted} answers. This is your lowest practised section—give it a focused session.` : 'Choose a section and answer a few questions. Your practice will shape what appears here next.'}</p>
        <div className={styles.focusBottom}><Link href={href(primaryHref)} className={styles.primary}>{review ? `Review ${review} questions` : focus ? 'Open practice' : 'Choose a section'}<Arrow /></Link><span>{review ? 'Based on your previous answers' : 'At your own pace'}</span></div>
        <div className={styles.focusTexture} data-progress-parallax aria-hidden><i /><i /><i /></div>
      </section>
      <section className={styles.levelCard} aria-labelledby="level-title">
        <div className={styles.sectionHead}><h2 id="level-title">Your momentum</h2><a href="#learning-progress" className={styles.levelBadge}>View milestones ↓</a></div>
        <div className={styles.levelMain}><div className={styles.ring} style={{ '--progress': `${Math.round(d.into * 100)}%` } as CSSProperties}><span><b>{d.level}</b><small>LEVEL</small></span></div><div><strong>{d.totalXp.toLocaleString()} <small>XP</small></strong><p>{d.hasData ? `${d.toNext.toLocaleString()} XP to level ${d.level + 1}` : 'Your first level starts here'}</p></div></div>
        <div className={styles.levelFoot}><span className={styles.streakIcon} aria-hidden>↗</span><span><b>{d.dailyStreak} day{d.dailyStreak === 1 ? '' : 's'}</b> of consistent practice</span></div>
      </section>
    </div>
    <dl className={styles.stats}>
      <div><dt>Questions answered</dt><dd>{d.attempted.toLocaleString()}<small>All practice</small></dd></div>
      <div><dt>Practice accuracy</dt><dd>{d.accuracy === null ? '—' : `${d.accuracy}%`}<small>{d.hasData ? `${d.correct.toLocaleString()} correct` : 'Build your baseline'}</small></dd></div>
      <div data-tone="mastery"><dt>Topics mastered</dt><dd>{mastered}<small>{started ? `Across ${started} practised topics` : 'Explore your first topic'}</small></dd></div>
      <div data-tone={review ? "review" : undefined}><dt>Review queue</dt><dd className={review ? styles.amberText : undefined}>{review}<small>{review ? 'Ready to revisit' : d.reviewUpcoming ? `${d.reviewUpcoming} coming up` : 'All clear'}</small></dd></div>
    </dl>
    <DailyPractice activity={d.activity} dailyStreak={d.dailyStreak} practiceHref={href(practice)} />
    <div className={styles.bottomGrid}>
      <section className={styles.panel} aria-labelledby="section-progress-title">
        <div className={styles.sectionHead}><div><h2 id="section-progress-title">Your sections</h2><p>Choose where to put your attention.</p></div><Link href={href(practice)}>View practice <Arrow /></Link></div>
        <div className={styles.sectionList}>{access.map((a,index) => {
          const s = d.sections.find(s => s.id === a.id)
          const recommended = weakest?.id === a.id
          return <Link key={a.id} href={href(a.locked ? '/pricing' : sectionHref(a.slug))} className={styles.sectionRow} data-recommended={recommended}>
            <span className={`${styles.sectionIcon} ${recommended ? styles.amber : ''}`}>{String(index + 1).padStart(2, '0')}</span>
            <div className={styles.sectionName}><strong>{a.name}</strong><span>{a.locked ? 'Unlock to practise' : recommended ? 'Suggested focus' : s?.attempted ? `${s.attempted} answers · Level ${s.level}` : 'Ready to explore'}</span></div>
            <div className={styles.sectionMeter}><span>{a.locked ? 'Locked' : s?.accuracy != null ? `${s.accuracy}%` : 'Not started'}</span><div className={styles.track}><i style={{ width: `${s?.accuracy ?? 0}%` }} /></div></div><Arrow />
          </Link>
        })}{!access.length && <p className={styles.empty}>Sections will appear here when available.</p>}</div>
        <div className={styles.panelFoot}>Accuracy reflects your practice answers, not a predicted exam score.</div>
      </section>
      <aside className={styles.sideStack}>
        <section className={`${styles.panel} ${review ? styles.reviewPanel : ''}`}><div className={styles.sectionHead}><h2>{review ? 'Worth another look' : 'A fresh start'}</h2><span className={styles.status}>{review ? `${review} due` : 'Review'}</span></div><p className={styles.asideCopy}>{review ? 'A second attempt helps you find out what has stayed with you.' : d.reviewUpcoming ? `${d.reviewUpcoming} missed answers will be ready to revisit after a day.` : 'As you practise, missed questions will collect here for another attempt.'}</p>{review > 0 && <ul className={styles.reviewList}>{d.reviewDue.slice(0, 3).map(item => <li key={item.questionId}><span aria-hidden>↺</span><span>{item.tag ?? item.section}<small>{item.section}</small></span></li>)}</ul>}{weakest && review > 0 && <Link className={styles.textLink} href={href(sectionHref(weakest.slug))}>Or practise {weakest.name.toLowerCase()} <Arrow /></Link>}</section>
        <Link className={styles.mockLink} href={href(`/mock/${exam.slug}`)}><span className={styles.sectionIcon}><ExamIcon /></span><span><strong>Ready for a full sitting?</strong><small>Explore practice exams</small></span><Arrow /></Link>
      </aside>
    </div>
    <DashboardAchievements data={d} access={access} examSlug={exam.slug} preview={preview} />
    <details className={styles.details}><summary><span><b>Explore your topic progress</b><small>Accuracy, timing and mastery in one place</small></span><span className={styles.detailPlus} aria-hidden>+</span></summary>
      <div className={styles.topicGrid}>{heat.length ? heat.map(cell => <div className={styles.topicRow} key={`${cell.section}-${cell.tag}`}><span><strong>{cell.tag}</strong><small>{cell.section} · {cell.count} answers</small></span><span className={`${styles.status} ${(cell.accuracy ?? 0) >= 80 ? styles.mint : styles.amber}`}>{cell.accuracy}%</span><span>{cell.avgSeconds === null ? '—' : `${cell.avgSeconds}s avg`}</span></div>) : <p className={styles.empty}>Practise a topic to see your accuracy and average response time here.</p>}</div>
      <p className={styles.panelFoot}>Mastery recognises at least 80% accuracy after three or more answers in a topic.</p>
    </details>
  </DashboardMotion>
}
function Arrow() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14m-5-5 5 5-5 5" /></svg> }
function ExamIcon() { return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h4"/></svg> }
