'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import Link from 'next/link'
import { TI108Calculator } from '@/components/ui/ti108-calculator'
import { fetchQuestionAction, answerQuestionAction, loadExplanationVideoAction } from '@/lib/questions/actions'

type SafeQuestion = { id: string; topic: string | null; stem: string; options: { id: string; label: string; body: string }[] }
type Result = { is_correct: boolean; correct_option_id: string | null; explanation_text: string | null; can_watch_video: boolean; has_video: boolean; video_ready: boolean }
type Answered = { selectedId: string; result: Result; video: { playbackId: string; token: string } | null }

function mmss(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SessionRunner({
  label,
  examSlug,
  questionIds,
  timed,
  minutes,
}: {
  label: string
  examSlug: string
  questionIds: string[]
  timed: boolean
  minutes: number
}) {
  const router = useRouter()
  const total = questionIds.length
  const rootRef = useRef<HTMLDivElement>(null)

  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [i, setI] = useState(0)
  const [cache, setCache] = useState<Record<string, SafeQuestion | null>>({})
  const [pending, setPending] = useState<Record<string, string>>({})
  const [answers, setAnswers] = useState<Record<string, Answered>>({})
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [calcOpen, setCalcOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [hint, setHint] = useState(false)
  const [remaining, setRemaining] = useState(minutes * 60)
  const [leftCount, setLeftCount] = useState(0)
  const [warn, setWarn] = useState(false)

  const id = questionIds[i]
  const q = cache[id]
  const answered = answers[id]

  const ensure = useCallback(async (qid: string) => {
    if (qid in cache) return
    const r = await fetchQuestionAction(qid)
    setCache((c) => ({ ...c, [qid]: r.locked ? null : r.question }))
  }, [cache])
  useEffect(() => { if (started && !finished) ensure(id) }, [id, started, finished, ensure])

  const finish = useCallback(() => {
    setFinished(true)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }, [])

  // timer
  useEffect(() => {
    if (!started || finished || !timed) return
    if (remaining <= 0) { finish(); return }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [started, finished, timed, remaining, finish])

  // kiosk: warn on leaving the tab / fullscreen
  useEffect(() => {
    if (!started || finished) return
    const onVis = () => { if (document.hidden) { setLeftCount((n) => n + 1); setWarn(true) } }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [started, finished])

  function start() {
    // Fire-and-forget: fullscreen is optional and must never block starting.
    rootRef.current?.requestFullscreen?.().catch(() => {})
    setStarted(true)
  }

  async function explain() {
    if (answered) return
    const sel = pending[id]
    if (!sel) { setHint(true); setTimeout(() => setHint(false), 1800); return }
    const r = await answerQuestionAction(id, sel)
    if ('denied' in r) return
    let video: Answered['video'] = null
    if (r.can_watch_video && r.video_ready) {
      const v = await loadExplanationVideoAction(id)
      if (!('denied' in v)) video = v
    }
    setAnswers((a) => ({ ...a, [id]: { selectedId: sel, result: r, video } }))
  }

  const correctCount = Object.values(answers).filter((a) => a.result.is_correct).length
  const answeredCount = Object.keys(answers).length

  // ---- Start gate ----
  if (!started) {
    return (
      <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0e6cb0] p-6 text-center text-white">
        <p className="text-sm uppercase tracking-[0.2em] opacity-80">Practice session</p>
        <h1 className="mt-3 text-3xl font-semibold">{label}</h1>
        <p className="mt-4 max-w-md text-white/85">
          {total} question{total === 1 ? '' : 's'} · {timed ? `${minutes} minute timer` : 'untimed'}.
          Runs full-screen to mirror test conditions — stay in this tab.
        </p>
        <button onClick={start} className="mt-8 rounded-lg bg-white px-6 py-3 font-semibold text-[#0e6cb0]">
          Enter full screen &amp; begin
        </button>
        <Link href={`/practice/${examSlug}`} className="mt-4 text-sm text-white/80 underline">Cancel</Link>
      </div>
    )
  }

  // ---- Results ----
  if (finished) {
    return (
      <div ref={rootRef} className="fixed inset-0 z-[100] overflow-auto bg-[#eef1f4] p-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-[#1b2a46]">Session complete</h1>
          <p className="mt-2 text-gray-600">{label}</p>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <Stat label="Score" value={`${correctCount}/${total}`} />
            <Stat label="Answered" value={`${answeredCount}/${total}`} />
            <Stat label="Left screen" value={String(leftCount)} />
          </div>
          <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
            {questionIds.map((qid, idx) => {
              const a = answers[qid]
              const cls = !a ? 'bg-gray-100 text-gray-500' : a.result.is_correct ? 'bg-[#e2efe4] text-[#157d72]' : 'bg-[#fdecec] text-[#dc2626]'
              return (
                <button key={qid} onClick={() => { setFinished(false); setI(idx) }} className={`h-10 rounded ${cls} text-sm`}>{idx + 1}</button>
              )
            })}
          </div>
          <div className="mt-8 flex gap-3">
            <button onClick={() => router.push(`/practice/${examSlug}`)} className="rounded-lg bg-[#157d72] px-5 py-2.5 text-sm font-medium text-white">New session</button>
            <Link href="/dashboard" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium">Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  // ---- Runner ----
  return (
    <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col bg-[#eef1f4]">
      {warn ? (
        <div className="flex items-center justify-between bg-[#dc2626] px-5 py-2 text-sm text-white">
          <span>You left the test window — in the real exam this isn&rsquo;t allowed.</span>
          <button onClick={() => setWarn(false)} className="underline">Dismiss</button>
        </div>
      ) : null}

      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-3 text-white" style={{ background: 'linear-gradient(#1a78bf,#0e6cb0)' }}>
        <span className="text-lg font-semibold">{label}</span>
        <div className="flex items-center gap-5">
          {timed ? <span className={`tabular-nums text-sm ${remaining < 60 ? 'text-[#ffd21e]' : ''}`}>⏱ {mmss(remaining)}</span> : null}
          <span className="text-sm tabular-nums">{i + 1} of {total}</span>
        </div>
      </div>
      {/* sub bar */}
      <div className="flex items-center justify-between px-5 py-1.5 text-sm text-white" style={{ background: '#5486c4' }}>
        <div className="flex items-center gap-5">
          <button onClick={explain} className="hover:underline">Explain Answer</button>
          <button onClick={() => setCalcOpen((v) => !v)} className={calcOpen ? 'text-[#ffd21e] underline' : 'hover:underline'}>Calculator</button>
        </div>
        <button onClick={() => setFlags((f) => ({ ...f, [id]: !f[id] }))} className={flags[id] ? 'text-[#ffd21e]' : 'hover:underline'}>⚑ Flag for Review</button>
      </div>

      {/* content */}
      <div className="flex-1 overflow-auto bg-white p-6 text-[#1b1b1b]">
        <div className="mx-auto max-w-3xl">
          {q === undefined ? (
            <p className="text-gray-500">Loading…</p>
          ) : q === null ? (
            <p className="text-gray-500">This question isn&rsquo;t available.</p>
          ) : (
            <>
              {q.topic ? <p className="text-xs font-semibold uppercase tracking-wide text-[#0e6cb0]">{q.topic}</p> : null}
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>
              <div className="mt-5 flex flex-col gap-2">
                {q.options.map((o) => {
                  const sel = (answered ? answered.selectedId : pending[id]) === o.id
                  const correct = answered && answered.result.correct_option_id === o.id
                  const wrong = answered && sel && !answered.result.is_correct
                  let cls = 'border-gray-300 bg-white hover:bg-gray-50'
                  if (correct) cls = 'border-[#157d72] bg-[#e2efec]'
                  else if (wrong) cls = 'border-[#dc2626] bg-[#fdecec]'
                  else if (sel) cls = 'border-[#0e6cb0] bg-[#eef5fb]'
                  return (
                    <button key={o.id} disabled={!!answered} onClick={() => setPending((p) => ({ ...p, [id]: o.id }))} className={`flex items-center gap-3 rounded border px-4 py-3 text-left text-sm transition-colors ${cls}`}>
                      <span className="grid h-6 w-6 flex-none place-items-center rounded border border-gray-400 text-xs font-semibold">{o.label}</span>
                      <span>{o.body}</span>
                    </button>
                  )
                })}
              </div>
              {hint ? <p className="mt-3 text-sm text-[#dc2626]">Select an answer, then choose “Explain Answer”.</p> : null}
              {answered ? (
                <div className="mt-6 space-y-4 border-t border-gray-200 pt-5">
                  <p className={`text-sm font-semibold ${answered.result.is_correct ? 'text-[#157d72]' : 'text-[#dc2626]'}`}>{answered.result.is_correct ? 'Correct' : 'Not quite'}</p>
                  {answered.result.explanation_text ? (
                    <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed"><p className="mb-1 font-semibold">Explanation</p>{answered.result.explanation_text}</div>
                  ) : null}
                  {answered.video ? (
                    <div className="overflow-hidden rounded border border-gray-200"><MuxPlayer playbackId={answered.video.playbackId} tokens={{ playback: answered.video.token }} streamType="on-demand" accentColor="#157d72" /></div>
                  ) : !answered.result.has_video ? null : answered.result.can_watch_video ? (
                    answered.result.video_ready ? null : <p className="text-sm text-gray-500">Video explanation is processing.</p>
                  ) : (
                    <div className="rounded border-2 border-[#157d72] bg-[#e2efec] p-5 text-center">
                      <p className="font-semibold text-[#1b2a46]">Video explanation</p>
                      <p className="mt-1 text-sm text-gray-600">Watch this worked through on video with a subscription.</p>
                      <Link href="/pricing" className="mt-3 inline-block rounded-md bg-[#157d72] px-4 py-2 text-sm font-medium text-white">See plans</Link>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* bottom bar */}
      <div className="flex items-center justify-between text-sm text-white" style={{ background: 'linear-gradient(#0e6cb0,#0c5f9c)' }}>
        <button onClick={() => { if (confirm('End the session now?')) finish() }} className="px-5 py-3 hover:bg-white/10">⤶ End session</button>
        <div className="flex">
          <button disabled={i === 0} onClick={() => setI(i - 1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e] disabled:opacity-40">← Previous</button>
          <button onClick={() => setNavOpen(true)} className="border-l border-white/25 px-5 py-3">✧ Navigator</button>
          {i >= total - 1 ? (
            <button onClick={finish} className="border-l border-white/25 bg-white/10 px-5 py-3 text-[#ffd21e]">Finish →</button>
          ) : (
            <button onClick={() => setI(i + 1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">Next →</button>
          )}
        </div>
      </div>

      {calcOpen ? <TI108Calculator onClose={() => setCalcOpen(false)} /> : null}

      {navOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) setNavOpen(false) }}>
          <div className="max-h-[80vh] w-[min(520px,92vw)] overflow-auto rounded-lg bg-white">
            <div className="flex items-center justify-between px-5 py-3 font-semibold text-white" style={{ background: '#0e6cb0' }}>Navigator <button onClick={() => setNavOpen(false)}>✕</button></div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2 p-4">
              {questionIds.map((qid, idx) => (
                <button key={qid} onClick={() => { setI(idx); setNavOpen(false) }} className={`relative h-11 rounded border text-sm ${answers[qid] ? 'border-[#7bb08a] bg-[#e2efe4]' : 'border-gray-300 bg-white'} ${idx === i ? 'outline outline-2 outline-[#0e6cb0]' : ''}`}>
                  {flags[qid] ? <span className="absolute right-1 top-0.5 text-[10px] text-[#c0392b]">⚑</span> : null}{idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="text-2xl font-semibold text-[#1b2a46] tabular-nums">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  )
}
