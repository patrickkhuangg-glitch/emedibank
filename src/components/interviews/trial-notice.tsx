import Link from 'next/link'
import type { InterviewAccess } from '@/lib/interviews/trial'
import styles from './trial-notice.module.css'
import { AccessNotice } from '@/components/workspace/access-notice'

export function InterviewTrialNotice({ access }: { access: InterviewAccess }) {
  if (access.kind === 'full') return null
  const active = access.kind === 'active'
  const ended = access.kind === 'expired'
  return <div className="page-frame"><AccessNotice
    key={`interviews${ended ? '-expired' : access.kind === 'unavailable' ? '-unavailable' : ''}`}
    label={ended ? 'Trial ended' : access.kind === 'unavailable' ? 'Trial access' : 'Limited trial access'}
    title={ended ? 'Your free trial has ended' : active ? 'Your interview trial' : access.kind === 'eligible' ? 'Try Interviews for seven days' : 'Free trial unavailable'}
    pricingHref="/pricing#interviews"
    summary={ended ? 'You can still read your saved transcripts, stories and released feedback. Get full access to continue practising.' : ['eligible','active'].includes(access.kind) ? <><strong>15 MMI stations</strong>, <strong>one question from each of 32 panel themes</strong> and <strong>two trial mocks.</strong> {active ? <>Ends {new Date(access.expiresAt!).toLocaleDateString('en-AU', {timeZone:'Australia/Sydney', day:'numeric',month:'short'})}.</> : 'Your seven days start with your first practice.'}</> : 'We’re preparing free trials. Your saved work is still available.'}>
    {access.processingPaused&&<p role="status" className={styles.paused}>Trial transcription is temporarily paused. You can keep practising, replay recordings on your device and download them.</p>}
    {['eligible','active'].includes(access.kind) && <>
      <div className={styles.comparison} role="table" aria-label="Free trial and paid interview access">
        <div className={styles.comparisonHeader} role="row">
          <div className={styles.trialCell} role="columnheader"><span className={styles.planLabel}>Free trial</span><strong>Limited selection</strong></div>
          <div className={styles.paidCell} role="columnheader"><span className={styles.planLabel}>Paid Interviews</span><strong>Unlock full access</strong></div>
        </div>
        <ComparisonRow trial="15 MMI stations" locked="Remaining MMI stations locked" paid="Full MMI station bank" detail="Explore every available station." />
        <ComparisonRow trial="1 question per panel theme" locked="Further panel questions locked" paid="Every panel question" detail="Practise beyond the first question in each theme." />
        <ComparisonRow trial="1 two-station MMI + 1 panel mock" locked="Full MMI circuits locked" paid="Full eight-station MMI circuits" detail="Plus panel mocks with varied question selections." />
      </div>
      <p className={styles.marking}><strong>{active ? `${access.credits} marking credits available.` : 'Trial marking: 2 credits for one MMI station.'}</strong> Annual plans include 25 marked MMI stations; monthly plans offer marking separately. Additional marked stations can be purchased.</p>
      <p className={styles.details}>Record and replay on your device as often as you like during your trial; <strong>saved recordings use your trial allowance.</strong></p>
    </>}
    <p className={styles.footer}>Prefer full access straight away? Subscribe at any time. <Link href="/interview-trial">Trial allowances and privacy</Link></p>
  </AccessNotice></div>
}

function ComparisonRow({ trial, locked, paid, detail }: { trial: string; locked: string; paid: string; detail: string }) {
  return <div className={styles.comparisonRow} role="row">
    <div className={styles.trialCell} role="cell">
      <strong>{trial}</strong>
      <div className={styles.lockedPreview}>
        <span className={styles.previewLines} aria-hidden="true"><i /><i /><i /></span>
        <span className={styles.lockedLabel}><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3.5" y="7" width="9" height="7" rx="1.5"/><path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7"/></svg>{locked}</span>
      </div>
    </div>
    <div className={styles.paidCell} role="cell"><strong className={styles.included}><span aria-hidden="true">✓</span>{paid}</strong><p>{detail}</p></div>
  </div>
}
