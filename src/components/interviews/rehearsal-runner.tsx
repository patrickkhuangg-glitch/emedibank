'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { practiceButtonPrimary, practiceButtonSecondary, practiceButtonQuiet } from './practice-buttons'
import { InterviewSelfRating } from './self-rating'
import { usePracticeAudio } from './use-practice-audio'
import { InterviewTranscript } from '@/components/interview-transcript'
import { InterviewStudyNotes } from '@/components/interview-study-notes'
import type { QuestionEvent } from '@/lib/interviews/media-validation'
import type { InterviewStation } from '@/lib/interviews/stations'
import { getInterviewQuestions, getInterviewTiming } from '@/lib/interviews/timing'

type Phase = 'ready' | 'preparation' | 'response' | 'complete'
const button = practiceButtonPrimary

export function InterviewRehearsalRunner({ station, questionIndex = 0 }: { station: InterviewStation; questionIndex?: number }) {
  const audio = usePracticeAudio(station, questionIndex)
  const { finish: finishAudio, start: startAudio } = audio
  const [recordAudio, setRecordAudio] = useState(false)
  const events = useRef<QuestionEvent[]>([{question_index:0,offset_seconds:0}])
  const finishing = useRef(false)
  const timing = getInterviewTiming(station.format)
  const questions = getInterviewQuestions(station, questionIndex)
  const [phase, setPhase] = useState<Phase>('ready')
  const [seconds, setSeconds] = useState<number>(timing.preparationSeconds)
  const [question, setQuestion] = useState(0)
  const deadline = useRef(0)
  const responseStarted = useRef(0), activityId = useRef<string | null>(null), startId = useRef<string | null>(null), saving = useRef(false), starting = useRef(false)
  const [pending, setPending] = useState(false), [trackingError, setTrackingError] = useState(''), [savedId, setSavedId] = useState<string | null>(null), [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const duration = useRef(0)
  const [completedDuration, setCompletedDuration] = useState(0)

  async function begin(record = false, untracked = false) {
    if (starting.current) return
    if (recordAudio && audio.url && !audio.savedId && !window.confirm('Start again and discard this unsaved audio? Download or save it first if you want to keep it.')) return
    starting.current = true; setPending(true); setTrackingError('')
    try {
      if (!await audio.reset()) return
      setRecordAudio(record); finishing.current = false
      if (record) {
        activityId.current = null
        if (!await audio.prepare()) return
      } else if (!untracked) {
        startId.current ??= crypto.randomUUID()
        const response = await fetch('/api/interviews/practice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: startId.current, stationId: station.id }) })
        const data = await response.json()
        if (!response.ok || data.completed) throw new Error()
        activityId.current = data.id
      } else activityId.current = null
      startId.current = null
      start()
    } catch (error) { setTrackingError(record && error instanceof Error ? error.message : 'Practice tracking could not start. Try again, or practise without saving progress.') }
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
      const response = await fetch(`/api/interviews/practice/${activityId.current}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', durationSeconds: duration.current }) })
      if (!response.ok) throw new Error()
      setSavedId(activityId.current); setSaveState('saved')
    } catch { setSaveState('failed') }
    finally { saving.current = false }
  }, [])

  useEffect(() => { if (phase === 'complete') void saveCompletion() }, [phase, saveCompletion])

  function start() {
    setCompletedDuration(0); setSavedId(null); setSaveState('idle'); responseStarted.current = 0; duration.current = 0
    events.current = [{question_index:0,offset_seconds:0}]
    setQuestion(0)
    setSeconds(timing.preparationSeconds)
    deadline.current = performance.now() + timing.preparationSeconds * 1000
    setPhase('preparation')
  }

  const nextQuestion = useCallback(() => {
    if (question === questions.length - 1) finish()
    else {
      events.current.push({question_index:question+1,offset_seconds:Math.min(timing.responseSeconds,Math.max(0,(performance.now()-responseStarted.current)/1000))})
      setQuestion((current) => current + 1)
    }
  }, [question, questions.length, finish, timing.responseSeconds])

  useEffect(() => {
    if (phase !== 'preparation' && phase !== 'response') return
    const timer = setInterval(() => {
      const now = performance.now()
      const remaining = Math.max(0, Math.ceil((deadline.current - now) / 1000))
      setSeconds(remaining)
      if (remaining) return
      clearInterval(timer)
      if (phase === 'preparation') {
        // Keep the original end time when a background tab delays the timer.
        responseStarted.current = deadline.current
        deadline.current += timing.responseSeconds * 1000
        setSeconds(Math.max(0, Math.ceil((deadline.current - now) / 1000)))
        if (now >= deadline.current) finish()
        else if (recordAudio && !startAudio()) finish()
        else setPhase('response')
      } else finish()
    }, 200)
    return () => clearInterval(timer)
  }, [phase, timing.responseSeconds, finish, recordAudio, startAudio])

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (phase !== 'response' || event.code !== 'Space' || event.repeat) return
      if (event.target instanceof HTMLElement && event.target.closest('button,a,input,textarea,select')) return
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

  return <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
    <section className="mx-auto max-w-4xl space-y-6">
      <p className="text-sm font-semibold text-brand">Practice · {station.format === 'mmi' ? 'MMI station' : 'Panel interview'}</p>
      <h1 className="font-display text-3xl font-semibold sm:text-5xl">{station.title}</h1>
      {phase === 'ready' && <>
        <div className="max-w-2xl space-y-3 leading-7 text-muted">
          <p className="font-semibold text-foreground">Rehearse your answer out loud.</p>
          <p>You have <strong className="font-semibold text-foreground">{timing.preparationLabel}</strong> followed by <strong className="font-semibold text-foreground">{timing.responseLabel}</strong>.</p>
          <p>Record your response with your microphone, listen back and save a private transcript. Recording begins after preparation.</p>
          <p>You can also practise without recording. No marking credits are used.</p>
        </div>
        <div className="flex flex-wrap gap-3"><button disabled={pending} className={button} onClick={() => begin(true)}>{pending ? 'Starting…' : 'Record audio & begin preparation'}</button><button disabled={pending} className={practiceButtonSecondary} onClick={() => begin(false)}>Practise without recording</button></div><p className="text-sm text-muted">Microphone only. Keep this tab visible while recording.</p>
      </>}
      {(phase === 'preparation' || phase === 'response') && <>
        <div className="flex flex-wrap justify-between gap-3">
          <p role="status">{phase === 'preparation' ? 'Preparation' : recordAudio ? '● Recording audio' : 'Response — practise out loud'}</p>
          <p className="font-mono text-3xl tabular-nums" aria-label={`${seconds} seconds remaining`}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p>
        </div>
        <div className="rounded-3xl bg-surface p-6 sm:p-10">
          <p className="text-sm text-muted">{phase === 'preparation' ? station.category : `Question ${question + 1} of ${questions.length}`}</p>
          <h2 className="mt-5 font-display text-2xl leading-snug sm:text-4xl">{phase === 'preparation' ? (station.format === 'panel' ? questions[0] : station.preparation) : questions[question]}</h2>
          {phase === 'response' && <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className={button} onClick={nextQuestion}>{question === questions.length - 1 ? 'Finish practice' : 'Next question'}</button>
            <p className="text-sm text-muted">Space also continues</p>
          </div>}
        </div>
        <button className={practiceButtonSecondary} onClick={finish}>End practice</button>
      </>}
      {phase === 'complete' && <div className="space-y-5 rounded-3xl bg-surface p-6 sm:p-10">
        <h2 role="status" className="font-display text-2xl font-semibold">{completedDuration > 0 ? 'Practice complete' : 'Practice ended'}</h2>
        <p className="leading-7 text-muted">Think about one point you explained clearly and one thing to improve. Listen back if you recorded, review your transcript and save a study note for next time.</p>
        {!recordAudio && <p role="status" className="text-sm text-muted">{saveState === 'saving' ? 'Saving to your practice calendar…' : saveState === 'saved' ? 'Saved to your practice calendar.' : saveState === 'failed' ? 'Your practice could not be saved. Keep this page open and retry.' : completedDuration < 1 ? 'Preparation-only sessions do not count as completed practice.' : 'This practice was not tracked.'}</p>}
        {saveState === 'failed' && <button className={button} onClick={saveCompletion}>Retry saving practice</button>}
        {recordAudio && <>
          {audio.stopping && <p role="status">Preparing audio preview…</p>}
          {audio.url && <><audio src={audio.url} controls className="w-full" aria-label="Your practice recording" /><div className="flex flex-wrap items-center gap-3">{!audio.savedId && <button disabled={audio.saving || completedDuration < 1} className={button} onClick={() => audio.save(completedDuration, events.current)}>Save audio &amp; transcribe</button>}<a href={audio.url} download={`practice.${audio.extension}`} className={practiceButtonSecondary}>Download audio</a></div></>}
          {audio.saving && <div role="status"><p>Saving audio · {audio.progress}%</p><progress max={100} value={audio.progress} aria-label="Audio upload" /><button className={`ml-3 ${practiceButtonQuiet}`} onClick={audio.pause}>Pause saving</button></div>}
          {!audio.savedId && audio.url && <p className="text-sm text-muted">Keep this tab open until saving finishes. You can retry an interrupted upload. Closing or reloading this page loses unsaved audio.</p>}
          {audio.savedId && <><p role="status">Audio saved privately and added to your practice calendar.</p><InterviewTranscript key={audio.savedId} attemptId={audio.savedId} initialStatus="processing" initialTranscript={null} /><InterviewSelfRating key={audio.savedId} activityId={audio.savedId} /><Link href={`/interviews/practice/recordings?attempt=${audio.savedId}`} className={practiceButtonQuiet}>Open saved audio and transcript →</Link></>}
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
            <Link className={practiceButtonQuiet} href={`/interviews/mock-interviews/session?format=${station.format}&selection=${encodeURIComponent(station.format === 'panel' ? `${station.id}:${questionIndex}` : station.id)}`}>Record a mock interview</Link>
          </div>
        </nav>
      </div>}
      {audio.error && <p role="alert" className="text-sm text-red-700">{audio.error}</p>}
      {phase === 'complete' && <InterviewStudyNotes />}
      {trackingError && <div role="status" className="space-y-2 text-sm"><p>{trackingError}</p><button disabled={pending} onClick={() => begin(false, true)} className={practiceButtonQuiet}>Practise without recording or saving progress</button></div>}
      {phase !== 'complete' && <p><Link href="/interviews/practice" className={practiceButtonQuiet}>← Back to Practice</Link></p>}
    </section>
  </main>
}
