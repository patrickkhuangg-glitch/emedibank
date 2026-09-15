'use client'

import Link from 'next/link'
import { isRoleplayStation } from '@/lib/interviews/roleplay'
import { InterviewQuestionPreview } from '@/components/interviews/question-display'
import { practiceButtonPrimary } from '@/components/interviews/practice-buttons'
import { useMemo, useState } from 'react'
import { MockInterviewTabs } from '@/components/interviews/mock-tabs'
import type { InterviewStation, InterviewFormat } from '@/lib/interviews/stations'
import { getInterviewQuestions, getInterviewTiming, getInterviewTimingLabel } from '@/lib/interviews/timing'
import { InterviewCytoCoach } from '@/components/interviews/cyto-coach'
import { InterviewWorkspaceMotion } from '@/components/interviews/workspace-motion'
import { categoryTopics, promptFocus } from '@/lib/interviews/selection-context'
import styles from './interview-practice-lobby.module.css'

export function InterviewPracticeLobby({ stations: availableStations, mode = 'practice', recordingEnabled = false }: { stations: InterviewStation[]; mode?: 'practice' | 'mock'; recordingEnabled?: boolean }) {
  const isMock = mode === 'mock'
  const basePath = isMock ? '/interviews/mock-interviews' : '/interviews/practice'
  const initialFormat: InterviewFormat = availableStations.some((station) => station.format === 'mmi') ? 'mmi' : 'panel'
  const [format, setFormat] = useState<InterviewFormat>(initialFormat)
  const stations = useMemo(() => availableStations.filter((station) => station.format === format), [format, availableStations])
  const [stationId, setStationId] = useState(() => availableStations.find((station) => station.format === initialFormat)?.id ?? '')
  const station = stations.find((item) => item.id === stationId) ?? stations[0]
  const [questionIndex, setQuestionIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const timing = getInterviewTiming(format)
  const previewQuestions = station ? getInterviewQuestions(station, questionIndex) : []
  const formatDetails = format === 'mmi'
    ? { kind: 'Scenario', preparation: timing.preparationLabel, response: timing.responseLabel }
    : { kind: 'Focused prompt', preparation: 'Think first', response: timing.responseLabel }

  function switchFormat(next: InterviewFormat) {
    setFormat(next)
    setQuestionIndex(0)
    setStationId(availableStations.find((station) => station.format === next)?.id ?? '')
    setRevealed(false)
  }

  return <InterviewWorkspaceMotion><main className={`min-h-screen bg-background pb-16 text-foreground ${styles.lobby}`}><div className="page-frame page-shell">
    <header data-interview-scroll-reveal className={`${styles.intro} ${isMock ? styles.introSolo : ''}`}>
      <div className={styles.introCopy}>
        <p className={styles.eyebrow}>{isMock ? 'Interview rehearsal' : 'Practice workspace'}</p>
        <h1 className="page-title">{isMock ? 'Mock Interviews' : 'Interview practice'}</h1>
        <p>{isMock ? 'Record an MMI station or panel response, review your performance, and choose whether to submit it for marking.' : 'Prepare your ideas, record an MMI or panel response with your microphone, then listen back and review your transcript. You can also rehearse without recording.'}</p>
        {!isMock ? <nav aria-label="Practice tools" className={styles.utilityLinks}><Link data-haptic="soft" href="/interviews/practice/recordings">Recordings &amp; transcripts <ArrowIcon /></Link><Link data-haptic="soft" href="/interviews/mock-interviews">Mock Interviews &amp; marking <ArrowIcon /></Link></nav> : null}
      </div>
      {!isMock ? <InterviewCytoCoach key={format} mood="thinking" label="Cyto’s pre-practice checklist" messages={format === 'mmi' ? [
      { title: 'Okay. Scenario first, answer second.', body: 'Name the people affected, the immediate risk, and the principle guiding your next step. Then start speaking.' },
      { title: 'I checked: pausing is allowed.', body: 'A calm two-second pause sounds thoughtful. Filling every silence usually makes the answer harder to follow.' },
      { title: 'One clear structure. No memorised speech.', body: 'State what you would do, explain why, and show how you would communicate it respectfully.' },
    ] : [
      { title: 'Specific beats impressive.', body: 'Choose one real experience, explain your decision, and tell the panel what genuinely changed afterwards.' },
      { title: 'I made a backup plan for the backup plan.', body: 'We only need the first plan: answer the question directly, then support it with one reflected example.' },
      { title: 'Your voice is part of the evidence.', body: 'Slow down enough for the panel to hear your judgement—not just the sentences you prepared.' },
    ]} /> : null}
    </header>
    {isMock ? <><MockInterviewTabs active="stations" /><p className="mt-5 max-w-3xl text-sm leading-6 text-muted">Private recording and self-review are free. Submitting an attempt for human-reviewed marking uses one Interview marking credit. You choose this after saving.</p>{!recordingEnabled && <p role="status" className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm leading-6">New mock recordings are being prepared. Your saved recordings and released feedback remain available in Recordings &amp; feedback.</p>}</> : null}
    <section data-interview-scroll-reveal data-interview-parallax-section className={styles.selector}>
      <div className={styles.formatPanel}>
        <span className={styles.step}>01 · Choose a format</span>
        <h2>{isMock ? 'Choose your mock interview format' : 'How do you want to practise?'}</h2>
        <p>Switch formats at any time. Your prompt preview updates instantly.</p>
        <div className={styles.formatSwitch} role="group" aria-label="Interview format">
          <FormatButton active={format === 'mmi'} label="MMI stations" detail="Scenario + response" onClick={() => switchFormat('mmi')} />
          <FormatButton active={format === 'panel'} label="Panel questions" detail="Focused answers" onClick={() => switchFormat('panel')} />
        </div>
      </div>
      <div key={format} data-interview-tour="practice-selection" className={styles.promptPanel}>
        <div className={styles.promptHeading}><div><span className={styles.step}>02 · Choose a prompt</span><label htmlFor="interview-station">{format === 'mmi' ? 'MMI station' : 'Panel interview theme'}</label></div><span className={styles.available}>{stations.length} available</span></div>
        {station ? <select data-haptic="soft" id="interview-station" value={station.id} onChange={(event) => { setStationId(event.target.value); setQuestionIndex(0); setRevealed(false) }} className={styles.select}>{stations.map((item, index) => <option key={item.id} value={item.id}>{format === 'mmi' ? `MMI ${String(index + 1).padStart(2, '0')} · ${item.title}` : `Theme ${String(item.panelThemeNumber ?? index + 1).padStart(2, '0')} · ${item.title}`}</option>)}</select> : <p className={styles.empty}>No MMI stations have been added yet.</p>}
        {format === 'panel' && station && station.questions.length > 1 && <div className={styles.questionSelect}>
        <label htmlFor="interview-question">Panel question</label>
        <select data-haptic="soft" id="interview-question" value={questionIndex} onChange={event => { setQuestionIndex(Number(event.target.value)); setRevealed(false) }} className={styles.select}>
          {station.questions.map((question, index) => <option key={index} value={index}>Question {index + 1} · {promptFocus(question)}</option>)}
        </select>
        </div>}
        {station ? <SelectionContext title={station.title} category={station.category} summary={format === 'panel' ? station.preparation : undefined} prompt={format === 'panel' ? promptFocus(station.questions[questionIndex] ?? '') : undefined} /> : null}
        <dl className={styles.formatFacts}><FormatFact label="Format" value={formatDetails.kind} /><FormatFact label="Preparation" value={formatDetails.preparation} /><FormatFact label="Response" value={formatDetails.response} /></dl>
      </div>
    </section>
    {station ? <div key={`${format}-${station.id}-${questionIndex}`} data-interview-tour="practice-preview" data-interview-scroll-reveal data-interview-parallax-section className={styles.previewWrap} aria-live="polite">
      {!revealed ? <section className={styles.concealedPreview} aria-label="Prompt hidden">
        <div className={styles.concealedIcon} data-interview-parallax="12" aria-hidden><LockIcon /></div>
        <div className={styles.concealedCopy}>
          <p className={styles.step}>03 · Keep it unseen</p>
          <h2>{format === 'mmi' ? 'Station hidden until you are ready.' : 'Question hidden until you are ready.'}</h2>
          <p>Reveal it here to look before you begin, or start timed practice and meet it under realistic conditions.</p>
        </div>
        <div className={styles.concealedActions}>
          <button type="button" data-haptic="confirm" className={styles.revealButton} onClick={() => setRevealed(true)}>Reveal {format === 'mmi' ? 'station' : 'question'} <EyeIcon /></button>
          <Link data-haptic="confirm" href={`${basePath}/session?format=${format}&station=${encodeURIComponent(station.id)}${format === 'panel' ? `&question=${questionIndex}` : ''}`} className={styles.unseenButton}>{isMock ? (recordingEnabled ? 'Set up unseen mock' : 'View recording availability') : 'Start unseen'} <ArrowIcon /></Link>
        </div>
      </section> : <InterviewQuestionPreview className={styles.preview} title={station.title} category={station.category} preparation={station.preparation} preparationLabel={format === 'panel' ? 'Before you answer' : 'Scenario'} questions={isRoleplayStation(station)?[previewQuestions[0],'Reflection question revealed after the four-minute rehearsal.']:previewQuestions} firstQuestion={format === 'panel' ? questionIndex + 1 : 1} timing={isRoleplayStation(station)?'2 min prep · 4 min rehearsal · 4 min reflection':getInterviewTimingLabel(format)}>
        <p className="max-w-lg text-sm leading-6 text-muted">{isMock ? 'Camera and microphone access is requested only when you choose to set up your recording. Preparation is not recorded.' : 'Choose microphone recording or an unrecorded rehearsal. Preparation is not recorded. Saved audio includes a private transcript and appears in your practice calendar.'}</p>
        <div className={styles.revealedActions}><button type="button" data-haptic="soft" className={styles.hideButton} onClick={() => setRevealed(false)}>Hide again</button><Link data-haptic="confirm" href={`${basePath}/session?format=${format}&station=${encodeURIComponent(station.id)}${format === 'panel' ? `&question=${questionIndex}` : ''}`} className={`${practiceButtonPrimary} ${styles.startButton} shrink-0`}>{isMock ? (recordingEnabled ? 'Set up mock interview' : 'View recording availability') : 'Start timed practice'} <ArrowIcon /></Link></div>
      </InterviewQuestionPreview>}
    </div> : <section className={styles.emptyState}><h2>MMI practice is ready for your stations.</h2><p>Add your own MMI content and it will appear here as a selectable station.</p></section>}
  </div></main></InterviewWorkspaceMotion>
}

function FormatButton({ active, label, detail, onClick }: { active: boolean; label: string; detail: string; onClick: () => void }) {
  return <button type="button" data-haptic="soft" onClick={onClick} aria-pressed={active} className={styles.formatButton}>
    <span className={styles.formatMark} aria-hidden="true">{active ? <CheckIcon /> : <span />}</span>
    <span><strong>{label}</strong><small>{detail}</small></span>
  </button>
}

function FormatFact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div> }

function SelectionContext({ title, category, summary, prompt }: { title: string; category: string; summary?: string; prompt?: string }) {
  return <div className={styles.selectionContext} aria-live="polite"><span className={styles.contextLabel}>Theme</span><strong>{title}</strong>{summary ? <p>{summary}</p> : <p>A scenario exploring {categoryTopics(category).join(' and ').toLowerCase()}.</p>}<div className={styles.contextFooter}><span>{category}</span>{prompt ? <span>Prompt focus · {prompt}</span> : null}</div></div>
}

function ArrowIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
function CheckIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 10 3 3 7-7" /></svg> }
function LockIcon() { return <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2"/></svg> }
function EyeIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 10s2.6-4.5 7.5-4.5 7.5 4.5 7.5 4.5-2.6 4.5-7.5 4.5S2.5 10 2.5 10Z"/><circle cx="10" cy="10" r="2"/></svg> }
