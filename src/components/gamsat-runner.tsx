'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MuxPlayer from '@mux/mux-player-react'
import { ExamConfirm } from '@/components/exam-confirm'
import { haptic } from '@/lib/haptics'
import { fetchQuestionsAction, answerQuestionAction, loadExplanationVideoAction, revealAnswerAction } from '@/lib/questions/actions'
import { recordPracticeSessionAction } from '@/lib/practice/session-actions'

// Passage/stimulus practice interface — serves GAMSAT (Sections I & III) and ISAT
// (Critical Reasoning, Quantitative Reasoning): a Medify-style stimulus on the left,
// single-best question on the right, numbered unit tabs, bookmark, and a mark-at-end
// postscore review. Items are single-best-answer over a passage, figure or table —
// no Yes/No grids or most/least, so this runner is MCQ-only. The
// UCAT Pearson-VUE runner (session-runner.tsx) is untouched; grading/recording reuse
// the same server actions, so scoring stays identical.
type SafeQuestion = {
  id: string
  topic: string | null
  stem: string
  passage: string | null
  image: string | null
  images: string[]
  table: { headers: string[]; rows: string[][] } | null
  tables: { headers: string[]; rows: string[][] }[]
  statements: { index: number; text: string }[] | null
  mostLeast: { actions: { index: number; text: string }[] } | null
  options: { id: string; label: string; body: string }[]
}
type Result = { is_correct: boolean; score: number; correct_option_id: string | null; explanation_text: string | null; can_watch_video: boolean; has_video: boolean; video_ready: boolean }
type Video = { playbackId: string; token: string }
type Answered = { selectedId: string; result: Result; video: Video | null }

const TEAL = 'linear-gradient(#1BA7C6,#178faa)'
const NAVY = '#2B6CB0'
const INK = '#1a1d24'
const FONT = 'Arial, "Helvetica Neue", Helvetica, system-ui, sans-serif'

function mmss(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function GamsatRunner({
  label,
  examSlug,
  instructions,
  questionIds,
  timed,
  minutes,
  subtestId = null,
  tag = null,
  mode = 'sets',
}: {
  label: string
  examSlug: string
  instructions: string
  questionIds: string[]
  timed: boolean
  minutes: number
  subtestId?: string | null
  tag?: string | null
  mode?: string
}) {
  const router = useRouter()
  const total = questionIds.length
  const startedAtRef = useRef<number>(0)

  const [phase, setPhase] = useState<'intro' | 'running' | 'summary' | 'review'>('intro')
  const [loaded, setLoaded] = useState(false)
  const [grading, setGrading] = useState(false)
  const [i, setI] = useState(0)
  const [cache, setCache] = useState<Record<string, SafeQuestion | null>>({})
  const [pending, setPending] = useState<Record<string, string>>({})
  const [answers, setAnswers] = useState<Record<string, Answered>>({})
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set())
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [reviewList, setReviewList] = useState<number[]>([])
  const [reviewPos, setReviewPos] = useState(0)
  const [remaining, setRemaining] = useState(minutes * 60)
  const [confirmFinish, setConfirmFinish] = useState(false)

  const reviewing = phase === 'review'
  const activeIndex = reviewing ? (reviewList[reviewPos] ?? 0) : i
  const id = questionIds[activeIndex]
  const q = cache[id]
  const answered = answers[id]

  // "Unit" size = questions sharing the current passage (GAMSAT groups ~6 per stimulus).
  const unitCount = useMemo(() => {
    if (!q) return total
    const key = q.passage ?? q.images?.[0] ?? q.image ?? q.stem
    return questionIds.filter((qid) => {
      const c = cache[qid]
      return c && (c.passage ?? c.image ?? c.stem) === key
    }).length || total
  }, [q, cache, questionIds, total])

  useEffect(() => {
    if (phase !== 'running' || loaded) return
    let alive = true
    fetchQuestionsAction(questionIds).then((map) => {
      if (alive) { setCache(map as Record<string, SafeQuestion | null>); setLoaded(true) }
    })
    return () => { alive = false }
  }, [phase, loaded, questionIds])

  const go = useCallback((d: number) => setI((cur) => Math.min(total - 1, Math.max(0, cur + d))), [total])
  const reviewGo = (d: number) => setReviewPos((p) => Math.min(reviewList.length - 1, Math.max(0, p + d)))
  function startReview(list: number[], pos: number) {
    if (list.length === 0) return
    setReviewList(list); setReviewPos(pos); setPhase('review')
  }

  const submitAll = useCallback(async () => {
    setGrading(true)
    const nextA: Record<string, Answered> = {}
    await Promise.all(
      questionIds.map(async (qid) => {
        const sel = pending[qid]
        if (!sel) return
        const r = await answerQuestionAction(qid, sel)
        if (!('denied' in r)) nextA[qid] = { selectedId: sel, result: r as Result, video: null }
      }),
    )
    setAnswers((a) => ({ ...a, ...nextA }))
    setAnsweredIds(new Set(Object.keys(nextA)))
    setGrading(false)
    setPhase('summary')

    const results = Object.values(nextA).map((x) => x.result)
    if (results.length > 0) {
      const scoreSum = results.reduce((s, r) => s + (r.score ?? (r.is_correct ? 1 : 0)), 0)
      void recordPracticeSessionAction({
        examSlug, subtestId, tag, mode,
        total: results.length,
        correct: scoreSum,
        timeSpentSeconds: startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : null,
      })
    }
  }, [questionIds, pending, examSlug, subtestId, tag, mode])

  const submitRef = useRef(submitAll)
  useEffect(() => { submitRef.current = submitAll }, [submitAll])
  useEffect(() => {
    if (phase !== 'running' || !timed) return
    if (remaining <= 0) { submitRef.current(); return }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timed, remaining])

  // Reveal the solution for an unanswered item during review (no attempt recorded).
  useEffect(() => {
    if (!reviewing || answeredIds.has(id) || answers[id]) return
    let alive = true
    revealAnswerAction(id).then((r) => {
      if (!alive || 'denied' in r || r.kind !== 'mcq') return
      setAnswers((s) => ({ ...s, [id]: { selectedId: '', result: r.result as Result, video: null } }))
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewing, id, answeredIds])

  // Lazily fetch a paid, ready video during review.
  useEffect(() => {
    if (!reviewing) return
    const a = answers[id]
    if (!a?.result || a.video || !a.result.can_watch_video || !a.result.video_ready) return
    let alive = true
    loadExplanationVideoAction(id).then((v) => {
      if (!alive || 'denied' in v) return
      setAnswers((s) => ({ ...s, [id]: { ...s[id], video: v } }))
    })
    return () => { alive = false }
  }, [reviewing, id, answers])

  function begin() {
    haptic(15)
    startedAtRef.current = Date.now()
    setPhase('running')
  }
  const hasPending = (qid: string) => !!pending[qid]

  // ---------- INTRO ----------
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: FONT, color: INK }}>
        <div className="flex items-center gap-3 px-5 text-white" style={{ background: TEAL, height: 56 }}>
          <span className="text-[17px] font-bold">{label}</span>
        </div>
        <div className="flex-1 overflow-auto p-8"><div className="mx-auto max-w-3xl whitespace-pre-wrap text-[15px] leading-relaxed">{instructions}</div></div>
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <button onClick={() => router.push(`/practice/${examSlug}`)} className="rounded-md px-5 py-2.5 text-[15px] text-[#2B6CB0] hover:bg-gray-50">Exit</button>
          <button onClick={begin} className="inline-flex items-center gap-2 rounded-md px-7 py-2.5 text-[15px] font-bold text-white" style={{ background: '#2f9e44' }}>Begin</button>
        </div>
      </div>
    )
  }

  // ---------- SUMMARY (postscore) ----------
  if (phase === 'summary') {
    const resultOf = (qid: string) => answers[qid]?.result
    const statusOf = (qid: string): 'Correct' | 'Incorrect' | 'Unseen' => {
      if (!answeredIds.has(qid)) return 'Unseen'
      const r = resultOf(qid); if (!r) return 'Unseen'
      return r.score >= 1 ? 'Correct' : 'Incorrect'
    }
    const allIdx = questionIds.map((_, idx) => idx)
    const incorrectIdx = allIdx.filter((idx) => statusOf(questionIds[idx]) !== 'Correct')
    const flaggedIdx = allIdx.filter((idx) => flags[questionIds[idx]])
    const answeredCount = questionIds.filter((qid) => answeredIds.has(qid)).length
    const markSum = questionIds.reduce((s, qid) => s + (answeredIds.has(qid) ? (resultOf(qid)?.score ?? 0) : 0), 0)

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: FONT, color: INK }}>
        <div className="flex items-center gap-3 px-5 text-white" style={{ background: TEAL, height: 56 }}>
          <span className="text-[17px] font-bold">{label} — Results</span>
        </div>
        <div className="border-b border-gray-200 px-6 py-4 text-center">
          <p className="text-[15px] text-gray-600">Review your answers and open any question to see the worked solution.</p>
          {answeredCount > 0 ? (
            <p className="mt-1 text-[17px] font-bold" style={{ color: '#1b2a46' }}>
              Score: {Number.isInteger(markSum) ? markSum : markSum.toFixed(1)} / {answeredCount} · {Math.round((markSum / answeredCount) * 100)}%
            </p>
          ) : null}
        </div>
        <div className="flex-1 overflow-auto">
          {questionIds.map((qid, idx) => {
            const s = statusOf(qid)
            return (
              <button key={qid} onClick={() => startReview(allIdx, idx)} className="flex w-full items-center gap-3 border-b border-gray-100 px-6 py-3 text-left text-[15px] hover:bg-[#f4fbfd]">
                <span className="w-24 text-[#2B6CB0]">Question {idx + 1}</span>
                {flags[qid] ? <span className="text-[#c0392b]" title="Bookmarked">⚑</span> : null}
                <span className="flex-1" />
                <span className={`w-24 text-right font-medium ${s === 'Correct' ? 'text-[#2f9e44]' : s === 'Unseen' ? 'text-gray-400' : 'text-[#c0392b]'}`}>{s}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 text-[15px]">
          <button onClick={() => router.push(`/practice/${examSlug}`)} className="rounded-md px-5 py-2.5 text-[#2B6CB0] hover:bg-gray-50">Finish review</button>
          <div className="flex gap-2">
            <button onClick={() => startReview(allIdx, 0)} className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50">Review all</button>
            <button disabled={incorrectIdx.length === 0} onClick={() => startReview(incorrectIdx, 0)} className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-40">Review incorrect</button>
            <button disabled={flaggedIdx.length === 0} onClick={() => startReview(flaggedIdx, 0)} className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-40">Review bookmarked</button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- RUNNING / REVIEW ----------
  const selectedId = answered ? answered.selectedId : pending[id]
  const bookmarked = !!flags[id]

  const Stimulus = q ? (
    <div className="max-w-[660px] text-[15px] leading-[1.62]" style={{ color: INK }}>
      <p className="mb-4 font-bold">There are {unitCount} question{unitCount === 1 ? '' : 's'} in this unit.</p>
      {q.passage ? <div className="whitespace-pre-wrap [&>*]:mb-[15px] [text-align:justify]">{q.passage.split(/\n{2,}/).map((para, k) => <p key={k}>{para}</p>)}</div> : null}
      {(q.images ?? []).map((src, imageIndex) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={imageIndex} src={src} alt={`Stimulus figure ${imageIndex + 1}`} className="my-3 max-w-full rounded border border-gray-200" />
      ))}
      {(q.tables ?? []).map((t, ti) => (
        <div key={ti} className="my-3 overflow-x-auto">
          <table className="border-collapse text-[13.5px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead><tr>{t.headers.map((h, k) => <th key={k} className="border border-gray-300 bg-gray-50 px-3 py-1.5 font-bold">{h}</th>)}</tr></thead>
            <tbody>{t.rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-gray-300 px-3 py-1.5 text-center">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}
    </div>
  ) : null

  const correctId = answered?.result.correct_option_id ?? null
  const Question = q ? (
    <div className="relative">
      <button
        onClick={() => { if (!reviewing) { haptic(8); setFlags((f) => ({ ...f, [id]: !f[id] })) } }}
        aria-pressed={bookmarked} aria-label="Bookmark this question"
        className="absolute -top-1.5 right-0 grid h-10 w-9 place-items-center"
        style={{ color: bookmarked ? '#5a3fd6' : '#6b4ee6' }}
      >
        <svg width="26" height="30" viewBox="0 0 26 30" fill={bookmarked ? '#6b4ee6' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 3h18v24l-9-6-9 6z" />{bookmarked ? null : <path d="M13 9v8M9 13h8" />}</svg>
      </button>
      <div className="rounded border border-gray-200 p-6">
        <p className="border-b border-gray-100 pb-4 text-[16px] leading-[1.5]">{q.stem}</p>
        <div className="flex flex-col">
          {q.options.map((o) => {
            const sel = selectedId === o.id
            const isCorrect = reviewing && correctId === o.id
            const isWrong = reviewing && sel && correctId !== o.id
            return (
              <button
                key={o.id} disabled={reviewing} role="radio" aria-checked={sel}
                onClick={() => { haptic(8); setPending((p) => ({ ...p, [id]: o.id })) }}
                className="flex w-full items-center gap-4 border-b border-gray-100 py-[17px] text-left text-[15px] last:border-b-0 disabled:cursor-default"
                style={{ background: isCorrect ? '#eefaf0' : isWrong ? '#fdecec' : undefined }}
              >
                <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full border-2"
                  style={{ borderColor: isCorrect ? '#2f9e44' : isWrong ? '#dc2626' : sel ? NAVY : '#b6bcc6' }}>
                  {sel || isCorrect ? <span className="h-[11px] w-[11px] rounded-full" style={{ background: isCorrect ? '#2f9e44' : isWrong ? '#dc2626' : NAVY }} /> : null}
                </span>
                <span style={{ color: isCorrect ? '#1f7a34' : isWrong ? '#b02525' : INK }}>{o.body}</span>
              </button>
            )
          })}
        </div>
        {reviewing && answered ? (
          <div className="mt-5 border-t border-gray-200 pt-4">
            <p className="text-[13.5px] font-bold" style={{ color: !answeredIds.has(id) ? '#6b7280' : answered.result.score >= 1 ? '#2f9e44' : '#dc2626' }}>
              {!answeredIds.has(id) ? 'Not answered' : answered.result.score >= 1 ? 'Correct' : 'Incorrect'}
            </p>
            {answered.result.explanation_text ? (
              <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-4 text-[14px] leading-relaxed"><p className="mb-1 font-bold">Worked solution</p>{answered.result.explanation_text}</div>
            ) : null}
            {answered.video ? (
              <div className="mt-3 overflow-hidden rounded border border-gray-200"><MuxPlayer playbackId={answered.video.playbackId} tokens={{ playback: answered.video.token }} streamType="on-demand" accentColor="#1BA7C6" /></div>
            ) : !answered.result.has_video ? null : answered.result.can_watch_video ? (answered.result.video_ready ? null : <p className="mt-2 text-[13px] text-gray-500">Video explanation is processing.</p>) : (
              <div className="mt-3 rounded border-2 border-[#1BA7C6] bg-[#eaf7fb] p-4 text-center">
                <p className="font-bold" style={{ color: '#1b2a46' }}>Video explanation</p>
                <p className="mt-1 text-[13px] text-gray-600">Watch this worked through on video with a subscription.</p>
                <Link href="/pricing" className="mt-2 inline-block rounded-md px-4 py-2 text-[13px] font-medium text-white" style={{ background: '#1BA7C6' }}>See plans</Link>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  ) : null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: FONT, color: INK }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 text-white" style={{ background: TEAL, height: 56 }}>
        {!reviewing ? (
          <button onClick={() => setConfirmFinish(true)} aria-label="End session" className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[5px]" style={{ background: 'rgba(0,0,0,.12)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        ) : null}
        <span className="text-[17px] font-bold" style={{ letterSpacing: '-.01em' }}>{reviewing ? `${label} — Review` : label}</span>
        <div className="ml-auto flex items-center gap-5 text-[15px]">
          {timed && !reviewing ? <span className="tabular-nums" style={{ color: remaining < 60 ? '#ffe08a' : '#fff' }}>{mmss(remaining)}</span> : null}
          <span className="tabular-nums">{activeIndex + 1} of {total}</span>
        </div>
      </div>

      {/* tab strip */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3" style={{ background: '#f1f3f5' }}>
        {questionIds.map((qid, idx) => {
          const active = idx === activeIndex
          return (
            <button key={qid} onClick={() => { if (reviewing) setReviewPos(Math.max(0, reviewList.indexOf(idx))); else setI(idx) }}
              aria-current={active}
              className="grid h-11 min-w-[46px] place-items-center rounded-md border-[1.5px] px-3 text-[15px] font-bold"
              style={{ borderColor: NAVY, background: active ? NAVY : '#fff', color: active ? '#fff' : NAVY }}>
              {idx + 1}
            </button>
          )
        })}
        <button onClick={() => { if (!reviewing) setConfirmFinish(true) }} className="grid h-11 min-w-[64px] place-items-center rounded-md border-[1.5px] px-3 text-[15px] font-semibold" style={{ borderColor: NAVY, background: '#fff', color: NAVY }}>End</button>
      </div>

      {/* body */}
      <div className="grid flex-1 items-start gap-7 overflow-auto px-8 py-6 md:grid-cols-[minmax(0,1.32fr)_minmax(0,1fr)]" style={{ paddingBottom: 92 }}>
        {!loaded && q === undefined ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 py-24"><span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#1BA7C6]/25 border-t-[#1BA7C6]" /><p className="text-sm text-gray-500">Loading questions…</p></div>
        ) : q === null ? (
          <p className="col-span-full text-gray-500">This question isn&rsquo;t available.</p>
        ) : (
          <>{Stimulus}{Question}</>
        )}
      </div>

      {/* footer */}
      <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
        <button onClick={() => (reviewing ? setPhase('summary') : setConfirmFinish(true))} className="rounded-md px-4 py-2.5 text-[15px] text-[#2B6CB0] hover:bg-gray-50">{reviewing ? '← Back to results' : 'End session'}</button>
        <div className="flex items-center gap-3">
          {!reviewing ? (
            <button onClick={() => setFlags((f) => ({ ...f, [id]: !f[id] }))} aria-pressed={bookmarked}
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[15px] font-bold text-white" style={{ background: bookmarked ? '#5a3fd6' : '#6b4ee6' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
              Bookmark
            </button>
          ) : null}
          {(reviewing ? reviewPos > 0 : activeIndex > 0) ? (
            <button onClick={() => (reviewing ? reviewGo(-1) : go(-1))} className="rounded-md border border-gray-300 px-5 py-2.5 text-[15px] font-medium hover:bg-gray-50">Previous</button>
          ) : null}
          {reviewing ? (
            reviewPos < reviewList.length - 1 ? <button onClick={() => reviewGo(1)} className="rounded-md px-6 py-2.5 text-[15px] font-bold text-white" style={{ background: '#2f9e44' }}>Next</button> : <button onClick={() => setPhase('summary')} className="rounded-md px-6 py-2.5 text-[15px] font-bold text-white" style={{ background: '#2f9e44' }}>Done</button>
          ) : activeIndex >= total - 1 ? (
            <button onClick={() => setConfirmFinish(true)} className="rounded-md px-6 py-2.5 text-[15px] font-bold text-white" style={{ background: '#2f9e44' }}>Finish</button>
          ) : (
            <button onClick={() => go(1)} className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-[15px] font-bold text-white" style={{ background: '#2f9e44' }}>Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M12 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </div>

      {confirmFinish && !reviewing ? (
        <ExamConfirm
          title="Finish and submit?"
          message={(() => {
            const un = questionIds.filter((qid) => !hasPending(qid)).length
            return un > 0
              ? `You have ${un} unanswered question${un === 1 ? '' : 's'}. Once you finish, your answers are marked and you can review the worked solutions.`
              : 'Once you finish, your answers are marked and you can review the worked solutions.'
          })()}
          confirmLabel="Yes, finish"
          cancelLabel="No, keep going"
          onConfirm={() => { setConfirmFinish(false); submitAll() }}
          onCancel={() => setConfirmFinish(false)}
        />
      ) : null}

      {grading ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 text-white">
          <div className="flex items-center gap-3 rounded-lg px-6 py-4" style={{ background: '#178faa' }}>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Marking your answers…
          </div>
        </div>
      ) : null}
    </div>
  )
}
