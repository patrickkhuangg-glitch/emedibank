import Link from 'next/link'
import { Cyto } from '@/components/ui/cyto'
import styles from './focus-token-shop.module.css'

const plannedRewards = [
  { title: 'Cyto accessories', body: 'Small outfits and study props for your hardworking cell.', icon: 'cyto' },
  { title: 'Study-room backgrounds', body: 'A few calm ways to personalise your workspace.', icon: 'room' },
  { title: 'Profile frames', body: 'Show a little personality around your study profile.', icon: 'frame' },
  { title: 'Celebration styles', body: 'Choose how completed learning milestones feel.', icon: 'celebrate' },
] as const

export function FocusTokenShop({ balance, preview = false }: { balance: number | null; preview?: boolean }) {
  const dashboardHref = preview ? '/prototypes/workspace?exam=interviews&view=dashboard' : '/interviews'
  const balanceAvailable = balance !== null
  return <main className={styles.page}>
    <Link className={styles.back} data-haptic="soft" href={dashboardHref}><Back /> Interview dashboard</Link>
    <div className={styles.layout}>
      <section className={styles.status} aria-labelledby="focus-shop-title">
        <div className={styles.statusCopy}>
          <span className={styles.wip}>Work in progress</span>
          <h1 id="focus-shop-title">Focus Token shop</h1>
          <p>We’re building a small collection of ways to personalise your study space. Nothing here will change your access to questions, feedback or learning tools.</p>
          <div className={styles.balance}><span><Token /></span><div><strong>{balanceAvailable ? balance : '—'}</strong><small>{balanceAvailable ? `Focus ${balance === 1 ? 'Token' : 'Tokens'} saved` : 'Balance unavailable'}</small></div></div>
          <p className={styles.safe}><Shield /> {balanceAvailable ? 'Your tokens will stay in your balance while the shop is being prepared.' : 'We couldn’t load your balance right now. Your saved tokens haven’t been changed.'}</p>
          <Link className={styles.return} data-haptic="confirm" href={dashboardHref}>Back to today’s plan <Forward /></Link>
        </div>
        <div className={styles.cytoStage} aria-label="Cyto preparing the Focus Token shop">
          <span className={styles.tokenOne}><Token /></span><span className={styles.tokenTwo}><Token /></span><span className={styles.tokenThree}><Token /></span>
          <Cyto mood="studying" size={156} title="Cyto preparing the Focus Token shop" />
          <p><strong>Cyto is organising the shelves.</strong><span>There may be a spreadsheet.</span></p>
        </div>
      </section>

      <section className={styles.inventory} aria-labelledby="planned-rewards-title">
        <header><div><h2 id="planned-rewards-title">Planned rewards</h2><p>A preview of the cosmetic extras we’re considering first.</p></div><span>{plannedRewards.length} collections</span></header>
        <ul>{plannedRewards.map(item => <li key={item.title}><span className={styles.itemIcon}><RewardIcon kind={item.icon} /></span><div><h3>{item.title}</h3><p>{item.body}</p></div><span className={styles.itemState}>In progress</span></li>)}</ul>
        <footer><Lock /><p><strong>Learning stays open.</strong><span>Focus Tokens will never lock essential questions, feedback or practice features.</span></p></footer>
      </section>
    </div>
  </main>
}

function RewardIcon({ kind }: { kind: typeof plannedRewards[number]['icon'] }) {
  if (kind === 'cyto') return <svg aria-hidden viewBox="0 0 24 24"><path d="M7 9.5a5 5 0 0 1 10 0v4a5 5 0 0 1-10 0zM9 7 7.5 4.5M15 7l1.5-2.5M9.5 12h.01M14.5 12h.01M10 15c1.3.8 2.7.8 4 0" /></svg>
  if (kind === 'room') return <svg aria-hidden viewBox="0 0 24 24"><path d="M4 19V6.5L12 3l8 3.5V19M8 19v-6h8v6M4 19h16" /></svg>
  if (kind === 'frame') return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 7h8v10H8zM5 8h3M16 8h3M5 16h3M16 16h3" /></svg>
  return <svg aria-hidden viewBox="0 0 24 24"><path d="m12 3 1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8zM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" /></svg>
}
function Back() { return <svg aria-hidden viewBox="0 0 20 20"><path d="M16 10H5m4-4-4 4 4 4" /></svg> }
function Forward() { return <svg aria-hidden viewBox="0 0 20 20"><path d="M4 10h11m-4-4 4 4-4 4" /></svg> }
function Token() { return <svg aria-hidden viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" /><path d="M10 5.8v8.4M6.8 10h6.4" /></svg> }
function Shield() { return <svg aria-hidden viewBox="0 0 20 20"><path d="M10 2.5 16 5v4.2c0 3.7-2.3 6.4-6 8.3-3.7-1.9-6-4.6-6-8.3V5zM7.5 10l1.7 1.7 3.5-4" /></svg> }
function Lock() { return <svg aria-hidden viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg> }
