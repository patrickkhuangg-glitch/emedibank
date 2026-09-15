'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuestionViews } from '@/lib/practice/use-question-views'
import { TI108Calculator } from '@/components/ui/ti108-calculator'
import {
  fetchQuestionAction,
  answerQuestionAction,
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
  const { allViewed, unviewedCount } = useQuestionViews(questionIds, id, !!q)
  const answered = answers[id]

  useEffect(() => {
    if (!id || id in cache) return
    let active = true
    fetchQuestionAction(id).then((r) => {
      if (active) setCache((c) => ({ ...c, [id]: r.locked ? null : r.question }))
    })
    return () => { active = false }
  }, [id, cache])

  async function markAnswer() {
    if (answered || !allViewed) return
    const sel = pending[id]
    if (!sel) { setHint(true); setTimeout(() => setHint(false), 2000); return }
    const r = await answerQuestionAction(id, sel)
    if ('denied' in r) return
    setAnswers((a) => ({ ...a, [id]: { selectedId: sel, result: r, video: null } }))
  }

  const blue = '#0e6cb0'
  return (
    <div className="overflow-hidden rounded-lg border border-[#0a5286] shadow-sm" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-3 text-white" style={{ background: 'linear-gradient(#1a78bf,#0e6cb0)' }}>
        <span className="text-lg font-semibold">Studocyte {examSlug === 'ucat' ? '' : `${examSlug.toUpperCase()} `}{subtestName} Question Bank</span>
        <span className="text-sm tabular-nums">{i + 1} of {total}</span>
      </div>
      {/* sub bar */}
      <div className="flex items-center justify-between px-5 py-1.5 text-sm text-white" style={{ background: '#5486c4' }}>
        <div className="flex items-center gap-5">
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

            {!answered ? <button onClick={markAnswer} disabled={!allViewed} className="mt-5 rounded bg-[#0e6cb0] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">Mark answer</button> : null}
            {!allViewed ? <p className="mt-2 text-sm text-gray-600">View all questions before marking. {unviewedCount} still to view.</p> : null}
            {hint ? <p className="mt-3 text-sm text-[#dc2626]">Select an answer, then choose “Mark answer”.</p> : null}

            {answered ? (
              <div className="mt-6 space-y-4 border-t border-gray-200 pt-5">
                <p className={`text-sm font-semibold ${answered.result.is_correct ? 'text-[#157d72]' : 'text-[#dc2626]'}`}>
                  {answered.result.is_correct ? 'Correct' : 'Not quite'}
                </p>
                {answered.result.explanation_text ? (
                  <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed">
                    <p className="mb-1 font-semibold">Explanation</p>
                    <div className="whitespace-pre-line">{answered.result.explanation_text}</div>
                  </div>
                ) : null}

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
