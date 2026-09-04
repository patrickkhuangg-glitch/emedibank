'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { InterviewStation } from '@/lib/interviews/stations'

type Phase = 'ready' | 'preparation' | 'response' | 'saving' | 'complete' | 'error'

const PREPARATION_SECONDS = 2 * 60
const RESPONSE_SECONDS = 8 * 60

export function InterviewPracticeRunner({ station }: { station: InterviewStation }) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [secondsLeft, setSecondsLeft] = useState(PREPARATION_SECONDS)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [error, setError] = useState('')
  const deadlineRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const transitionRef = useRef(false)

  const uploadRecording = useCallback(async (blob: Blob, durationSeconds: number) => {
    try {
      const formData = new FormData()
      formData.set('audio', new File([blob], 'interview-response.webm', { type: blob.type || 'audio/webm' }))
      formData.set('format', station.format)
      formData.set('stationId', station.id)
      formData.set('durationSeconds', String(durationSeconds))
      const response = await fetch('/api/interviews/recordings', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Recording could not be saved.')
      setPhase('complete')
    } catch {
      setError('Your recording could not be saved. Check your connection and try the station again.')
      setPhase('error')
    }
  }, [station.format, station.id])

  const finishRecording = useCallback(() => {
    if (phase !== 'response') return
    setPhase('saving')
    const durationSeconds = Math.max(0, RESPONSE_SECONDS - secondsLeft)
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        streamRef.current?.getTracks().forEach((track) => track.stop())
        void uploadRecording(blob, durationSeconds)
      }
      recorder.stop()
    } else {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      setError('We could not complete the audio recording. Please try this station again.')
      setPhase('error')
    }
  }, [phase, secondsLeft, uploadRecording])

  const startResponse = useCallback(() => {
    const stream = streamRef.current
    if (!stream || !window.MediaRecorder) {
      setError('Your browser could not start the microphone. Try a current browser and allow microphone access.')
      setPhase('error')
      return
    }
    try {
      const preferredType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : undefined
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.start(1000)
      recorderRef.current = recorder
      deadlineRef.current = Date.now() + RESPONSE_SECONDS * 1000
      setSecondsLeft(RESPONSE_SECONDS)
      setPhase('response')
    } catch {
      stream.getTracks().forEach((track) => track.stop())
      setError('The microphone could not start. Please allow microphone access and try again.')
      setPhase('error')
    }
  }, [])

  const begin = useCallback(async () => {
    setError('')
    transitionRef.current = false
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone recording needs a secure, current browser. Open Studocyte in Chrome, Safari or Edge and try again.')
      setPhase('error')
      return
    }
    if (!window.MediaRecorder) {
      setError('This browser can access a microphone but cannot record audio. Please use a current version of Chrome, Safari or Edge.')
      setPhase('error')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      deadlineRef.current = Date.now() + PREPARATION_SECONDS * 1000
      setSecondsLeft(PREPARATION_SECONDS)
      setPhase('preparation')
    } catch (requestError) {
      const denied = requestError instanceof DOMException && requestError.name === 'NotAllowedError'
      setError(denied
        ? 'Microphone access is blocked. Use the site controls beside the address bar to set Microphone to Allow, then try again.'
        : 'We could not reach a microphone. Check that one is connected and available, then try again.')
      setPhase('error')
    }
  }, [])

  const nextQuestion = useCallback(() => {
    if (phase !== 'response') return
    if (questionIndex < station.questions.length - 1) setQuestionIndex((index) => index + 1)
    else finishRecording()
  }, [finishRecording, phase, questionIndex, station.questions.length])

  useEffect(() => {
    if (phase !== 'preparation' && phase !== 'response') return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) {
        if (transitionRef.current) return
        transitionRef.current = true
        if (phase === 'preparation') startResponse()
        else finishRecording()
      }
    }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [finishRecording, phase, startResponse])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || phase !== 'response' || event.repeat) return
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      event.preventDefault()
      nextQuestion()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nextQuestion, phase])

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  if (phase === 'ready' || phase === 'error') return <RunnerShell><section className="mx-auto max-w-2xl text-center"><span className="inline-flex rounded-full bg-brand-muted px-3 py-1.5 text-xs font-semibold text-brand">{station.format === 'mmi' ? 'MMI station' : 'Panel interview'}</span><h1 className="mt-7 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{station.title}</h1><p className="mt-4 text-base leading-7 text-muted">You will have two minutes to read the station. Your eight-minute spoken response begins once the questions appear and is saved privately to your account.</p><div className="mt-8 rounded-3xl bg-surface p-6 text-left eb-soft"><p className="font-display text-xl font-semibold tracking-tight">Before you begin</p><ul className="mt-4 space-y-3 text-sm leading-6 text-muted"><li className="flex gap-3"><CheckIcon /> Find a quiet place and check your microphone.</li><li className="flex gap-3"><CheckIcon /> Your audio is recorded only during the eight-minute response.</li><li className="flex gap-3"><CheckIcon /> Press Space or select Next question to move through the station.</li></ul></div>{error ? <p role="alert" className="mt-5 text-sm font-semibold text-red-700">{error}</p> : null}<button type="button" onClick={begin} className="eb-press mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground">Allow microphone &amp; begin <ArrowIcon /></button><Link href="/interviews/practice" className="mt-5 block text-sm font-semibold text-muted hover:text-foreground">Back to stations</Link></section></RunnerShell>

  if (phase === 'preparation') return <RunnerShell><section className="mx-auto max-w-4xl"><RunnerTop label="Preparation time" time={`${minutes}:${seconds}`} live={false} /><div className="mt-10 rounded-3xl bg-surface p-7 eb-soft sm:p-10"><p className="text-sm font-semibold text-brand">{station.category}</p><h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{station.preparation}</h1><p className="mt-8 text-sm leading-6 text-muted">Read the station carefully. The first question appears automatically when preparation time ends.</p></div></section></RunnerShell>

  if (phase === 'response' || phase === 'saving') return <RunnerShell><section className="mx-auto max-w-4xl"><RunnerTop label={phase === 'saving' ? 'Saving recording' : 'Recording response'} time={phase === 'saving' ? '…' : `${minutes}:${seconds}`} live={phase === 'response'} /><div className="mt-10 rounded-3xl bg-surface p-7 eb-soft sm:p-10"><div className="flex flex-wrap items-center justify-between gap-4"><span className="rounded-full bg-surface-muted px-3 py-1.5 font-mono text-xs text-muted">Question {questionIndex + 1} of {station.questions.length}</span><span className="text-xs text-muted">Audio is recording</span></div><h1 className="mt-9 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">{station.questions[questionIndex]}</h1><p className="mt-6 text-sm leading-6 text-muted">Take the time you need to answer naturally. Move on when you are ready.</p><div className="mt-10 flex flex-wrap items-center justify-between gap-4"><span className="text-sm text-muted">Press Space to continue</span><button type="button" disabled={phase === 'saving'} onClick={nextQuestion} className="eb-press inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground disabled:opacity-50">{questionIndex === station.questions.length - 1 ? 'Finish & save' : 'Next question'} <ArrowIcon /></button></div></div></section></RunnerShell>

  return <RunnerShell><section className="mx-auto max-w-xl text-center"><span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-mint-muted text-mint-deep"><CheckIcon /></span><h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">Recording saved.</h1><p className="mt-4 text-base leading-7 text-muted">Your {station.title.toLowerCase()} response is now private to your account and ready to revisit.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/interviews/review" className="eb-press inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground">Review recording <ArrowIcon /></Link><Link href="/interviews/practice" className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface-muted">Choose another station</Link></div></section></RunnerShell>
}

function RunnerShell({ children }: { children: React.ReactNode }) { return <main className="min-h-[calc(100vh-4rem)] bg-background px-5 py-10 text-foreground sm:px-8 sm:py-16">{children}</main> }
function RunnerTop({ label, time, live }: { label: string; time: string; live: boolean }) { return <div className="flex items-center justify-between gap-4 border-b border-border pb-5"><span className="inline-flex items-center gap-2 text-sm font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${live ? 'bg-red-500 animate-pulse' : 'bg-brand'}`} /> {label}</span><span className="font-mono text-2xl font-medium tabular-nums">{time}</span></div> }
function ArrowIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
function CheckIcon() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 10 3.5 3.5L16 5.5" /></svg> }
