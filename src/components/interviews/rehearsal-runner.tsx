'use client'
import {uploadPhaseLabel} from '@/lib/interviews/upload-admission'
import { RecordingRetentionNotice } from '@/components/interviews/recording-retention-notice'

import Link from 'next/link'
import { MMIQuestionProgress } from './station-progress'
import { RoleplayStage } from './roleplay-stage'
import { isRoleplayStation, roleplayPart } from '@/lib/interviews/roleplay'
import { InterviewPrompt, InterviewTimerBar } from './question-display'
import { rememberPractice, forgetPractice } from '@/lib/interviews/continue-practice'
import { useCallback, useEffect, useRef, useState } from 'react'
import { practiceButtonPrimary, practiceButtonSecondary, practiceButtonQuiet } from './practice-buttons'
import { InterviewSelfRating } from './self-rating'
import { usePracticeAudio } from './use-practice-audio'
import { InterviewTranscript } from '@/components/interview-transcript'
import { InterviewStudyNotes } from '@/components/interview-study-notes'
import type { QuestionEvent } from '@/lib/interviews/media-validation'
import type { InterviewStation } from '@/lib/interviews/stations'
import { getInterviewQuestions, getInterviewTiming } from '@/lib/interviews/timing'
import styles from './session-experience.module.css'

type Phase = 'ready' | 'preparation' | 'response' | 'complete'
const button = practiceButtonPrimary

export function InterviewRehearsalRunner({ station, questionIndex = 0, userId, allowUntracked = false, daily = false }: { station: InterviewStation; questionIndex?: number; userId?: string; allowUntracked?: boolean; daily?: boolean }) {
  const audio = usePracticeAudio(station, questionIndex, daily)
  const { finish: finishAudio, start: startAudio } = audio
  const [recordAudio, setRecordAudio] = useState(false)
  const events = useRef<QuestionEvent[]>([{question_index:0,offset_seconds:0}])
  const finishing = useRef(false)
  const continuationStarted = useRef(0)
  const previewOnly = !userId && allowUntracked
  const roleplay = isRoleplayStation(station)
  const timing = getInterviewTiming(station.format, daily ? 'daily' : 'standard')
  const questions = getInterviewQuestions(station, questionIndex)
  const [phase, setPhase] = useState<Phase>('ready')
  const [seconds, setSeconds] = useState<number>(timing.preparationSeconds)
  const [question, setQuestion] = useState(0)
  const deadline = useRef(0)
  const responseStarted = useRef(0), activityId = useRef<string | null>(null), startId = useRef<string | null>(null), saving = useRef(false), starting = useRef(false)
  const [pending, setPending] = useState(false), [trackingError, setTrackingError] = useState(''), [savedId, setSavedId] = useState<string | null>(null), [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const duration = useRef(0)
  const [completedDuration, setCompletedDuration] = useState(0)

  useEffect(() => {
    if (!userId) return
    if (phase === 'ready' || phase === 'preparation') {
      continuationStarted.current = Date.now()
      rememberPractice(userId, { stationId: station.id, format: station.format, questionIndex, updatedAt: continuationStarted.current })
    } else if (phase === 'complete') forgetPractice(userId, station.id, questionIndex, continuationStarted.current)
  }, [userId, station.id, station.format, questionIndex, phase])

  async function begin(record = false, untracked = false) {
    if (starting.current) return
    if (recordAudio && audio.url && !audio.savedId && !window.confirm('Start again and discard this unsaved audio? Download or save it first if you want to keep it.')) return
    starting.current = true; setPending(true); setTrackingError('')
    try {
      if (!await audio.reset()) return
      setRecordAudio(record); finishing.current = false
      if((untracked||previewOnly)&&allowUntracked&&!record)activityId.current=null
      else {
      startId.current ??= crypto.randomUUID()
      const response = await fetch('/api/interviews/practice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: startId.current, stationId: station.id, questionIndex, recording: record, daily }) })
      const data = await response.json()
      if (!response.ok || data.completed) throw new Error(data.error || 'Practice could not start. Please try again.')
      activityId.current = record ? null : data.id
      }
      if (record && !await audio.prepare()) return
      startId.current = null
      start(record)
    } catch (error) { setTrackingError(error instanceof Error ? error.message : 'Practice could not start. Please try again.') }
    finally { starting.current = false; setPending(false) }
  }

  const finish = useCallback(() => {
    if (finishing.current) return
    finishing.current = true
    if (recordAudio) void finishAudio()
    duration.current = responseStarted.current ? Math.min(timing.responseSeconds, Math.max(0, Math.floor((performance.now() - responseStarted.current) / 1000))) : 0
    setCompletedDuration(duration.current)
    setPhase('complete')
  }, [timing.responseSeconds, recordAudio, finishAudio])

  const saveCompletion = useCallback(async () => {
    if (!activityId.current || duration.current < 1 || saving.current) return
    saving.current = true; setSaveState('saving')
    try {
      const response = await fetch(`/api/interviews/practice/${activityId.current}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', durationSeconds: duration.current, daily }) })
      if (!response.ok) throw new Error()
      setSavedId(activityId.current); setSaveState('saved')
    } catch { setSaveState('failed') }
    finally { saving.current = false }
  }, [daily])

  useEffect(() => { if (phase === 'complete') void saveCompletion() }, [phase, saveCompletion])

  function start(record: boolean) {
    setCompletedDuration(0); setSavedId(null); setSaveState('idle'); responseStarted.current = 0; duration.current = 0
    events.current = [{question_index:0,offset_seconds:0}]
    setQuestion(0)
    if (timing.preparationSeconds === 0) {
      const now = performance.now()
      responseStarted.current = now
      deadline.current = now + timing.responseSeconds * 1000
      setSeconds(timing.responseSeconds)
      if (record && !startAudio()) { setPhase('complete'); return }
      setPhase('response')
      return
    }
    setSeconds(timing.preparationSeconds)
    deadline.current = performance.now() + timing.preparationSeconds * 1000
    setPhase('preparation')
  }

  const nextQuestion = useCallback(() => {
    if (roleplay) return
    if (question === questions.length - 1) finish()
    else {
      events.current.push({question_index:question+1,offset_seconds:Math.min(timing.responseSeconds,Math.max(0,(performance.now()-responseStarted.current)/1000))})
      setQuestion((current) => current + 1)
    }
  }, [question, questions.length, finish, timing.responseSeconds, roleplay])

  useEffect(() => {
    if (phase !== 'preparation' && phase !== 'response') return
    const timer = setInterval(() => {
      const now = performance.now()
      const remaining = Math.max(0, Math.ceil((deadline.current - now) / 1000))
      if (phase === 'response' && roleplay) {
        const elapsed = timing.responseSeconds - (deadline.current - now) / 1000
        const part = roleplayPart(elapsed)
        if (part.questionIndex === 1 && !events.current.some(event => event.question_index === 1)) {
          events.current.push({question_index:1,offset_seconds:Math.min(timing.responseSeconds,Math.max(0,(now-responseStarted.current)/1000))})
          setQuestion(1)
        }
        setSeconds(Math.max(0, Math.ceil(part.endsAtSeconds - elapsed)))
      } else setSeconds(remaining)
      if (remaining) return
      clearInterval(timer)
      if (phase === 'preparation') {
        // Keep the original end time when a background tab delays the timer.
        responseStarted.current = deadline.current
        deadline.current += timing.responseSeconds * 1000
        setSeconds(Math.max(0, Math.ceil((deadline.current - now) / 1000)))
        if (now >= deadline.current) finish()
        else if (recordAudio && !startAudio()) finish()
        else { if(roleplay&&recordAudio)responseStarted.current=now; setSeconds(roleplay?Math.min(240,Math.max(0,Math.ceil((deadline.current-now)/1000))):Math.max(0,Math.ceil((deadline.current-now)/1000))); setPhase('response') }
      } else finish()
    }, 200)
    return () => clearInterval(timer)
  }, [phase, timing.responseSeconds, finish, recordAudio, startAudio, roleplay])

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (phase !== 'response' || event.code !== 'Space' || event.repeat) return
      if (event.target instanceof HTMLElement && event.target.closest('button,a,input,textarea,select,summary')) return
      event.preventDefault()
      nextQuestion()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [phase, nextQuestion])


  useEffect(() => {
    const active = recordAudio && (phase === 'preparation' || phase === 'response')
    const unsaved = recordAudio && (audio.stopping || !!audio.url) && !audio.savedId
    function leaving(event: BeforeUnloadEvent) { if (active || unsaved) { event.preventDefault(); event.returnValue = '' } }
    function navigate(event: MouseEvent) {
      if (!(event.target instanceof Element) || !event.target.closest('a[href]:not([download])')) return
      if ((active || unsaved) && !window.confirm('Leave practice? Unsaved audio will be lost. Save or download it first to keep it.')) { event.preventDefault(); event.stopImmediatePropagation() }
    }
    function hidden() { if (active && document.visibilityState === 'hidden') finish() }
    window.addEventListener('beforeunload', leaving); document.addEventListener('click', navigate, true); document.addEventListener('visibilitychange', hidden)
    return () => { window.removeEventListener('beforeunload', leaving); document.removeEventListener('click', navigate, true); document.removeEventListener('visibilitychange', hidden) }
  }, [recordAudio, phase, audio.url, audio.savedId, audio.stopping, finish])

  const activePhase = phase === 'preparation' || phase === 'response'
  return <main className={styles.sessionBackdrop}>
    <section className={styles.sessionShell}>
      <header className={styles.sessionHeader}>
        <div>
          <p className={styles.eyebrow}>Practice · {station.format === 'mmi' ? 'MMI station' : 'Panel interview'}</p>
          <h1 className={`${styles.title} font-display text-3xl font-semibold leading-tight sm:text-4xl`}>{station.title}</h1>
        </div>
        {activePhase && <div className={styles.liveBadge}><span className={styles.liveDot} aria-hidden="true" />{phase === 'preparation' ? 'Preparing' : recordAudio ? 'Recording' : 'Live practice'}</div>}
      </header>
      {phase === 'ready' && <>
        <div className={styles.setupCard}>
        <div className={styles.setupLead}>
          <p className="font-semibold text-foreground">Rehearse your answer out loud.</p>
          {roleplay ? <p>Two minutes to prepare, four minutes to rehearse the conversation, then four minutes to reflect. Each part starts automatically. This is a solo rehearsal, with no responding role-player.</p> : timing.preparationSeconds > 0 ? <p>You have <strong className="font-semibold text-foreground">{timing.preparationLabel}</strong> followed by <strong className="font-semibold text-foreground">{timing.responseLabel}</strong>.</p> : <p>You have <strong className="font-semibold text-foreground">{timing.responseLabel}</strong>. The timer starts when you choose to begin.</p>}
          {!previewOnly&&<p>Record your response with your microphone, listen back and save a private transcript. Recording begins when the timed response starts.</p>}
          <p>{previewOnly?'Preview only. No recording or progress is saved.':'You can also practise without recording. No marking credits are used.'}</p>
        </div>
        <div className={styles.factGrid}>
          <div className={styles.factCard}><span className={styles.factLabel}>Timing</span><span className={styles.factValue}>{timing.preparationSeconds > 0 ? `${timing.preparationLabel} · ${timing.responseLabel}` : timing.responseLabel}</span></div>
          <div className={styles.factCard}><span className={styles.factLabel}>{previewOnly ? 'Mode' : 'Feedback'}</span><span className={styles.factValue}>{previewOnly ? 'Timed preview only' : 'Recording and transcript optional'}</span></div>
          <div className={styles.factCard}><span className={styles.factLabel}>Cost</span><span className={styles.factValue}>No marking credits used</span></div>
        </div>
        <div className={styles.actionRow}>{!previewOnly&&<button data-haptic="confirm" disabled={pending} className={button} onClick={() => begin(true)}>{pending ? 'Starting…' : timing.preparationSeconds > 0 ? 'Record audio & begin preparation' : 'Record audio & start response'}</button>}<button data-haptic={previewOnly?'confirm':'soft'} disabled={pending} className={previewOnly?`${practiceButtonPrimary} motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.035] hover:shadow-[0_12px_28px_-14px_rgba(78,54,151,.8)]`:practiceButtonSecondary} onClick={() => begin(false)}>{previewOnly?'Try timed preview':'Practise without recording'}</button></div>
        {!previewOnly&&<p className={styles.privacyNote}>Microphone only. Keep this tab visible while recording.</p>}
        </div>
      </>}
      {activePhase && <div className={styles.activeStage}>
        <div className={styles.stageTopline}><strong>{phase === 'preparation' ? 'Read and frame your response' : question < questions.length - 1 ? `Question ${question + 1} of ${questions.length}` : 'Final question'}</strong><span>{recordAudio && phase === 'response' ? 'Audio is recording' : 'Stay focused'}</span></div>
        <div key={`${phase}-${question}`} className={styles.stageBody}>
        {roleplay ? <RoleplayStage stage={phase==='preparation'?'preparation':question===0?'roleplay':'reflection'} seconds={seconds} scenario={station.preparation} question={questions[question]} recording={recordAudio}/> : <>
        {station.format==='mmi'&&<MMIQuestionProgress preparation={phase==='preparation'} questionIndex={question} questionCount={questions.length}/>}
        <InterviewTimerBar tone={phase === 'preparation' ? 'preparation' : 'response'} label={phase === 'preparation' ? 'Preparation' : recordAudio ? 'Recording audio' : 'Response · practise out loud'} seconds={seconds} />
        <InterviewPrompt preparation={phase === 'preparation' && station.format === 'mmi'} text={phase === 'preparation' ? (station.format === 'panel' ? questions[0] : station.preparation) : questions[question]} questionNumber={question + 1} questionCount={questions.length} scenario={station.format === 'mmi' ? station.preparation : undefined}>
          {phase === 'response' && <>
            <button data-haptic="confirm" className={button} onClick={nextQuestion}>{question === questions.length - 1 ? 'Finish practice' : 'Next question'}</button>
            <p className="text-sm text-muted">Space also continues</p>
          </>}
        </InterviewPrompt></>}
        </div>
        <div className={styles.sessionDock}><p>{phase === 'preparation' ? 'Your response begins automatically when preparation ends.' : 'Use the main button to move forward, or end the practice whenever you need.'}</p><button data-haptic="soft" className={practiceButtonSecondary} onClick={finish}>End practice</button></div>
      </div>}
      {phase === 'complete' && <div className={`${styles.completionCard} space-y-5`}>
        <h2 role="status" className="font-display text-2xl font-semibold">{completedDuration > 0 ? 'Practice complete' : 'Practice ended'}</h2>
        <p className="leading-7 text-muted">Think about one point you explained clearly and one thing to improve. Listen back if you recorded, review your transcript and save a study note for next time.</p>
        {!recordAudio && <p role="status" className="text-sm text-muted">{saveState === 'saving' ? 'Saving to your practice calendar…' : saveState === 'saved' ? 'Saved to your practice calendar.' : saveState === 'failed' ? 'Your practice could not be saved. Keep this page open and retry.' : completedDuration < 1 ? 'Preparation-only sessions do not count as completed practice.' : 'This practice was not tracked.'}</p>}
        {saveState === 'failed' && <button data-haptic="confirm" className={button} onClick={saveCompletion}>Retry saving practice</button>}
        {recordAudio && <>
          {audio.stopping && <p role="status">Preparing audio preview…</p>}
          {audio.url && <><RecordingRetentionNotice/><audio src={audio.url} controls className="w-full" aria-label="Your practice recording" /><div className="flex flex-wrap items-center gap-3">{!audio.savedId && <button data-haptic="confirm" disabled={audio.saving || completedDuration < 1} className={button} onClick={() => audio.save(completedDuration, events.current)}>Save audio &amp; transcribe</button>}<a href={audio.url} download={`practice.${audio.extension}`} className={practiceButtonSecondary}>Download audio</a></div></>}
          {audio.saving && <div role="status"><p>{uploadPhaseLabel[audio.uploadPhase]}{audio.uploadPhase==='uploading'?` · ${audio.progress}%`:''}</p><progress max={100} value={audio.progress} aria-label="Audio upload" /><button className={`ml-3 ${practiceButtonQuiet}`} onClick={audio.pause}>Pause saving</button></div>}
          {!audio.savedId && audio.url && <p className="text-sm text-muted">Keep this tab open until saving finishes. You can retry an interrupted upload. Closing or reloading this page loses unsaved audio.</p>}
          {audio.savedId && <><p role="status">Audio saved privately and added to your practice calendar.</p><InterviewTranscript key={audio.savedId} attemptId={audio.savedId} initialStatus="processing" initialTranscript={null} questions={questions} /><InterviewSelfRating key={audio.savedId} activityId={audio.savedId} /><Link href={`/interviews/practice/recordings?attempt=${audio.savedId}`} className={practiceButtonQuiet}>Open saved audio and transcript →</Link></>}
        </>}
        {savedId && <InterviewSelfRating key={savedId} activityId={savedId} />}
        <nav aria-label="After practice" className="space-y-4 border-t border-border pt-6">
          <h3 className="font-semibold">What would you like to do next?</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link className={practiceButtonPrimary} href="/interviews/practice">Back to Practice <span aria-hidden="true">→</span></Link>
            <Link className={practiceButtonSecondary} href="/interviews">Interview dashboard</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={pending || saveState === 'saving' || audio.saving || audio.stopping} className={practiceButtonQuiet} onClick={() => begin(recordAudio)}>{pending ? 'Starting…' : 'Practise again'}</button>
            <Link className={practiceButtonQuiet} href={station.format === 'panel' ? '/interviews/mock-interviews/session?format=panel&mode=full' : `/interviews/mock-interviews/session?format=mmi&selection=${encodeURIComponent(station.id)}`}>{station.format === 'panel' ? 'Record a full panel mock' : 'Record a mock interview'}</Link>
          </div>
        </nav>
      </div>}
      {audio.error && <p role="alert" className={styles.errorBanner}>{audio.error}</p>}
      {phase === 'complete' && <div className={styles.studyNotesPanel}><InterviewStudyNotes preview={previewOnly} /></div>}
      {trackingError && <div role="status" className={`${styles.errorBanner} space-y-2 text-sm`}><p>{trackingError}</p>{allowUntracked&&<button disabled={pending} onClick={()=>begin(false,true)} className={practiceButtonQuiet}>Practise without recording or saving progress</button>}</div>}
      {phase !== 'complete' && <p className={styles.backLink}><Link href="/interviews/practice" className={practiceButtonQuiet}>← Back to Practice</Link></p>}
    </section>
  </main>
}
