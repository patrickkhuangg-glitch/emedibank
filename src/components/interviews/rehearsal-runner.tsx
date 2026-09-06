'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { InterviewSelfRating } from './self-rating'
import type { InterviewStation } from '@/lib/interviews/stations'
import { getInterviewQuestions, getInterviewTiming } from '@/lib/interviews/timing'

type Phase = 'ready' | 'preparation' | 'response' | 'complete'
const button = 'rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground'

export function InterviewRehearsalRunner({ station }: { station: InterviewStation }) {
  const timing = getInterviewTiming(station.format)
  const questions = getInterviewQuestions(station)
  const [phase, setPhase] = useState<Phase>('ready')
  const [seconds, setSeconds] = useState<number>(timing.preparationSeconds)
  const [question, setQuestion] = useState(0)
  const deadline = useRef(0)
  const responseStarted = useRef(0), activityId = useRef<string | null>(null), startId = useRef<string | null>(null), saving = useRef(false), starting = useRef(false)
  const [pending, setPending] = useState(false), [trackingError, setTrackingError] = useState(''), [savedId, setSavedId] = useState<string | null>(null), [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const duration = useRef(0)
  const [completedDuration, setCompletedDuration] = useState(0)

  async function begin(untracked = false) {
    if (starting.current) return
    starting.current = true; setPending(true); setTrackingError('')
    try {
      if (!untracked) {
        startId.current ??= crypto.randomUUID()
        const response = await fetch('/api/interviews/practice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: startId.current, stationId: station.id }) })
        const data = await response.json()
        if (!response.ok || data.completed) throw new Error()
        activityId.current = data.id
      } else activityId.current = null
      startId.current = null
      start()
    } catch { setTrackingError('Practice tracking could not start. Try again, or practise without saving progress.') }
    finally { starting.current = false; setPending(false) }
  }

  const finish = useCallback(() => {
    duration.current = responseStarted.current ? Math.min(timing.responseSeconds, Math.max(0, Math.floor((performance.now() - responseStarted.current) / 1000))) : 0
    setCompletedDuration(duration.current)
    setPhase('complete')
  }, [timing.responseSeconds])

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
    setQuestion(0)
    setSeconds(timing.preparationSeconds)
    deadline.current = performance.now() + timing.preparationSeconds * 1000
    setPhase('preparation')
  }

  const nextQuestion = useCallback(() => {
    if (question === questions.length - 1) finish()
    else setQuestion((current) => current + 1)
  }, [question, questions.length, finish])

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
        else setPhase('response')
      } else finish()
    }, 200)
    return () => clearInterval(timer)
  }, [phase, timing.responseSeconds, finish])

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

  return <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
    <section className="mx-auto max-w-4xl space-y-6">
      <p className="text-sm font-semibold text-brand">Practice · {station.format === 'mmi' ? 'MMI station' : 'Panel interview'}</p>
      <h1 className="font-display text-3xl font-semibold sm:text-5xl">{station.title}</h1>
      {phase === 'ready' && <>
        <p className="max-w-2xl leading-7 text-muted">Rehearse your answer out loud. You have {timing.preparationLabel} followed by {timing.responseLabel}. Your completed practice is saved to your activity calendar. No audio or video is recorded, and no marking credits are used.</p>
        <button disabled={pending} className={button} onClick={() => begin()}>{pending ? 'Starting…' : 'Begin preparation'}</button>
      </>}
      {(phase === 'preparation' || phase === 'response') && <>
        <div className="flex flex-wrap justify-between gap-3">
          <p role="status">{phase === 'preparation' ? 'Preparation' : 'Response — practise out loud'}</p>
          <p className="font-mono text-3xl tabular-nums" aria-label={`${seconds} seconds remaining`}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p>
        </div>
        <div className="rounded-3xl bg-surface p-6 sm:p-10">
          <p className="text-sm text-muted">{phase === 'preparation' ? station.category : `Question ${question + 1} of ${questions.length}`}</p>
          <h2 className="mt-5 font-display text-2xl leading-snug sm:text-4xl">{phase === 'preparation' ? station.preparation : questions[question]}</h2>
          {phase === 'response' && <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className={button} onClick={nextQuestion}>{question === questions.length - 1 ? 'Finish practice' : 'Next question'}</button>
            <p className="text-sm text-muted">Space also continues</p>
          </div>}
        </div>
        <button className="rounded-full border border-border px-5 py-3 text-sm font-semibold" onClick={finish}>End practice</button>
      </>}
      {phase === 'complete' && <div className="space-y-5 rounded-3xl bg-surface p-6 sm:p-10">
        <h2 role="status" className="font-display text-2xl font-semibold">{completedDuration > 0 ? 'Practice complete' : 'Practice ended'}</h2>
        <p className="leading-7 text-muted">Think about one point you explained clearly and one thing to improve. You can try again, or record a mock interview to watch your response and request marking.</p>
        <p role="status" className="text-sm text-muted">{saveState === 'saving' ? 'Saving to your practice calendar…' : saveState === 'saved' ? 'Saved to your practice calendar.' : saveState === 'failed' ? 'Your practice could not be saved. Keep this page open and retry.' : completedDuration < 1 ? 'Preparation-only sessions do not count as completed practice.' : 'This practice was not tracked.'}</p>
        {saveState === 'failed' && <button className={button} onClick={saveCompletion}>Retry saving practice</button>}
        {savedId && <InterviewSelfRating key={savedId} activityId={savedId} />}
        <div className="flex flex-wrap gap-3">
          <button disabled={pending || saveState === 'saving'} className={button} onClick={() => begin()}>{pending ? 'Starting…' : 'Practise again'}</button>
          <Link className="rounded-full border border-border px-5 py-3 text-sm font-semibold" href={`/interviews/mock-interviews/session?format=${station.format}&station=${encodeURIComponent(station.id)}`}>Record a mock interview</Link>
        </div>
      </div>}
      {trackingError && <div role="status" className="space-y-2 text-sm"><p>{trackingError}</p><button disabled={pending} onClick={() => begin(true)} className="min-h-11 underline underline-offset-4">Practise without saving progress</button></div>}
      <p><Link href="/interviews" className="text-sm font-semibold text-brand">View practice calendar</Link></p>
      <p><Link href="/interviews/practice" className="text-sm font-semibold">Back to practice stations</Link></p>
    </section>
  </main>
}
