'use client'
import { useFormStatus } from 'react-dom'
import { selectExamFormAction } from '@/lib/exam/actions'
import { WorkspaceEntryLink } from '@/components/workspace/entry-link'
import { WorkspaceLoading } from '@/components/workspace/workspace-loading'
import { haptic } from '@/lib/haptics'
import type { InterfaceMode } from '@/lib/supabase/types'
import styles from '@/components/workspace/entry-motion.module.css'

const BLURB: Record<string, string> = {
  ucat: 'Build speed and confidence across all four sections.',
  gamsat: 'Work on reasoning, sciences and essay writing.',
  isat: 'Develop your critical and quantitative reasoning.',
  interviews: 'Prepare for MMI stations and panel interviews.',
}
type Exam = { id: string; slug: string; name: string; kind: 'mcq' | 'interview'; entitled: boolean }

/** Exam selection lives inside the dashboard shell and submits without a timer. */
export function ExamPicker({ first, exams, preview = false }: { first: string | null; exams: Exam[]; variant?: InterfaceMode; preview?: boolean }) {
  return <div className="page-frame page-shell">
    <header className={styles.intro}><p className={styles.eyebrow}>{first ? `${first}’s study space` : 'Your study space'}</p><h1 className="page-title">Choose your exam.</h1><p>We’ll open the right workspace and keep your progress where you left it.</p></header>
    {exams.length ? preview ? <div className={styles.choices}><div className={styles.grid}>{exams.map(exam => <WorkspaceEntryLink key={exam.id} href={`/prototypes/workspace?exam=${exam.slug}&view=dashboard`} className={styles.card}><ExamContent exam={exam} /></WorkspaceEntryLink>)}</div></div> :
      <form action={selectExamFormAction}><ExamChoices exams={exams} /></form> : <p className={styles.empty}>No exams are available yet. Please check back soon.</p>}
    <p className={styles.foot}><span aria-hidden>↗</span> You can switch exams later from your workspace.</p>
  </div>
}

function ExamChoices({ exams }: { exams: Exam[] }) {
  const { pending, data } = useFormStatus()
  const selected = exams.find(exam => exam.slug === data?.get('exam'))
  return <div className={styles.choices}>
    <div className={styles.grid} data-pending={pending} aria-busy={pending}>{exams.map(exam => <button type="submit" name="exam" value={exam.slug} key={exam.id} disabled={pending} onClick={() => haptic(12)} className={styles.card}><ExamContent exam={exam} /></button>)}</div>
    {pending && <div className={styles.choiceLoading}><WorkspaceLoading label={selected ? `Opening ${selected.name}` : 'Opening your dashboard'} detail="Bringing your progress and next steps together." /></div>}
  </div>
}

function ExamContent({ exam }: { exam: Exam }) {
  return <><span className={styles.icon} aria-hidden><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{exam.kind === 'interview' ? <><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/></> : <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></>}</svg></span><span className={styles.copy}><span className={styles.title}>{exam.name}{exam.entitled && <em>Unlocked</em>}</span><span className={styles.description}>{BLURB[exam.slug] ?? 'Question banks, practice and progress.'}</span></span><svg className={styles.arrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14m-5-5 5 5-5 5"/></svg></>
}
