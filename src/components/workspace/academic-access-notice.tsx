import type { SectionAccess } from '@/lib/access'
import { AccessNotice } from './access-notice'
import styles from '@/components/interviews/trial-notice.module.css'

export function AcademicAccessNotice({ exam, access }: { exam: { name: string; slug: string }; access: SectionAccess[] }) {
  const available = access.filter(section => !section.locked)
  const locked = access.filter(section => section.locked)
  if (!locked.length) return null
  return <AccessNotice key={exam.slug} label="Limited free access" title={`Explore ${exam.name}`} summary={available.length ? <>Your free access includes <strong>{available.map(section => section.name).join(', ')}.</strong> Subscribe to unlock the remaining sections.</> : <>Subscribe to unlock <strong>{exam.name} practice sections.</strong></>}>
    <div className={styles.comparison} role="table" aria-label={`Free and paid ${exam.name} access`}>
      <div className={styles.comparisonHeader} role="row">
        <div className={styles.trialCell} role="columnheader"><span className={styles.planLabel}>Free access</span><strong>{available.length} of {access.length} sections</strong></div>
        <div className={styles.paidCell} role="columnheader"><span className={styles.planLabel}>Paid {exam.name}</span><strong>All {access.length} sections</strong></div>
      </div>
      {access.map(section => <div className={styles.comparisonRow} role="row" key={section.id}>
        <div className={styles.trialCell} role="cell">{section.locked ? <div className={styles.lockedPreview}><span className={styles.previewLines} aria-hidden="true"><i/><i/><i/></span><span className={styles.lockedLabel}><span aria-hidden="true">⊘</span>{section.name} · Locked</span></div> : <strong>✓ {section.name}</strong>}</div>
        <div className={styles.paidCell} role="cell"><strong className={styles.included}><span aria-hidden="true">✓</span>{section.name}</strong></div>
      </div>)}
    </div>
  </AccessNotice>
}
