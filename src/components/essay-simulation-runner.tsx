'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { haptic } from '@/lib/haptics'
import { countWords, MARK_COST, type EssayQuote } from '@/lib/essays/config'
import { startSittingAction, saveEssayDraftAction, submitEssayAction, requestMarkingAction } from '@/lib/essays/actions'

// Full GAMSAT Section II simulation: one Task A + one Task B essay under a SHARED
// clock (65 minutes for both), matching the real sitting. Same teal chrome and
// planning space as the single-essay writer; the student moves freely between the
// two tasks. On finish (or timeout) both essays submit; each can then be sent for
// marking individually from the review screen.
const TEAL = 'linear-gradient(#1BA7C6,#178faa)'
const NAVY = '#2B6CB0'
const INK = '#1a1d24'
const FONT = 'Arial, "Helvetica Neue", Helvetica, system-ui, sans-serif'
const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif'

type PromptView = { id: string; task: string; theme: string; instructions: string; quotes: EssayQuote[]; suggestedMinutes: number }
type MarkingStatus = 'none' | 'pending' | 'approved'

function mmss(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

type Resume = { ids: string[]; bodies: string[]; plans: string[]; elapsedSeconds: number } | null

export function EssaySimulationRunner({
  label,
  examSlug,
  minutes,
  taskA,
  taskB,
  credits: initialCredits = 0,
  resume = null,
}: {
  label: string
  examSlug: string
  minutes: number
  taskA: PromptView
  taskB: PromptView
  credits?: number
  resume?: Resume
}) {
  const router = useRouter()
  const backHref = `/essays/${examSlug}/written-communication`
  const prompts = [taskA, taskB]

  const [phase, setPhase] = useState<'intro' | 'writing' | 'done'>(resume ? 'writing' : 'intro')
  const [active, setActive] = useState(0)
  const [ids, setIds] = useState<string[] | null>(resume?.ids ?? null)
  const [bodies, setBodies] = useState(resume?.bodies ?? ['', ''])
  const [plans, setPlans] = useState(resume?.plans ?? ['', ''])
  const [planOpen, setPlanOpen] = useState(!!(resume?.plans.some((p) => p.trim())))
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)

  const [credits, setCredits] = useState(initialCredits)
  const [marking, setMarking] = useState<MarkingStatus[]>(['none', 'none'])
  const [markBusyIdx, setMarkBusyIdx] = useState<number | null>(null)
  const [markMsg, setMarkMsg] = useState<string | null>(null)

  const baseSeconds = useRef(resume?.elapsedSeconds ?? 0)
  const startedAt = useRef(0)
  const [elapsed, setElapsed] = useState(resume?.elapsedSeconds ?? 0)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>(resume ? 'saved' : 'idle')
  const [savedAt, setSavedAt] = useState('')
  const dirtyRef = useRef(false)
  const dirtyIdxRef = useRef(0)
  const bodiesRef = useRef(bodies)
  const plansRef = useRef(plans)
  const idsRef = useRef<string[] | null>(null)
  useEffect(() => { bodiesRef.current = bodies }, [bodies])
  useEffect(() => { plansRef.current = plans }, [plans])
  useEffect(() => { idsRef.current = ids }, [ids])

  const remaining = Math.max(0, minutes * 60 - elapsed)
  const words = countWords(bodies[active])

  const doSave = useCallback(async (idx: number) => {
    const rid = idsRef.current?.[idx]
    if (!rid) return
    setSaveState('saving')
    const r = await saveEssayDraftAction(rid, bodiesRef.current[idx], elapsedNow(), plansRef.current[idx])
    dirtyRef.current = false
    if (r.ok) { setSaveState('saved'); setSavedAt(new Date(r.savedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })) }
    else setSaveState('idle')
  }, [])

  function elapsedNow() { return baseSeconds.current + (startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0) }

  const submitAll = useCallback(async () => {
    if (!idsRef.current || submitting) return
    setSubmitting(true)
    const secs = elapsedNow()
    await Promise.all(idsRef.current.map((rid, i) =>
      submitEssayAction(rid, bodiesRef.current[i], secs, false, plansRef.current[i]),
    ))
    setElapsed(secs)
    setSubmitting(false)
    setFinishOpen(false)
    setPhase('done')
    haptic(20)
  }, [submitting])
  const submitRef = useRef(submitAll)
  useEffect(() => { submitRef.current = submitAll }, [submitAll])

  // Start (or resume) the shared clock when entering the writing phase.
  useEffect(() => {
    if (phase === 'writing' && startedAt.current === 0) startedAt.current = Date.now()
  }, [phase])

  // Shared clock.
  useEffect(() => {
    if (phase !== 'writing') return
    const t = setInterval(() => {
      const e = elapsedNow()
      setElapsed(e)
      if (e >= minutes * 60) submitRef.current()
    }, 1000)
    return () => clearInterval(t)
  }, [phase, minutes])

  // Debounced autosave of the task just edited.
  useEffect(() => {
    if (phase !== 'writing' || !ids || !dirtyRef.current) return
    const idx = dirtyIdxRef.current
    const t = setTimeout(() => { void doSave(idx) }, 2000)
    return () => clearTimeout(t)
  }, [bodies, plans, phase, ids, doSave])

  useEffect(() => {
    if (phase !== 'writing') return
    const handler = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { void doSave(dirtyIdxRef.current); e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase, doSave])

  async function begin() {
    haptic(15)
    setStarting(true)
    const r = await startSittingAction(taskA.id, taskB.id, minutes)
    setStarting(false)
    if ('denied' in r) { router.push(backHref); return }
    setIds([r.aId, r.bId]); idsRef.current = [r.aId, r.bId]
    startedAt.current = Date.now()
    setPhase('writing')
  }

  function edit(field: 'body' | 'plan', v: string) {
    dirtyRef.current = true; dirtyIdxRef.current = active; setSaveState('idle')
    if (field === 'body') setBodies((b) => b.map((x, i) => (i === active ? v : x)))
    else setPlans((p) => p.map((x, i) => (i === active ? v : x)))
  }

  async function requestMarking(idx: number) {
    const rid = ids?.[idx]
    if (!rid || markBusyIdx !== null || marking[idx] !== 'none') return
    if (credits < MARK_COST) { setMarkMsg('Not enough credits to submit for marking.'); return }
    setMarkBusyIdx(idx); setMarkMsg(null)
    const r = await requestMarkingAction(rid)
    setMarkBusyIdx(null)
    if (r.marked) { setMarking((m) => m.map((s, i) => (i === idx ? 'pending' : s))); setCredits((c) => Math.max(0, c - MARK_COST)) }
    else if (r.reason === 'no_credits') setMarkMsg('Not enough credits to submit for marking.')
    else if (r.reason === 'already') setMarking((m) => m.map((s, i) => (i === idx ? 'pending' : s)))
  }

  // ---------- INTRO ----------
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: FONT, color: INK }}>
        <div className="flex items-center gap-3 px-5 text-white" style={{ background: TEAL, height: 56 }}>
          <span className="text-[17px] font-bold">{label}</span>
        </div>
        <div className="flex-1 overflow-auto px-6 py-8">
          <div className="mx-auto max-w-2xl">
            <span className="inline-block rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-wide" style={{ background: '#eaf7fb', color: '#127a8f' }}>Full simulation</span>
            <h1 className="mt-3 text-[26px] font-bold leading-tight" style={{ color: '#1b2a46' }}>Section II — the full sitting</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-700">
              You have <strong>{minutes} minutes</strong> to write <strong>two essays</strong> — one Task A and one Task B — on a single shared clock, exactly like the real exam. Move between the two tasks freely and manage your own time. Each has a planning space for your notes.
            </p>
            <ul className="mt-4 space-y-2 text-[14.5px] text-gray-700">
              <li className="flex gap-2"><Dot /> The themes are revealed only when you begin.</li>
              <li className="flex gap-2"><Dot /> Both essays submit automatically when the {minutes} minutes are up.</li>
              <li className="flex gap-2"><Dot /> Afterwards you can send either essay for marking ({MARK_COST} credits each).</li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <button onClick={() => router.push(backHref)} className="rounded-md px-5 py-2.5 text-[15px] text-[#2B6CB0] hover:bg-gray-50">Exit</button>
          <button onClick={begin} disabled={starting} className="inline-flex items-center gap-2 rounded-md px-7 py-2.5 text-[15px] font-bold text-white disabled:opacity-60" style={{ background: '#2f9e44' }}>
            {starting ? 'Starting…' : `Begin (${minutes} min)`}
          </button>
        </div>
      </div>
    )
  }

  // ---------- DONE ----------
  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: FONT, color: INK }}>
        <div className="flex items-center gap-3 px-5 text-white" style={{ background: TEAL, height: 56 }}>
          <span className="text-[17px] font-bold">{label} — Review</span>
        </div>
        <div className="border-b border-gray-200 px-6 py-3 text-center text-[14px] text-gray-600">
          Simulation complete · total time {mmss(elapsed)} · {credits} credit{credits === 1 ? '' : 's'} left
          {markMsg ? <span className="ml-2 text-[#b45309]">{markMsg}</span> : null}
        </div>
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {prompts.map((p, i) => {
              const w = countWords(bodies[i])
              return (
                <div key={p.id} className="rounded-lg border border-gray-200">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-100 px-5 py-3">
                    <span className="rounded-full bg-[#eaf7fb] px-2.5 py-0.5 text-[12px] font-semibold" style={{ color: '#127a8f' }}>Task {p.task}</span>
                    <span className="text-[16px] font-bold" style={{ color: '#1b2a46' }}>{p.theme}</span>
                    <span className="text-[13px] text-gray-500">{w} word{w === 1 ? '' : 's'}</span>
                    {marking[i] === 'pending' ? <span className="rounded-full bg-[#fdf3e0] px-2 py-0.5 text-[11px] font-semibold text-[#b45309]">Marking pending</span> : null}
                    <span className="ml-auto">
                      {marking[i] === 'none' ? (
                        <button onClick={() => requestMarking(i)} disabled={markBusyIdx !== null || credits < MARK_COST}
                          className="rounded-md border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-55" style={{ borderColor: '#1BA7C6', color: '#127a8f' }}>
                          {markBusyIdx === i ? 'Submitting…' : `Mark (${MARK_COST} cr)`}
                        </button>
                      ) : null}
                    </span>
                  </div>
                  <div className="px-5 py-4">
                    {plans[i].trim() ? (
                      <details className="mb-3 rounded-md p-3" style={{ background: '#fffdf3' }}>
                        <summary className="cursor-pointer text-[13px] font-semibold" style={{ color: '#8a7a3a' }}>Planning notes</summary>
                        <div className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed" style={{ color: '#5a5335' }}>{plans[i]}</div>
                      </details>
                    ) : null}
                    <div className="whitespace-pre-wrap text-[15.5px] leading-[1.75]" style={{ fontFamily: SERIF }}>
                      {bodies[i].trim() ? bodies[i] : <span className="text-gray-400">Left blank.</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <button onClick={() => router.push(backHref)} className="rounded-md px-5 py-2.5 text-[15px] text-[#2B6CB0] hover:bg-gray-50">Back to Section II</button>
          <button onClick={() => router.push(`/essays/${examSlug}/written-communication/simulation`)} className="rounded-md px-6 py-2.5 text-[15px] font-bold text-white" style={{ background: '#2f9e44' }}>New simulation</button>
        </div>
      </div>
    )
  }

  // ---------- WRITING ----------
  const p = prompts[active]
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: FONT, color: INK }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 text-white" style={{ background: TEAL, height: 56 }}>
        <button onClick={async () => { await doSave(active); router.push(backHref) }} aria-label="Save and exit" className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[5px]" style={{ background: 'rgba(0,0,0,.12)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span className="text-[17px] font-bold" style={{ letterSpacing: '-.01em' }}>{label}</span>
        <div className="ml-auto flex items-center gap-5 text-[15px]">
          <span className="tabular-nums opacity-90">{words} word{words === 1 ? '' : 's'}</span>
          <span className="tabular-nums font-semibold" style={{ color: remaining < 300 ? '#ffe08a' : '#fff' }}>{mmss(remaining)}</span>
        </div>
      </div>

      {/* task tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2.5" style={{ background: '#f1f3f5' }}>
        {prompts.map((pr, idx) => {
          const w = countWords(bodies[idx])
          const on = idx === active
          return (
            <button key={pr.id} onClick={() => setActive(idx)}
              className="rounded-md border-[1.5px] px-4 py-2 text-[14px] font-bold" style={{ borderColor: NAVY, background: on ? NAVY : '#fff', color: on ? '#fff' : NAVY }}>
              Task {pr.task} <span className="font-normal opacity-80">· {w}w</span>
            </button>
          )
        })}
        <span className="ml-auto flex items-center gap-1.5 text-[12.5px] text-gray-500">
          {saveState === 'saving' ? (<><span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" /> Saving…</>)
            : saveState === 'saved' ? (<><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2f9e44" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> Saved{savedAt ? ` ${savedAt}` : ''}</>)
            : 'Unsaved changes'}
        </span>
      </div>

      {/* body */}
      <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="overflow-auto border-b border-gray-200 px-6 py-6 md:border-b-0 md:border-r" style={{ background: '#fbfcfd' }}>
          <div className="max-w-[560px] text-[15px] leading-[1.6]">
            <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: '#eaf7fb', color: '#127a8f' }}>Task {p.task}</span>
            <h2 className="mt-2 text-[19px] font-bold" style={{ color: '#1b2a46' }}>{p.theme}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-gray-700">{p.instructions}</p>
            <ul className="mt-4 space-y-3">
              {p.quotes.map((qt, k) => (
                <li key={k} className="border-l-[3px] border-[#1BA7C6] pl-3.5 text-[15px] italic leading-relaxed text-gray-800">
                  “{qt.text}”{qt.author ? <span className="mt-1 block text-[12.5px] not-italic text-gray-500">— {qt.author}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-7 py-2">
            <button onClick={() => setPlanOpen((o) => !o)} className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: NAVY }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: planOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><path d="m9 18 6-6-6-6" /></svg>
              Planning space
            </button>
            <span className="text-[11.5px] text-gray-400">Task {p.task} notes — not marked</span>
          </div>
          {planOpen ? (
            <textarea value={plans[active]} onChange={(e) => edit('plan', e.target.value)}
              placeholder="Plan before you write: your position, 2–3 examples or angles, and the shape of your argument…"
              className="h-28 flex-none resize-none border-b border-gray-200 px-7 py-3 text-[14px] leading-[1.6] outline-none" style={{ fontFamily: FONT, background: '#fffdf3', color: '#4a4636' }} />
          ) : null}
          <textarea value={bodies[active]} onChange={(e) => edit('body', e.target.value)} autoFocus spellCheck
            placeholder={`Write your Task ${p.task} response here…`}
            className="min-h-0 flex-1 resize-none px-7 py-6 text-[16px] leading-[1.75] outline-none" style={{ fontFamily: SERIF, color: INK }} />
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
        <button onClick={() => { void doSave(active) }} className="rounded-md px-4 py-2.5 text-[15px] text-[#2B6CB0] hover:bg-gray-50">Save draft</button>
        <div className="flex items-center gap-3">
          {active === 0 ? (
            <button onClick={() => setActive(1)} className="rounded-md border border-gray-300 px-5 py-2.5 text-[15px] font-medium hover:bg-gray-50">Go to Task B →</button>
          ) : (
            <button onClick={() => setActive(0)} className="rounded-md border border-gray-300 px-5 py-2.5 text-[15px] font-medium hover:bg-gray-50">← Task A</button>
          )}
          <button onClick={() => setFinishOpen(true)} className="rounded-md px-6 py-2.5 text-[15px] font-bold text-white" style={{ background: '#2f9e44' }}>Finish &amp; submit both</button>
        </div>
      </div>

      {finishOpen ? (
        <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/40 p-4" style={{ fontFamily: FONT }}>
          <div className="w-[min(520px,94vw)] overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="px-6 py-4 text-[17px] font-bold" style={{ color: '#1b2a46' }}>Finish the simulation?</div>
            <p className="border-t border-gray-100 px-6 py-4 text-[14px] leading-relaxed text-gray-600">
              Both essays will be submitted{remaining > 0 ? ` and the remaining ${mmss(remaining)} forfeited` : ''}. Task A: {countWords(bodies[0])} words · Task B: {countWords(bodies[1])} words. You can send either essay for marking afterwards.
            </p>
            <div className="flex justify-end gap-3 px-6 py-4">
              <button onClick={() => setFinishOpen(false)} className="rounded-md px-4 py-2 text-[14px] text-[#2B6CB0] hover:bg-gray-50">Keep writing</button>
              <button onClick={() => { void submitAll() }} disabled={submitting} className="rounded-md px-5 py-2 text-[14px] font-bold text-white disabled:opacity-55" style={{ background: '#2f9e44' }}>Submit both</button>
            </div>
          </div>
        </div>
      ) : null}

      {submitting ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 text-white">
          <div className="flex items-center gap-3 rounded-lg px-6 py-4" style={{ background: '#178faa' }}>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Submitting your essays…
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Dot() {
  return <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full" style={{ background: '#1BA7C6' }} />
}
