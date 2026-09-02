'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExamConfirm } from '@/components/exam-confirm'
import { haptic } from '@/lib/haptics'
import { countWords, type EssayQuote } from '@/lib/essays/config'
import { startEssayAction, saveEssayDraftAction, submitEssayAction } from '@/lib/essays/actions'

// GAMSAT Section II (Written Communication) writer. Same teal chrome as the
// passage runner (gamsat-runner.tsx), but instead of MCQs the student reads a
// THEME + quotes on the left and writes an essay on the right. The draft
// autosaves as they type; a session works timed (countdown → auto-submit) or
// untimed (elapsed shown, no clock pressure). Submitting locks the essay to a
// read-only review. The MCQ runner and its grading are untouched.
const TEAL = 'linear-gradient(#1BA7C6,#178faa)'
const NAVY = '#2B6CB0'
const INK = '#1a1d24'
const FONT = 'Arial, "Helvetica Neue", Helvetica, system-ui, sans-serif'
const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif'

type PromptView = {
  id: string
  task: string
  theme: string
  instructions: string
  quotes: EssayQuote[]
  suggestedMinutes: number
}
type Resume = {
  id: string
  body: string
  timed: boolean
  durationMinutes: number | null
  timeSpentSeconds: number
  status: 'draft' | 'submitted'
} | null

function mmss(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function EssayRunner({
  label,
  examSlug,
  prompt,
  resume = null,
}: {
  label: string
  examSlug: string
  prompt: PromptView
  resume?: Resume
}) {
  const router = useRouter()
  const backHref = `/essays/${examSlug}/written-communication`

  // Resuming a *submitted* essay opens straight into read-only review.
  const initialPhase: 'intro' | 'writing' | 'done' =
    resume?.status === 'submitted' ? 'done' : resume ? 'writing' : 'intro'

  const [phase, setPhase] = useState(initialPhase)
  const [timed, setTimed] = useState(resume?.timed ?? false)
  const minuteChoices = useMemo(() => {
    const s = new Set<number>([prompt.suggestedMinutes, 30, 60])
    return [...s].filter((m) => m > 0).sort((a, b) => a - b)
  }, [prompt.suggestedMinutes])
  const [minutes, setMinutes] = useState(resume?.durationMinutes ?? prompt.suggestedMinutes)

  const [responseId, setResponseId] = useState<string | null>(resume?.id ?? null)
  const [body, setBody] = useState(resume?.body ?? '')
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)

  // Time bookkeeping. baseSeconds = time carried over from an earlier draft session.
  const baseSeconds = useRef(resume?.timeSpentSeconds ?? 0)
  const startedAt = useRef<number>(0)
  const [elapsed, setElapsed] = useState(resume?.timeSpentSeconds ?? 0) // total seconds this essay has taken
  const totalSeconds = useCallback(
    () => baseSeconds.current + (startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0),
    [],
  )

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>(resume ? 'saved' : 'idle')
  const [savedAt, setSavedAt] = useState<string>('')
  const dirtyRef = useRef(false)
  const bodyRef = useRef(body)
  useEffect(() => { bodyRef.current = body }, [body])

  const words = countWords(body)

  // On entering the writing phase, mark the clock start.
  useEffect(() => {
    if (phase === 'writing' && startedAt.current === 0) startedAt.current = Date.now()
  }, [phase])

  // 1 Hz tick: advance the elapsed/remaining display and auto-submit when a
  // timed session runs out.
  const submitRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (phase !== 'writing') return
    const t = setInterval(() => {
      const total = totalSeconds()
      setElapsed(total)
      if (timed && total >= minutes * 60) submitRef.current()
    }, 1000)
    return () => clearInterval(t)
  }, [phase, timed, minutes, totalSeconds])

  const doSave = useCallback(async () => {
    if (!responseId) return
    setSaveState('saving')
    const r = await saveEssayDraftAction(responseId, bodyRef.current, totalSeconds())
    dirtyRef.current = false
    if (r.ok) {
      setSaveState('saved')
      setSavedAt(new Date(r.savedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }))
    } else {
      setSaveState('idle')
    }
  }, [responseId, totalSeconds])

  // Debounced autosave whenever the body changes.
  useEffect(() => {
    if (phase !== 'writing' || !responseId || !dirtyRef.current) return
    const t = setTimeout(() => { void doSave() }, 2000)
    return () => clearTimeout(t)
  }, [body, phase, responseId, doSave])

  // Periodic save so untimed elapsed time persists even while the student pauses.
  useEffect(() => {
    if (phase !== 'writing' || !responseId) return
    const t = setInterval(() => { if (dirtyRef.current) void doSave() }, 20000)
    return () => clearInterval(t)
  }, [phase, responseId, doSave])

  // Warn on leave with unsaved edits; fire a last-ditch save.
  useEffect(() => {
    if (phase !== 'writing') return
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) { void doSave(); e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase, doSave])

  async function begin() {
    haptic(15)
    setStarting(true)
    const r = await startEssayAction(prompt.id, { timed, minutes: timed ? minutes : null })
    setStarting(false)
    if ('denied' in r) { router.push(backHref); return }
    setResponseId(r.id)
    baseSeconds.current = 0
    startedAt.current = Date.now()
    setPhase('writing')
  }

  const submit = useCallback(async () => {
    if (!responseId || submitting) return
    setSubmitting(true)
    baseSeconds.current = totalSeconds()
    startedAt.current = 0
    await submitEssayAction(responseId, bodyRef.current, baseSeconds.current)
    setElapsed(baseSeconds.current)
    setSubmitting(false)
    setConfirmFinish(false)
    setPhase('done')
    haptic(20)
  }, [responseId, submitting, totalSeconds])
  useEffect(() => { submitRef.current = () => { void submit() } }, [submit])

  function onChangeBody(v: string) {
    setBody(v)
    dirtyRef.current = true
    setSaveState('idle')
  }

  const remaining = timed ? Math.max(0, minutes * 60 - elapsed) : 0

  // ---------- INTRO ----------
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: FONT, color: INK }}>
        <div className="flex items-center gap-3 px-5 text-white" style={{ background: TEAL, height: 56 }}>
          <span className="text-[17px] font-bold">{label}</span>
        </div>
        <div className="flex-1 overflow-auto px-6 py-8">
          <div className="mx-auto max-w-2xl">
            <span className="inline-block rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-wide" style={{ background: '#eaf7fb', color: '#127a8f' }}>
              Task {prompt.task}
            </span>
            <h1 className="mt-3 text-[26px] font-bold leading-tight" style={{ color: '#1b2a46' }}>{prompt.theme}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-700">{prompt.instructions}</p>

            <div className="mt-6 rounded-lg border border-gray-200 bg-[#fafbfc] p-5">
              <p className="text-[13px] font-bold uppercase tracking-wide text-gray-500">Conditions</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { haptic(6); setTimed(false) }}
                  className="flex-1 rounded-md border-[1.5px] px-4 py-3 text-left text-[15px] font-semibold transition-colors"
                  style={{ borderColor: !timed ? NAVY : '#d5dae1', background: !timed ? '#eef4fb' : '#fff', color: !timed ? NAVY : INK }}
                >
                  Untimed
                  <span className="mt-0.5 block text-[12.5px] font-normal text-gray-500">Write at your own pace</span>
                </button>
                <button
                  onClick={() => { haptic(6); setTimed(true) }}
                  className="flex-1 rounded-md border-[1.5px] px-4 py-3 text-left text-[15px] font-semibold transition-colors"
                  style={{ borderColor: timed ? NAVY : '#d5dae1', background: timed ? '#eef4fb' : '#fff', color: timed ? NAVY : INK }}
                >
                  Timed
                  <span className="mt-0.5 block text-[12.5px] font-normal text-gray-500">Auto-submits when time runs out</span>
                </button>
              </div>
              {timed ? (
                <div className="mt-4">
                  <p className="text-[13px] font-medium text-gray-600">Time limit</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {minuteChoices.map((m) => (
                      <button
                        key={m} onClick={() => { haptic(6); setMinutes(m) }}
                        className="rounded-md border-[1.5px] px-4 py-2 text-[14px] font-semibold transition-colors"
                        style={{ borderColor: minutes === m ? NAVY : '#d5dae1', background: minutes === m ? NAVY : '#fff', color: minutes === m ? '#fff' : NAVY }}
                      >
                        {m} min{m === prompt.suggestedMinutes ? ' · GAMSAT pace' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <p className="mt-5 text-[13.5px] leading-relaxed text-gray-500">
              Your essay saves automatically as you write and appears afterwards under “Your essays”, so you can compare timed and untimed attempts of the same theme.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <button onClick={() => router.push(backHref)} className="rounded-md px-5 py-2.5 text-[15px] text-[#2B6CB0] hover:bg-gray-50">Exit</button>
          <button onClick={begin} disabled={starting} className="inline-flex items-center gap-2 rounded-md px-7 py-2.5 text-[15px] font-bold text-white disabled:opacity-60" style={{ background: '#2f9e44' }}>
            {starting ? 'Starting…' : `Begin ${timed ? `(${minutes} min)` : 'writing'}`}
          </button>
        </div>
      </div>
    )
  }

  // ---------- DONE / REVIEW ----------
  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: FONT, color: INK }}>
        <div className="flex items-center gap-3 px-5 text-white" style={{ background: TEAL, height: 56 }}>
          <span className="text-[17px] font-bold">{label} — Review</span>
        </div>
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-1">
            <span className="text-[17px] font-bold" style={{ color: '#1b2a46' }}>{prompt.theme}</span>
            <span className="rounded-full bg-[#eaf7fb] px-2.5 py-0.5 text-[12px] font-semibold" style={{ color: '#127a8f' }}>Task {prompt.task}</span>
            <span className="text-[14px] text-gray-600">{words} word{words === 1 ? '' : 's'}</span>
            <span className="text-[14px] text-gray-600">{timed ? `Timed · ${minutes} min` : 'Untimed'}</span>
            <span className="text-[14px] text-gray-600">Time spent {mmss(elapsed)}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="mx-auto max-w-3xl">
            <details className="mb-5 rounded-lg border border-gray-200 bg-[#fafbfc] p-4">
              <summary className="cursor-pointer text-[14px] font-semibold text-gray-700">Show the prompt &amp; quotes</summary>
              <p className="mt-3 text-[14px] leading-relaxed text-gray-700">{prompt.instructions}</p>
              <ul className="mt-3 space-y-2">
                {prompt.quotes.map((qt, k) => (
                  <li key={k} className="border-l-2 border-[#1BA7C6] pl-3 text-[14.5px] italic text-gray-800">
                    “{qt.text}”{qt.author ? <span className="mt-0.5 block text-[12.5px] not-italic text-gray-500">— {qt.author}</span> : null}
                  </li>
                ))}
              </ul>
            </details>
            <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-6 text-[16px] leading-[1.75]" style={{ fontFamily: SERIF }}>
              {body.trim() ? body : <span className="text-gray-400">This essay was left blank.</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <button onClick={() => router.push(backHref)} className="rounded-md px-5 py-2.5 text-[15px] text-[#2B6CB0] hover:bg-gray-50">Back to Section II</button>
          <button onClick={() => router.push(`/essays/${examSlug}/written-communication/${prompt.id}`)} className="rounded-md px-6 py-2.5 text-[15px] font-bold text-white" style={{ background: '#2f9e44' }}>Write again</button>
        </div>
      </div>
    )
  }

  // ---------- WRITING ----------
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: FONT, color: INK }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 text-white" style={{ background: TEAL, height: 56 }}>
        <button onClick={() => setConfirmFinish(true)} aria-label="Finish" className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[5px]" style={{ background: 'rgba(0,0,0,.12)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span className="text-[17px] font-bold" style={{ letterSpacing: '-.01em' }}>{label}</span>
        <div className="ml-auto flex items-center gap-5 text-[15px]">
          <span className="tabular-nums opacity-90">{words} word{words === 1 ? '' : 's'}</span>
          {timed
            ? <span className="tabular-nums font-semibold" style={{ color: remaining < 60 ? '#ffe08a' : '#fff' }}>{mmss(remaining)}</span>
            : <span className="tabular-nums opacity-90">{mmss(elapsed)}</span>}
        </div>
      </div>

      {/* status strip */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 text-[13px]" style={{ background: '#f1f3f5' }}>
        <span className="font-semibold" style={{ color: NAVY }}>{timed ? `Timed · ${minutes} min` : 'Untimed'}</span>
        <span className="flex items-center gap-1.5 text-gray-500">
          {saveState === 'saving' ? (
            <><span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" /> Saving…</>
          ) : saveState === 'saved' ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2f9e44" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> Saved{savedAt ? ` ${savedAt}` : ''}</>
          ) : (
            <>Unsaved changes</>
          )}
        </span>
      </div>

      {/* body: stimulus left, essay right */}
      <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="overflow-auto border-b border-gray-200 px-6 py-6 md:border-b-0 md:border-r" style={{ background: '#fbfcfd' }}>
          <div className="max-w-[560px] text-[15px] leading-[1.6]">
            <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: '#eaf7fb', color: '#127a8f' }}>Task {prompt.task}</span>
            <h2 className="mt-2 text-[19px] font-bold" style={{ color: '#1b2a46' }}>{prompt.theme}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-gray-700">{prompt.instructions}</p>
            <ul className="mt-4 space-y-3">
              {prompt.quotes.map((qt, k) => (
                <li key={k} className="border-l-[3px] border-[#1BA7C6] pl-3.5 text-[15px] italic leading-relaxed text-gray-800">
                  “{qt.text}”{qt.author ? <span className="mt-1 block text-[12.5px] not-italic text-gray-500">— {qt.author}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <textarea
            value={body}
            onChange={(e) => onChangeBody(e.target.value)}
            autoFocus
            spellCheck
            placeholder="Write your response here…"
            className="min-h-0 flex-1 resize-none px-7 py-6 text-[16px] leading-[1.75] outline-none"
            style={{ fontFamily: SERIF, color: INK }}
          />
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
        <button onClick={() => { void doSave() }} className="rounded-md px-4 py-2.5 text-[15px] text-[#2B6CB0] hover:bg-gray-50">Save draft</button>
        <button onClick={() => setConfirmFinish(true)} className="rounded-md px-6 py-2.5 text-[15px] font-bold text-white" style={{ background: '#2f9e44' }}>Finish &amp; submit</button>
      </div>

      {confirmFinish ? (
        <ExamConfirm
          title="Submit this essay?"
          message={`You've written ${words} word${words === 1 ? '' : 's'}. Once submitted, the essay is saved and locked for review — you can always start a fresh attempt of this theme afterwards.`}
          confirmLabel="Yes, submit"
          cancelLabel="Keep writing"
          onConfirm={() => { void submit() }}
          onCancel={() => setConfirmFinish(false)}
        />
      ) : null}

      {submitting ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 text-white">
          <div className="flex items-center gap-3 rounded-lg px-6 py-4" style={{ background: '#178faa' }}>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving your essay…
          </div>
        </div>
      ) : null}
    </div>
  )
}
