import { Wordmark } from '@/components/ui/wordmark'
import styles from './entry-motion.module.css'

/** A brief account-entry handoff. It mounts with the student workspace layout,
 * so internal workspace navigation does not replay it. */
export function WorkspaceWelcome({ name, persistent = false }: { name: string; persistent?: boolean }) {
  return (
    <div
      className={styles.welcome}
      data-persistent={persistent || undefined}
      role="status"
      aria-live="polite"
      aria-label={`Welcome back, ${name}. Preparing your study space.`}
    >
      <div className={styles.welcomeContent}>
        <Wordmark variant="clean" markSize={34} endorsement className={styles.welcomeWordmark} />
        <p className={styles.welcomeEyebrow}>Your workspace</p>
        <p className={styles.welcomeTitle}>Welcome back, {name}.</p>
        <p className={styles.welcomeDetail}>Preparing your study space</p>
        <span className={styles.welcomeTrack} aria-hidden><i /></span>
      </div>
    </div>
  )
}
