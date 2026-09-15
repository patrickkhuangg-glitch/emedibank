import Link from 'next/link'
import type { Dashboard } from '@/lib/dashboard/stats'
import type { SectionAccess } from '@/lib/access'
import { dashboardMilestones } from '@/lib/dashboard/milestones'
import type { DashboardActivity } from '@/lib/dashboard/activity'
import styles from './dashboard-achievements.module.css'

export function DailyPractice({ activity, practiceHref, dailyStreak }: { activity?: DashboardActivity; practiceHref: string; dailyStreak: number }) {
  if (!activity) return null
  const target = 20
  const remaining = Math.max(0, target - activity.todayAnswers)
  return <section className={styles.daily} aria-label="Daily practice and consistency">
    <div className={styles.dailyGoal}><span className={styles.targetIcon} aria-hidden><Glyph kind="target" /></span><div><span className={styles.kicker}>Today’s small win</span><div className={styles.goalLine}><strong>{remaining ? `${remaining} more answers` : 'Daily target reached'}</strong><span>{activity.todayAnswers} / {target}</span></div><div className={styles.track} role="progressbar" aria-label="Today's 20-question practice target" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(target,activity.todayAnswers)}><i style={{width:`${Math.min(100,activity.todayAnswers/target*100)}%`}} /></div></div></div>
    <div className={styles.week}><div className={styles.weekHead}><strong>{dailyStreak ? `${dailyStreak}-day streak` : 'Build a little consistency'}</strong><span>{activity.activeDays}/7 active days · UTC</span></div><ol aria-label="Last seven days of practice, UTC">{activity.days.map((day,index) => <li key={day.date}><span className={`${styles.day} ${day.answers ? styles.activeDay : ''}`} aria-label={`${day.date}: ${day.answers} answers${index===6?', today':''}`} title={`${day.date} · ${day.answers} answers`} aria-current={index===6?'date':undefined}>{day.answers ? <Glyph kind="check"/> : <span aria-hidden>·</span>}</span><small>{new Intl.DateTimeFormat('en',{weekday:'narrow',timeZone:'UTC'}).format(new Date(day.date+'T12:00:00Z'))}</small></li>)}</ol></div>
    <Link className={styles.dailyAction} href={practiceHref}>{remaining ? 'Keep practising' : 'Choose your next focus'} <span aria-hidden>↗</span><small>20-answer daily target · UTC</small></Link>
  </section>
}

export function DashboardAchievements({ data, access, examSlug, preview = false }: { data: Dashboard; access: SectionAccess[]; examSlug: string; preview?: boolean }) {
  const milestones = dashboardMilestones(data)
  const reached = milestones.filter(m => m.reached).length
  const next = milestones.filter(m => !m.reached).sort((a,b) => b.percent-a.percent)[0]
  const path = (url:string) => preview ? `/prototypes/workspace?exam=${examSlug}&view=practice` : url
  const sections = data.mastery.filter(s => s.nodes.length > 0)
  return <section className={styles.journey} id="learning-progress" aria-labelledby="learning-progress-title">
    <header className={styles.header}><div><span className={styles.kicker}>Every session adds up</span><h2 id="learning-progress-title">Look how far you’re going.</h2></div><span className={styles.achievementCount}><Glyph kind="spark" />{reached} / {milestones.length} milestones reached</span></header>
    <div className={styles.shelf} data-progress-reveal>
      <div className={styles.shelfTexture} data-progress-parallax aria-hidden />
      {milestones.map(m => <details key={m.id} className={styles.milestone} data-reached={m.reached}>
        <summary title="Select to see milestone details"><span className={styles.medallion}><Glyph kind={m.id==='first-steps'?'sprout':m.id==='explorer'?'compass':m.id==='century'?'star':m.id==='momentum'?'spark':m.id==='five-hundred'?'flag':'mountain'} />{m.reached && <i><Glyph kind="check" /></i>}</span><strong>{m.title}</strong><small>{m.reached ? 'Reached' : `${Math.min(m.current,m.target).toLocaleString()} / ${m.target.toLocaleString()} ${m.unit}`}</small><span className={styles.badgeTrack}><i data-progress-fill style={{width:`${m.percent}%`}} /></span></summary>
        <p>{m.detail}</p>
      </details>)}
    </div>
    <div className={styles.nextMilestone}><span><Glyph kind={next?'flag':'check'} /><strong>{next ? `Next within reach: ${next.title}` : 'Every milestone reached.'}</strong>{next && <span>{(next.target-next.current).toLocaleString()} {next.unit} to go</span>}</span><Link href={path(`/practice/${examSlug}`)}>Build on your progress <span aria-hidden>→</span></Link></div>
    <section className={styles.skills} data-progress-reveal aria-label="Skill paths">
      <header><div><h3>Your skill paths</h3><p>Explore a topic. Build confidence. Watch your path fill in.</p></div><div className={styles.legend}><span><i data-state="mastered"/>Mastered</span><span><i data-state="learning"/>Building</span><span><i/>To explore</span></div></header>
      {sections.length ? sections.map(section => {
        const a = access.find(a => a.name===section.name)
        const mastered = section.nodes.filter(n => n.state==='mastered').length
        return <details key={section.name} className={styles.skillSection} open={sections.length===1 && section.nodes.length<=4}><summary><span>{section.name}</span><span>{mastered}/{section.nodes.length} mastered <b aria-hidden>+</b></span></summary><div className={styles.nodes}>{section.nodes.map((node,index) => <Link key={node.tag} className={styles.node} data-state={node.state} href={path(a?.locked?'/pricing':a?`/practice/${examSlug}/${a.slug}/start?cat=${encodeURIComponent(node.tag)}`:`/practice/${examSlug}`)}><span className={styles.nodeIcon}>{node.state==='mastered'?<Glyph kind="check"/>:String(index+1).padStart(2,'0')}</span><span><strong>{node.tag}</strong><small>{a?.locked?'Unlock section':node.count<3?`${3-node.count} more answer${3-node.count===1?'':'s'} to establish a baseline`:`${node.state==='mastered'?'Mastered':'Building'} · ${node.accuracy}% · ${node.count} answers`}</small></span><span aria-hidden>→</span></Link>)}</div></details>
      }) : <div className={styles.sectionLevels}>{data.sections.filter(s=>s.slug!=='written-communication').map(s=><Link key={s.id} href={path(access.find(a=>a.id===s.id)?.locked?'/pricing':`/practice/${examSlug}/${s.slug}`)}><span>{s.name}<small>{s.attempted ? `Level ${s.level} · ${s.attempted} answers` : 'Ready to explore'}</small></span><span className={styles.miniLevel}>{s.level}</span></Link>)}</div>}
      <footer>Topic mastery reflects your current practice: at least 3 answers and 80% accuracy. Milestones recognise participation, not exam readiness.</footer>
    </section>
  </section>
}

function Glyph({kind}:{kind:string}) {
  const shapes: Record<string,React.ReactNode> = {
    check:<path d="m5 12 4 4L19 6"/>,target:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m12 12 8-8"/></>,
    sprout:<><path d="M12 21v-9M12 15C5 15 3 10 4 5c5-1 8 3 8 10ZM12 12c0-5 3-8 8-8 1 5-3 8-8 8Z"/></>,
    star:<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>,
    compass:<><circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/></>,
    spark:<><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/></>,
    flag:<><path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0"/></>,
    mountain:<><path d="m2 20 7-14 5 9 3-6 5 11H2Zm4-8 3 2 3-2"/></>,
  }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{shapes[kind]??shapes.spark}</svg>
}
