import styles from './entry-motion.module.css'

export function WorkspaceLoading({ label = 'Opening your dashboard', detail = 'Getting your study space ready.' }: { label?: string; detail?: string }) {
  return <div className={styles.loading} role="status" aria-live="polite">
    <span className={styles.mark} aria-hidden><svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="8" height="8" rx="2"/><rect x="16" y="4" width="8" height="8" rx="2"/><rect x="4" y="16" width="8" height="8" rx="2"/><rect x="16" y="16" width="8" height="8" rx="2"/></svg></span>
    <strong>{label}</strong><p>{detail}</p><span className={styles.track} aria-hidden><i /></span>
  </div>
}
