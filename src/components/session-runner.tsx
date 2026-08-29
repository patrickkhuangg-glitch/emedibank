'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import Link from 'next/link'
import { TI108Calculator } from '@/components/ui/ti108-calculator'
import { fetchQuestionAction, answerQuestionAction, loadExplanationVideoAction } from '@/lib/questions/actions'

type SafeQuestion = { id: string; topic: string | null; stem: string; passage: string | null; options: { id: string; label: string; body: string }[] }
type Result = { is_correct: boolean; correct_option_id: string | null; explanation_text: string | null; can_watch_video: boolean; has_video: boolean; video_ready: boolean }
type Answered = { selectedId: string; result: Result; video: { playbackId: string; token: string } | null }

const ARIAL = 'Arial, Helvetica, sans-serif'
const BAR = 'linear-gradient(#1a78bf,#1268ad)'
const SUBBAR = '#4e82c4'

function mmss(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SessionRunner({
  label,
  examSlug,
  instructions,
  questionIds,
  timed,
  minutes,
}: {
  label: string
  examSlug: string
  instructions: string
  questionIds: string[]
  timed: boolean
  minutes: number
}) {
  const router = useRouter()
  const total = questionIds.length
  const rootRef = useRef<HTMLDivElement>(null)

  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>('intro')
  const [readyModal, setReadyModal] = useState(false)
  const [i, setI] = useState(0)
  const [cache, setCache] = useState<Record<string, SafeQuestion | null>>({})
  const [pending, setPending] = useState<Record<string, string>>({})
  const [answers, setAnswers] = useState<Record<string, Answered>>({})
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [calcOpen, setCalcOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
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
  useEffect(() => { if (phase === 'running') ensure(id) }, [id, phase, ensure])

  const finish = useCallback(() => {
    setPhase('done')
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }, [])

  const explain = useCallback(async () => {
    if (answers[id]) return
    const sel = pending[id]
    if (!sel) return
    const r = await answerQuestionAction(id, sel)
    if ('denied' in r) return
    let video: Answered['video'] = null
    if (r.can_watch_video && r.video_ready) {
      const v = await loadExplanationVideoAction(id)
      if (!('denied' in v)) video = v
    }
    setAnswers((a) => ({ ...a, [id]: { selectedId: sel, result: r, video } }))
  }, [answers, id, pending])

  const go = useCallback((d: number) => setI((cur) => Math.min(total - 1, Math.max(0, cur + d))), [total])

  // timer
  useEffect(() => {
    if (phase !== 'running' || !timed) return
    if (remaining <= 0) { finish(); return }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timed, remaining, finish])

  // kiosk: warn on leaving the tab
  useEffect(() => {
    if (phase !== 'running') return
    const onVis = () => { if (document.hidden) { setLeftCount((n) => n + 1); setWarn(true) } }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [phase])

  // keyboard shortcuts (UCAT-style)
  useEffect(() => {
    if (phase !== 'running') return
    const h = (e: KeyboardEvent) => {
      if (e.altKey) {
        const k = e.key.toLowerCase()
        if (k === 'n') { e.preventDefault(); go(1) }
        else if (k === 'p') { e.preventDefault(); go(-1) }
        else if (k === 'f') { e.preventDefault(); setFlags((f) => ({ ...f, [id]: !f[id] })) }
        else if (k === 'c') { e.preventDefault(); setCalcOpen((v) => !v) }
        else if (k === 's' || k === 'v' || k === 'a' || k === 'i') { e.preventDefault(); setNavOpen(true) }
        return
      }
      // A–D select the option (only when calculator is closed)
      if (!calcOpen && !answers[id]) {
        const idx = ['a', 'b', 'c', 'd', 'e'].indexOf(e.key.toLowerCase())
        const opt = cache[id]?.options[idx]
        if (opt) setPending((p) => ({ ...p, [id]: opt.id }))
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, id, calcOpen, answers, cache, go])

  function begin() {
    rootRef.current?.requestFullscreen?.().catch(() => {})
    setReadyModal(false)
    setPhase('running')
  }

  const correctCount = Object.values(answers).filter((a) => a.result.is_correct).length
  const answeredCount = Object.keys(answers).length

  const CounterIcon = () => (
    <svg width="18" height="15" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="2" width="20" height="4" rx="1" /><rect x="2" y="8" width="20" height="4" rx="1" /><rect x="4" y="14" width="16" height="3" rx="1" /></svg>
  )

  // ---------- INTRO ----------
  if (phase === 'intro') {
    return (
      <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: ARIAL }}>
        <div className="px-5 py-3 text-white" style={{ background: BAR }}><span className="text-lg font-semibold">{label}</span></div>
        <div className="h-3" style={{ background: SUBBAR }} />
        <div className="flex-1 overflow-auto p-8 text-[#1b1b1b]">
          <div className="mx-auto max-w-4xl whitespace-pre-wrap text-[15px] leading-relaxed">{instructions}</div>
        </div>
        <div className="flex items-center justify-between text-white" style={{ background: BAR }}>
          <button onClick={() => router.push(`/practice/${examSlug}`)} className="px-5 py-3 hover:bg-white/10">⤶ End Exam</button>
          <button onClick={() => setReadyModal(true)} className="px-6 py-3 hover:bg-white/10">Next →</button>
        </div>
        {readyModal ? (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30">
            <div className="w-[min(880px,92vw)] text-white" style={{ background: BAR }}>
              <div className="px-5 py-3 text-lg font-semibold" style={{ background: '#0f5c9e' }}>Ready to Begin Exam</div>
              <div className="flex items-center gap-4 px-6 py-6">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#3f9d3f] text-xl font-bold">?</span>
                <p className="text-[15px]">If you are ready to begin the exam, select the Yes button. Otherwise, select the No button to return to the previous screen.</p>
              </div>
              <div className="flex justify-center gap-4 pb-6">
                <button onClick={begin} className="min-w-[72px] rounded border border-white/70 px-4 py-1.5 hover:bg-white/10"><u>Y</u>es</button>
                <button onClick={() => setReadyModal(false)} className="min-w-[72px] rounded border border-white/70 px-4 py-1.5 hover:bg-white/10"><u>N</u>o</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  // ---------- DONE ----------
  if (phase === 'done') {
    return (
      <div ref={rootRef} className="fixed inset-0 z-[100] overflow-auto bg-[#eef1f4] p-6" style={{ fontFamily: ARIAL }}>
        <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-[#1b2a46]">Review screen</h1>
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
              return <button key={qid} onClick={() => { setPhase('running'); setI(idx) }} className={`h-10 rounded ${cls} text-sm`}>{idx + 1}</button>
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

  // ---------- RUNNING ----------
  const selectedId = answered ? answered.selectedId : pending[id]
  const Options = q ? (
    <div className="flex flex-col">
      {q.options.map((o) => {
        const sel = selectedId === o.id
        const correct = answered && answered.result.correct_option_id === o.id
        const wrong = answered && sel && !answered.result.is_correct
        return (
          <button key={o.id} disabled={!!answered} onClick={() => setPending((p) => ({ ...p, [id]: o.id }))} className="flex items-start gap-3 py-2.5 text-left text-[15px]">
            <span className={`mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center rounded-full border-2 ${correct ? 'border-[#157d72]' : wrong ? 'border-[#dc2626]' : sel ? 'border-[#1268ad]' : 'border-gray-500'}`}>
              {sel ? <span className={`h-2 w-2 rounded-full ${correct ? 'bg-[#157d72]' : wrong ? 'bg-[#dc2626]' : 'bg-[#1268ad]'}`} /> : null}
            </span>
            <span className="w-7 flex-none font-medium">{o.label}.</span>
            <span className={correct ? 'font-medium text-[#157d72]' : wrong ? 'text-[#dc2626]' : ''}>{o.body}</span>
          </button>
        )
      })}
    </div>
  ) : null

  const Explanation = answered ? (
    <div className="mt-6 space-y-4 border-t border-gray-200 pt-5">
      <p className={`text-sm font-semibold ${answered.result.is_correct ? 'text-[#157d72]' : 'text-[#dc2626]'}`}>{answered.result.is_correct ? 'Correct' : 'Not quite'}</p>
      {answered.result.explanation_text ? <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed"><p className="mb-1 font-semibold">Answer rationale</p>{answered.result.explanation_text}</div> : null}
      {answered.video ? (
        <div className="overflow-hidden rounded border border-gray-200"><MuxPlayer playbackId={answered.video.playbackId} tokens={{ playback: answered.video.token }} streamType="on-demand" accentColor="#157d72" /></div>
      ) : !answered.result.has_video ? null : answered.result.can_watch_video ? (answered.result.video_ready ? null : <p className="text-sm text-gray-500">Video explanation is processing.</p>) : (
        <div className="rounded border-2 border-[#157d72] bg-[#e2efec] p-5 text-center">
          <p className="font-semibold text-[#1b2a46]">Video explanation</p>
          <p className="mt-1 text-sm text-gray-600">Watch this worked through on video with a subscription.</p>
          <Link href="/pricing" className="mt-3 inline-block rounded-md bg-[#157d72] px-4 py-2 text-sm font-medium text-white">See plans</Link>
        </div>
      )}
    </div>
  ) : null

  return (
    <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: ARIAL }}>
      {warn ? (
        <div className="flex items-center justify-between bg-[#dc2626] px-5 py-2 text-sm text-white">
          <span>You left the test window — in the real exam this isn&rsquo;t allowed.</span>
          <button onClick={() => setWarn(false)} className="underline">Dismiss</button>
        </div>
      ) : null}

      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 text-white" style={{ background: BAR }}>
        <span className="text-lg font-semibold">{label}</span>
        <div className="flex items-center gap-5">
          {timed ? <span className={`text-sm tabular-nums ${remaining < 60 ? 'text-[#ffd21e]' : ''}`}>{mmss(remaining)}</span> : null}
          <span className="flex items-center gap-2 text-sm tabular-nums"><CounterIcon />{i + 1} of {total}</span>
        </div>
      </div>
      {/* sub bar */}
      <div className="flex items-center justify-between px-5 py-1.5 text-sm text-white" style={{ background: SUBBAR }}>
        <div className="flex items-center gap-6">
          <button onClick={explain} className="flex items-center gap-1.5 hover:underline"><span aria-hidden>💡</span>Explain Answer</button>
          <button onClick={() => setCalcOpen((v) => !v)} className={`flex items-center gap-1.5 hover:underline ${calcOpen ? 'text-[#ffd21e]' : ''}`}><span aria-hidden>▭</span><u>C</u>alculator</button>
        </div>
        <button onClick={() => setFlags((f) => ({ ...f, [id]: !f[id] }))} className={`flex items-center gap-1.5 hover:underline ${flags[id] ? 'text-[#ffd21e]' : ''}`}><span aria-hidden>⚑</span><u>F</u>lag for Review</button>
      </div>

      {/* content */}
      <div className="flex-1 overflow-auto p-6 text-[#1b1b1b]">
        {q === undefined ? (
          <p className="text-gray-500">Loading…</p>
        ) : q === null ? (
          <p className="text-gray-500">This question isn&rsquo;t available.</p>
        ) : q.passage ? (
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:divide-x md:divide-gray-300">
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed md:pr-8">{q.passage}</div>
            <div className="md:pl-8">
              <p className="text-[15px] leading-relaxed">{q.stem}</p>
              <div className="mt-6">{Options}</div>
              {Explanation}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            {q.topic ? <p className="text-xs font-semibold uppercase tracking-wide text-[#1268ad]">{q.topic}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>
            <div className="mt-5">{Options}</div>
            {Explanation}
          </div>
        )}
      </div>

      {/* bottom bar */}
      <div className="flex items-center justify-between text-sm text-white" style={{ background: BAR }}>
        <button onClick={() => { if (confirm('End the session now?')) finish() }} className="px-5 py-3 hover:bg-white/10">⤶ End Exam</button>
        <div className="flex">
          {i > 0 ? <button onClick={() => go(-1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">← Previous</button> : null}
          <button onClick={() => setNavOpen(true)} className="border-l border-white/25 px-5 py-3">✧ Navigator</button>
          {i >= total - 1 ? <button onClick={finish} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">Finish →</button> : <button onClick={() => go(1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">Next →</button>}
        </div>
      </div>

      {calcOpen ? <TI108Calculator onClose={() => setCalcOpen(false)} /> : null}

      {navOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) setNavOpen(false) }}>
          <div className="max-h-[80vh] w-[min(520px,92vw)] overflow-auto rounded-lg bg-white">
            <div className="flex items-center justify-between px-5 py-3 font-semibold text-white" style={{ background: '#1268ad' }}>Navigator <button onClick={() => setNavOpen(false)}>✕</button></div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2 p-4">
              {questionIds.map((qid, idx) => (
                <button key={qid} onClick={() => { setI(idx); setNavOpen(false) }} className={`relative h-11 rounded border text-sm ${answers[qid] ? 'border-[#7bb08a] bg-[#e2efe4]' : 'border-gray-300 bg-white'} ${idx === i ? 'outline outline-2 outline-[#1268ad]' : ''}`}>
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
      <div className="text-2xl font-semibold tabular-nums text-[#1b2a46]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  )
}
