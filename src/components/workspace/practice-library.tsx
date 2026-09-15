import Link from 'next/link'
import type { SectionStat } from '@/lib/practice/stats'
import { isEssaySection } from '@/lib/essays/config'
import styles from './practice-library.module.css'

export function PracticeLibrary({ examSlug, stats, entitled, preview = false }: { examSlug: string; stats: SectionStat[]; entitled: boolean; preview?: boolean }) {
  const weakest = [...stats].filter(s => s.attempted >= 5 && s.yourPct !== null).sort((a,b) => a.yourPct! - b.yourPct!)[0]
  return <div className={styles.library}>
    {weakest && entitled && <p className={styles.suggestion}><span aria-hidden>↗</span><span><strong>A useful place to focus: {weakest.name}.</strong> Your accuracy here is {weakest.yourPct}%. Try a short session.</span></p>}
    <div className={styles.list}>
      <div className={styles.listHeading}><span>Choose a section</span><span>Progress</span></div>
      {stats.map((s, index) => {
        const essay = isEssaySection(examSlug, s.slug)
        const target = !entitled ? '/pricing' : essay ? `/essays/${examSlug}/${s.slug}` : `/practice/${examSlug}/${s.slug}`
        const pct = s.total ? Math.min(100, Math.round(s.attempted / s.total * 100)) : 0
        return <Link className={styles.row} key={s.id} href={preview ? `/prototypes/workspace?exam=${examSlug}&view=section&section=${encodeURIComponent(s.slug)}` : target}>
          <span className={styles.icon}>{String(index + 1).padStart(2, '0')}</span>
          <span className={styles.name}><strong>{s.name}</strong><small>{!entitled ? 'Unlock to practise' : essay ? 'Timed writing · tutor feedback' : s.yourPct === null ? 'Start building your baseline' : `${s.yourPct}% accuracy${weakest?.id === s.id ? ' · Suggested focus' : ''}`}</small></span>
          <span className={styles.progress}>{essay ? <span className={styles.essay}>Essay practice</span> : <><span>{s.attempted.toLocaleString()} <small>/ {s.total.toLocaleString()}</small></span><span className={styles.track}><i style={{ width: `${pct}%` }}/></span></>}</span>
          <span aria-hidden className={styles.arrow}>→</span>
        </Link>
      })}
      {!stats.length && <p className={styles.empty}>No sections are available yet.</p>}
    </div>
    <p className={styles.hint}>Choose a section, then a topic and timing that suit your session.</p>
  </div>
}
