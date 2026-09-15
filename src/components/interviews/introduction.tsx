'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Container } from '@/components/container'
import { TourSpotlight } from '@/components/interviews/tour-spotlight'
import { Cyto } from '@/components/ui/cyto'
import { haptic } from '@/lib/haptics'
import { INTRO_STEPS, INTRO_VERSION, introductionAllowed, readIntroductionStep, type IntroStatus } from '@/lib/interviews/introduction'

export function InterviewIntroduction({ children, userId, alreadySeen }: { children: ReactNode; userId: string; alreadySeen: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const allowed = introductionAllowed(pathname)
  const [phase, setPhase] = useState<'loading' | 'tour' | 'idle'>('loading')
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [notice, setNotice] = useState('')
  const initialised = useRef(false)
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queue = useRef(Promise.resolve())
  const lastStatus = useRef<IntroStatus>('started')
  const seenKey = `studocyte:interview-intro:${INTRO_VERSION}:${userId}`
  const progressKey = `${seenKey}:progress`
  const current = INTRO_STEPS[step] ?? INTRO_STEPS[0]

  const writeProgress = useCallback((index: number | null) => {
    try {
      if (index === null) sessionStorage.removeItem(progressKey)
      else sessionStorage.setItem(progressKey, JSON.stringify({ version: INTRO_VERSION, step: index }))
    } catch {}
  }, [progressKey])

  const persist = useCallback((status: IntroStatus) => {
    lastStatus.current = status
    if (status !== 'started') try { localStorage.setItem(seenKey, '1') } catch {}
    queue.current = queue.current.then(async () => {
      try {
        const response = await fetch('/api/interviews/introduction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (!response.ok) throw new Error()
        setNotice('')
      } catch {
        setNotice('You can continue. Your tour preference could not be saved across devices.')
      }
    })
  }, [seenKey])

  useEffect(() => {
    if (initialised.current || !allowed) return
    initialised.current = true
    let saved: number | null = null
    let seen = alreadySeen
    try {
      saved = readIntroductionStep(sessionStorage.getItem(progressKey))
      seen = seen || localStorage.getItem(seenKey) === '1'
    } catch {}
    if (saved !== null) {
      setStep(saved)
      setPhase('tour')
    } else {
      setPhase(seen ? 'idle' : 'tour')
    }
  }, [allowed, alreadySeen, seenKey, progressKey])

  useEffect(() => {
    if (phase !== 'tour' || pathname === current.path) return
    router.push(current.path)
  }, [current.path, pathname, phase, router])

  useEffect(() => {
    if (phase === 'tour') persist('started')
  }, [persist, phase])

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
  }, [])

  const goToStep = useCallback((index: number) => {
    if (leaving || index < 0 || index >= INTRO_STEPS.length) return
    haptic(10)
    setLeaving(true)
    transitionTimer.current = setTimeout(() => {
      setStep(index)
      writeProgress(index)
      setLeaving(false)
      transitionTimer.current = null
    }, 380)
  }, [leaving, writeProgress])

  const open = useCallback(() => {
    setStep(0)
    setLeaving(false)
    writeProgress(0)
    setPhase('tour')
  }, [writeProgress])

  const close = useCallback((status: IntroStatus = 'skipped') => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    transitionTimer.current = null
    setLeaving(false)
    persist(status)
    writeProgress(null)
    setPhase('idle')
  }, [persist, writeProgress])

  const last = step === INTRO_STEPS.length - 1

  return <>
    {allowed && phase === 'idle' && <Container className="flex justify-end pt-3"><button type="button" onClick={open} className="min-h-11 rounded-full px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-muted focus-visible:outline-2 focus-visible:outline-brand">Show workspace tour</button></Container>}
    {children}
    {allowed && phase === 'tour' && <TourSpotlight target={current.target} tabPath={current.tabPath} stepKey={current.id} onPage={pathname === current.path} leaving={leaving} onClose={() => close('skipped')}>
      <div key={current.id} className="interview-tour-step"><div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-mint-muted"><Cyto mood={current.mood} size={58} title={`Cyto introducing ${current.section}`} /></span>
          <div className="min-w-0"><p className="text-[.68rem] font-bold uppercase tracking-[.1em] text-brand">{current.section} tab</p><p className="mt-1 text-xs font-semibold text-muted">{step + 1} of {INTRO_STEPS.length}</p></div>
        </div>
        <button type="button" onClick={() => close('skipped')} className="min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold text-muted hover:bg-surface-muted hover:text-foreground">End tour</button>
      </div>
      <div className="interview-tour-copy mt-4">
        <h2 tabIndex={-1} className="font-display text-2xl font-semibold leading-tight tracking-tight">{current.title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted">{current.body}</p>
        <div className="mt-4 rounded-xl border border-brand/15 bg-brand-muted/45 p-3 text-sm leading-5 text-foreground"><strong className="text-brand">Try this:</strong> {current.tip}</div>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden><span className="block h-full rounded-full bg-brand transition-[width] duration-500 ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none" style={{ width: `${((step + 1) / INTRO_STEPS.length) * 100}%` }} /></div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" disabled={step === 0 || leaving} onClick={() => goToStep(step - 1)} className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:invisible">Back</button>
        <button type="button" disabled={leaving} data-haptic="confirm" onClick={() => last ? close('completed') : goToStep(step + 1)} className="min-h-11 rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:cursor-wait">{last ? 'Finish tour' : 'Next'}</button>
      </div></div>
    </TourSpotlight>}
    {notice && phase === 'idle' && <div role="status" className="fixed bottom-4 right-4 z-[95] max-w-sm rounded-xl border border-border bg-surface p-3 text-xs leading-5 text-muted shadow-lg">{notice} <button type="button" className="font-semibold text-brand underline" onClick={() => persist(lastStatus.current)}>Retry saving</button></div>}
  </>
}
