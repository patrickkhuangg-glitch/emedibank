'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import Link from 'next/link'
import { TI108Calculator } from '@/components/ui/ti108-calculator'
import {
  fetchQuestionAction,
  answerQuestionAction,
  loadExplanationVideoAction,
} from '@/lib/questions/actions'

type SafeQuestion = { id: string; topic: string | null; stem: string; options: { id: string; label: string; body: string }[] }
type Result = {
  is_correct: boolean
  correct_option_id: string | null
  explanation_text: string | null
  can_watch_video: boolean
  has_video: boolean
  video_ready: boolean
}
type Answered = { selectedId: string; result: Result; video: { playbackId: string; token: string } | null }

export function Runner({
  subtestName,
  examSlug,
  questionIds,
}: {
  subtestName: string
  examSlug: string
  questionIds: string[]
}) {
  const router = useRouter()
  const total = questionIds.length
  const [i, setI] = useState(0)
  const [cache, setCache] = useState<Record<string, SafeQuestion | null>>({})
  const [pending, setPending] = useState<Record<string, string>>({})
  const [answers, setAnswers] = useState<Record<string, Answered>>({})
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [calcOpen, setCalcOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [hint, setHint] = useState(false)

  const id = questionIds[i]
  const q = cache[id]
  const answered = answers[id]

  const ensure = useCallback(async (qid: string) => {
    if (qid in cache) return
    const r = await fetchQuestionAction(qid)
    setCache((c) => ({ ...c, [qid]: r.locked ? null : r.question }))
  }, [cache])

  useEffect(() => { ensure(id) }, [id, ensure])

  async function explain() {
    if (answered) return
    const sel = pending[id]
    if (!sel) { setHint(true); setTimeout(() => setHint(false), 2000); return }
    const r = await answerQuestionAction(id, sel)
    if ('denied' in r) return
    let video: Answered['video'] = null
    if (r.can_watch_video && r.video_ready) {
      const v = await loadExplanationVideoAction(id)
      if (!('denied' in v)) video = v
    }
    setAnswers((a) => ({ ...a, [id]: { selectedId: sel, result: r, video } }))
  }

  const blue = '#0e6cb0'
  return (
    <div className="overflow-hidden rounded-lg border border-[#0a5286] shadow-sm">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-3 text-white" style={{ background: 'linear-gradient(#1a78bf,#0e6cb0)' }}>
        <span className="text-lg font-semibold">{subtestName} Question Bank</span>
        <span className="text-sm tabular-nums">{i + 1} of {total}</span>
      </div>
      {/* sub bar */}
      <div className="flex items-center justify-between px-5 py-1.5 text-sm text-white" style={{ background: '#5486c4' }}>
        <div className="flex items-center gap-5">
          <button onClick={explain} className="underline-offset-2 hover:underline">Explain Answer</button>
          <button onClick={() => setCalcOpen((v) => !v)} className={calcOpen ? 'text-[#ffd21e] underline' : 'hover:underline'}>Calculator</button>
        </div>
        <button
          onClick={() => setFlags((f) => ({ ...f, [id]: !f[id] }))}
          className={flags[id] ? 'text-[#ffd21e]' : 'hover:underline'}
        >
          ⚑ Flag for Review
        </button>
      </div>

      {/* content */}
      <div className="min-h-[280px] bg-white p-6 text-[#1b1b1b]">
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
                  <button
                    key={o.id}
                    disabled={!!answered}
                    onClick={() => setPending((p) => ({ ...p, [id]: o.id }))}
                    className={`flex items-center gap-3 rounded border px-4 py-3 text-left text-sm transition-colors ${cls}`}
                  >
                    <span className="grid h-6 w-6 flex-none place-items-center rounded border border-gray-400 text-xs font-semibold">{o.label}</span>
                    <span>{o.body}</span>
                  </button>
                )
              })}
            </div>

            {hint ? <p className="mt-3 text-sm text-[#dc2626]">Select an answer, then choose “Explain Answer”.</p> : null}

            {answered ? (
              <div className="mt-6 space-y-4 border-t border-gray-200 pt-5">
                <p className={`text-sm font-semibold ${answered.result.is_correct ? 'text-[#157d72]' : 'text-[#dc2626]'}`}>
                  {answered.result.is_correct ? 'Correct' : 'Not quite'}
                </p>
                {answered.result.explanation_text ? (
                  <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed">
                    <p className="mb-1 font-semibold">Explanation</p>
                    {answered.result.explanation_text}
                  </div>
                ) : null}
                {answered.video ? (
                  <div className="overflow-hidden rounded border border-gray-200">
                    <MuxPlayer playbackId={answered.video.playbackId} tokens={{ playback: answered.video.token }} streamType="on-demand" accentColor="#157d72" />
                  </div>
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

      {/* bottom bar */}
      <div className="flex items-center justify-between text-sm text-white" style={{ background: 'linear-gradient(#0e6cb0,#0c5f9c)' }}>
        <button
          onClick={() => { if (confirm('End practice and return to the exam?')) router.push(`/exams/${examSlug}`) }}
          className="px-5 py-3 hover:bg-white/10"
        >
          ⤶ End
        </button>
        <div className="flex">
          <button disabled={i === 0} onClick={() => setI(i - 1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e] disabled:opacity-40">← Previous</button>
          <button onClick={() => setNavOpen(true)} className="border-l border-white/25 px-5 py-3">✧ Navigator</button>
          <button disabled={i >= total - 1} onClick={() => setI(i + 1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e] disabled:opacity-40">Next →</button>
        </div>
      </div>

      {calcOpen ? <TI108Calculator onClose={() => setCalcOpen(false)} /> : null}

      {navOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) setNavOpen(false) }}>
          <div className="max-h-[80vh] w-[min(520px,92vw)] overflow-auto rounded-lg bg-white">
            <div className="flex items-center justify-between px-5 py-3 font-semibold text-white" style={{ background: blue }}>
              Question Navigator <button onClick={() => setNavOpen(false)}>✕</button>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2 p-4">
              {questionIds.map((qid, idx) => (
                <button
                  key={qid}
                  onClick={() => { setI(idx); setNavOpen(false) }}
                  className={`relative h-11 rounded border text-sm ${answers[qid] ? 'border-[#7bb08a] bg-[#e2efe4]' : 'border-gray-300 bg-white'} ${idx === i ? 'outline outline-2 outline-[#0e6cb0]' : ''}`}
                >
                  {flags[qid] ? <span className="absolute right-1 top-0.5 text-[10px] text-[#c0392b]">⚑</span> : null}
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
