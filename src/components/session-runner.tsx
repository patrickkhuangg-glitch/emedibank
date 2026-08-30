'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import Link from 'next/link'
import { TI108Calculator } from '@/components/ui/ti108-calculator'
import { ExamConfirm } from '@/components/exam-confirm'
import { haptic } from '@/lib/haptics'
import { fetchQuestionsAction, answerQuestionAction, loadExplanationVideoAction, submitGridAction, submitMostLeastAction, revealAnswerAction } from '@/lib/questions/actions'

type YesNo = 'Yes' | 'No'
type SafeQuestion = {
  id: string
  topic: string | null
  stem: string
  passage: string | null
  image: string | null
  table: { headers: string[]; rows: string[][] } | null
  statements: { index: number; text: string }[] | null
  mostLeast: { actions: { index: number; text: string }[] } | null
  options: { id: string; label: string; body: string }[]
}
type Result = { is_correct: boolean; correct_option_id: string | null; explanation_text: string | null; can_watch_video: boolean; has_video: boolean; video_ready: boolean }
type GridResult = { is_correct: boolean; per_statement: { index: number; correct: boolean; correct_answer: YesNo }[]; explanation_text: string | null; can_watch_video: boolean; has_video: boolean; video_ready: boolean }
type Video = { playbackId: string; token: string }
type Answered = { selectedId: string; result: Result; video: Video | null }
type GridAnswered = { result: GridResult; video: Video | null }
type MostLeastResult = { is_correct: boolean; correct_most: number; correct_least: number; most_correct: boolean; least_correct: boolean; explanation_text: string | null; can_watch_video: boolean; has_video: boolean; video_ready: boolean }
type MLAnswered = { result: MostLeastResult; video: Video | null }

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

  const [phase, setPhase] = useState<'intro' | 'running' | 'summary' | 'review'>('intro')
  const [readyModal, setReadyModal] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [grading, setGrading] = useState(false)
  const [i, setI] = useState(0)
  const [reviewList, setReviewList] = useState<number[]>([])
  const [reviewPos, setReviewPos] = useState(0)
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set())
  const [cache, setCache] = useState<Record<string, SafeQuestion | null>>({})
  const [pending, setPending] = useState<Record<string, string>>({})
  const [answers, setAnswers] = useState<Record<string, Answered>>({})
  const [gridPending, setGridPending] = useState<Record<string, Record<number, YesNo>>>({})
  const [gridAnswers, setGridAnswers] = useState<Record<string, GridAnswered>>({})
  const [mlPending, setMlPending] = useState<Record<string, { most?: number; least?: number }>>({})
  const [mlAnswers, setMlAnswers] = useState<Record<string, MLAnswered>>({})
  const [mlSelected, setMlSelected] = useState<number | null>(null)
  const [prevIdx, setPrevIdx] = useState(0)
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [calcOpen, setCalcOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [remaining, setRemaining] = useState(minutes * 60)
  const [warn, setWarn] = useState(false)

  const reviewing = phase === 'review'
  const activeIndex = reviewing ? (reviewList[reviewPos] ?? 0) : i
  const id = questionIds[activeIndex]
  const q = cache[id]
  const isGrid = !!q?.statements
  const isML = !!q?.mostLeast
  const answered = answers[id]
  const gridAnswered = gridAnswers[id]
  const mlAnswered = mlAnswers[id]

  // Clear a half-made Most/Least selection when the question changes (render-time
  // reset — no effect needed).
  if (prevIdx !== activeIndex) { setPrevIdx(activeIndex); setMlSelected(null) }

  // Load the whole session in one round-trip once running begins, so moving
  // between questions is instant (no per-Next server call).
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

  // Grade every answered question at the end, then show the results screen.
  const submitAll = useCallback(async () => {
    setGrading(true)
    const nextA: Record<string, Answered> = {}
    const nextG: Record<string, GridAnswered> = {}
    const nextM: Record<string, MLAnswered> = {}
    await Promise.all(
      questionIds.map(async (qid) => {
        const cur = cache[qid]
        if (!cur) return
        if (cur.statements) {
          const ans = gridPending[qid] ?? {}
          if (Object.keys(ans).length === 0) return
          const asStr: Record<string, YesNo> = {}
          for (const k of Object.keys(ans)) asStr[k] = ans[Number(k)]
          const r = await submitGridAction(qid, asStr)
          if (!('denied' in r)) nextG[qid] = { result: r, video: null }
        } else if (cur.mostLeast) {
          const ch = mlPending[qid]
          if (ch?.most == null || ch?.least == null) return
          const r = await submitMostLeastAction(qid, { most: ch.most, least: ch.least })
          if (!('denied' in r)) nextM[qid] = { result: r, video: null }
        } else {
          const sel = pending[qid]
          if (!sel) return
          const r = await answerQuestionAction(qid, sel)
          if (!('denied' in r)) nextA[qid] = { selectedId: sel, result: r, video: null }
        }
      }),
    )
    setAnswers((a) => ({ ...a, ...nextA }))
    setGridAnswers((a) => ({ ...a, ...nextG }))
    setMlAnswers((a) => ({ ...a, ...nextM }))
    setAnsweredIds(new Set([...Object.keys(nextA), ...Object.keys(nextG), ...Object.keys(nextM)]))
    setGrading(false)
    setPhase('summary')
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }, [questionIds, cache, gridPending, mlPending, pending])

  // Timer + a ref so its expiry always calls the latest submitAll.
  const submitRef = useRef(submitAll)
  useEffect(() => { submitRef.current = submitAll }, [submitAll])
  useEffect(() => {
    if (phase !== 'running' || !timed) return
    if (remaining <= 0) { submitRef.current(); return }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timed, remaining])

  useEffect(() => {
    if (phase !== 'running') return
    const onVis = () => { if (document.hidden) setWarn(true) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [phase])

  useEffect(() => {
    if (phase !== 'running') return
    const h = (e: KeyboardEvent) => {
      if (e.altKey) {
        const k = e.key.toLowerCase()
        if (k === 'n') { e.preventDefault(); go(1) }
        else if (k === 'p') { e.preventDefault(); go(-1) }
        else if (k === 'f') { e.preventDefault(); setFlags((f) => ({ ...f, [id]: !f[id] })) }
        else if (k === 'c') { e.preventDefault(); setCalcOpen((v) => !v) }
        else if (['s', 'v', 'a', 'i'].includes(k)) { e.preventDefault(); setNavOpen(true) }
        return
      }
      const cur = cache[id]
      if (!calcOpen && cur && !cur.statements && !cur.mostLeast) {
        const idx = ['a', 'b', 'c', 'd', 'e'].indexOf(e.key.toLowerCase())
        const opt = cur.options[idx]
        if (opt) setPending((p) => ({ ...p, [id]: opt.id }))
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, id, calcOpen, cache, go])

  // In review, reveal the solution for a question the student left unanswered
  // (no attempt recorded — this is a read-only "see the answer" call).
  useEffect(() => {
    if (!reviewing || answeredIds.has(id) || answers[id] || gridAnswers[id] || mlAnswers[id]) return
    let alive = true
    revealAnswerAction(id).then((r) => {
      if (!alive || 'denied' in r) return
      if (r.kind === 'grid') setGridAnswers((s) => ({ ...s, [id]: { result: r.result, video: null } }))
      else if (r.kind === 'most_least') setMlAnswers((s) => ({ ...s, [id]: { result: r.result, video: null } }))
      else setAnswers((s) => ({ ...s, [id]: { selectedId: '', result: r.result, video: null } }))
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewing, id, answeredIds])

  // In review, lazily fetch the signed video for a paid, ready explanation.
  useEffect(() => {
    if (!reviewing) return
    const a = answers[id]; const g = gridAnswers[id]; const m = mlAnswers[id]
    const res = a?.result ?? g?.result ?? m?.result
    const hasVideo = a?.video ?? g?.video ?? m?.video
    if (!res || hasVideo || !res.can_watch_video || !res.video_ready) return
    let alive = true
    loadExplanationVideoAction(id).then((v) => {
      if (!alive || 'denied' in v) return
      if (a) setAnswers((s) => ({ ...s, [id]: { ...s[id], video: v } }))
      else if (g) setGridAnswers((s) => ({ ...s, [id]: { ...s[id], video: v } }))
      else if (m) setMlAnswers((s) => ({ ...s, [id]: { ...s[id], video: v } }))
    })
    return () => { alive = false }
  }, [reviewing, id, answers, gridAnswers, mlAnswers])

  function begin() {
    haptic(15)
    rootRef.current?.requestFullscreen?.().catch(() => {})
    setReadyModal(false)
    setPhase('running')
  }
  function hasPending(qid: string) {
    const g = gridPending[qid]; const m = mlPending[qid]
    return !!pending[qid] || (!!g && Object.keys(g).length > 0) || (!!m && m.most != null && m.least != null)
  }
  // ---------- INTRO ----------
  if (phase === 'intro') {
    return (
      <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: ARIAL }}>
        <div className="px-5 py-3 text-white" style={{ background: BAR }}><span className="text-lg font-semibold">{label}</span></div>
        <div className="h-3" style={{ background: SUBBAR }} />
        <div className="flex-1 overflow-auto p-8 text-[#1b1b1b]"><div className="mx-auto max-w-4xl whitespace-pre-wrap text-[15px] leading-relaxed">{instructions}</div></div>
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
                <button onClick={begin} className="min-w-[72px] rounded border border-white/70 px-4 py-1.5 hover:bg-white/10">Yes</button>
                <button onClick={() => setReadyModal(false)} className="min-w-[72px] rounded border border-white/70 px-4 py-1.5 hover:bg-white/10">No</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  // ---------- SUMMARY (post-score review list) ----------
  if (phase === 'summary') {
    const statusOf = (qid: string): 'Correct' | 'Incorrect' | 'Unseen' => {
      if (!answeredIds.has(qid)) return 'Unseen'
      const res = answers[qid]?.result ?? gridAnswers[qid]?.result ?? mlAnswers[qid]?.result
      return res?.is_correct ? 'Correct' : 'Incorrect'
    }
    const allIdx = questionIds.map((_, idx) => idx)
    const incorrectIdx = allIdx.filter((idx) => statusOf(questionIds[idx]) !== 'Correct')
    const flaggedIdx = allIdx.filter((idx) => flags[questionIds[idx]])
    const incorrectCount = incorrectIdx.length

    return (
      <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: ARIAL }}>
        <div className="px-5 py-3 text-white" style={{ background: BAR }}><span className="text-lg font-semibold">{label} Question Bank</span></div>
        <div className="flex items-center gap-2 px-5 py-1.5 text-sm text-white" style={{ background: SUBBAR }}><span aria-hidden>🗎</span> Instructions</div>
        <p className="py-3 text-center text-[15px] text-[#1b1b1b]">Review Postscore: see which items are incorrect and return to them to see the solution</p>
        <div className="flex items-center justify-between px-5 py-2 font-semibold text-white" style={{ background: '#2f74b8' }}>
          <span>Question Bank Section 1</span>
          <span>( {total} Questions , {incorrectCount} Incorrect )</span>
        </div>
        <div className="flex-1 overflow-auto">
          {questionIds.map((qid, idx) => {
            const s = statusOf(qid)
            return (
              <button key={qid} onClick={() => startReview(allIdx, idx)} className="flex w-full items-center gap-3 border-b border-gray-200 px-5 py-2.5 text-left text-[15px] text-[#1268ad] hover:bg-[#f4f8fc]">
                <PencilIcon />
                <span className="flex-1">Question {idx + 1}</span>
                {flags[qid] ? <span className="text-[#c0392b]" title="Flagged">⚑</span> : null}
                <span className={`w-28 text-right font-medium ${s === 'Correct' ? 'text-[#157d72]' : 'text-[#c0392b]'}`}>{s}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between text-sm text-white" style={{ background: BAR }}>
          <button onClick={() => router.push(`/practice/${examSlug}`)} className="px-5 py-3 hover:bg-white/10">⤶ End Review</button>
          <div className="flex">
            <button onClick={() => startReview(allIdx, 0)} className="flex items-center gap-1.5 border-l border-white/25 px-5 py-3 hover:bg-white/10"><span aria-hidden>✎</span>Review All</button>
            <button disabled={incorrectIdx.length === 0} onClick={() => startReview(incorrectIdx, 0)} className="flex items-center gap-1.5 border-l border-white/25 px-5 py-3 hover:bg-white/10 disabled:opacity-40"><span aria-hidden>✕</span>Review Incorrect</button>
            <button disabled={flaggedIdx.length === 0} onClick={() => startReview(flaggedIdx, 0)} className="flex items-center gap-1.5 border-l border-white/25 px-5 py-3 hover:bg-white/10 disabled:opacity-40"><span aria-hidden>⚑</span>Review Flagged</button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- RUNNING / REVIEW ----------
  const setGrid = (idx: number, v: YesNo) => { haptic(8); setGridPending((p) => ({ ...p, [id]: { ...(p[id] ?? {}), [idx]: v } })) }
  const cycleGrid = (idx: number) => { haptic(8); setGridPending((p) => {
    const cur = p[id]?.[idx]
    const next = cur === 'Yes' ? 'No' : cur === 'No' ? undefined : 'Yes'
    const row = { ...(p[id] ?? {}) }
    if (next) row[idx] = next; else delete row[idx]
    return { ...p, [id]: row }
  }) }

  const Explanation = (result: Result | GridResult | MostLeastResult | undefined, video: Video | null | undefined, wasAnswered: boolean) => result ? (
    <div className="mt-6 space-y-4 border-t border-gray-200 pt-5">
      <p className={`text-sm font-semibold ${!wasAnswered ? 'text-[#6b7280]' : result.is_correct ? 'text-[#157d72]' : 'text-[#dc2626]'}`}>{!wasAnswered ? 'Not answered' : result.is_correct ? 'Correct' : 'Not quite'}</p>
      {result.explanation_text ? <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed"><p className="mb-1 font-semibold">Answer rationale</p>{result.explanation_text}</div> : null}
      {video ? (
        <div className="overflow-hidden rounded border border-gray-200"><MuxPlayer playbackId={video.playbackId} tokens={{ playback: video.token }} streamType="on-demand" accentColor="#157d72" /></div>
      ) : !result.has_video ? null : result.can_watch_video ? (result.video_ready ? null : <p className="text-sm text-gray-500">Video explanation is processing.</p>) : (
        <div className="rounded border-2 border-[#157d72] bg-[#e2efec] p-5 text-center">
          <p className="font-semibold text-[#1b2a46]">Video explanation</p>
          <p className="mt-1 text-sm text-gray-600">Watch this worked through on video with a subscription.</p>
          <Link href="/pricing" className="mt-3 inline-block rounded-md bg-[#157d72] px-4 py-2 text-sm font-medium text-white">See plans</Link>
        </div>
      )}
    </div>
  ) : null

  const Table = q?.table ? (
    <div className="my-4 inline-block overflow-x-auto">
      <table className="border-collapse text-sm">
        <thead><tr>{q.table.headers.map((h, k) => <th key={k} className="border border-gray-400 px-4 py-1.5 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{q.table.rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-gray-400 px-4 py-1.5 text-center">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  ) : null

  const selectedId = answered ? answered.selectedId : pending[id]
  const Options = q ? (
    <div className="flex flex-col">
      {q.options.map((o) => {
        const sel = selectedId === o.id
        const correct = answered && answered.result.correct_option_id === o.id
        const wrong = answered && sel && !answered.result.is_correct
        return (
          <button key={o.id} disabled={!!answered} onClick={() => { haptic(8); setPending((p) => ({ ...p, [id]: o.id })) }} className="flex items-start gap-3 py-2.5 text-left text-[15px]">
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

  const Grid = q?.statements ? (
    <div className="mt-2">
      <p className="mb-4 text-[15px]">Place ‘Yes’ if the conclusion does follow. Place ‘No’ if the conclusion does not follow.</p>
      <div className="flex items-start gap-6">
        <div className="flex flex-1 flex-col gap-3">
          {q.statements.map((s) => {
            const chosen = gridAnswered ? undefined : gridPending[id]?.[s.index]
            const per = gridAnswered?.result.per_statement.find((p) => p.index === s.index)
            const shown = gridAnswered ? (gridPending[id]?.[s.index] ?? '-') : (chosen ?? '')
            let boxCls = 'border-gray-400 bg-[#b3aca7] text-white'
            if (gridAnswered && per) boxCls = per.correct ? 'border-[#157d72] bg-[#e2efec] text-[#157d72]' : 'border-[#dc2626] bg-[#fdecec] text-[#dc2626]'
            else if (chosen) boxCls = 'border-[#1268ad] bg-[#eef5fb] text-[#1268ad]'
            return (
              <div key={s.index} className="flex items-stretch gap-3">
                <div className="flex flex-1 items-center border-2 border-black px-4 py-3 text-center text-[15px]">{s.text}</div>
                <div
                  onClick={() => { if (!gridAnswered) cycleGrid(s.index) }}
                  onDragOver={(e) => { if (!gridAnswered) e.preventDefault() }}
                  onDrop={(e) => { if (!gridAnswered) { const v = e.dataTransfer.getData('text/plain') as YesNo; if (v === 'Yes' || v === 'No') setGrid(s.index, v) } }}
                  className={`grid w-24 flex-none cursor-pointer place-items-center border-2 font-semibold ${boxCls}`}
                >
                  {shown}
                  {gridAnswered && per && !per.correct ? <span className="ml-1 text-[10px] font-normal">(→ {per.correct_answer})</span> : null}
                </div>
              </div>
            )
          })}
        </div>
        {!gridAnswered ? (
          <div className="flex flex-col gap-3 bg-gray-200 p-3">
            {(['Yes', 'No'] as YesNo[]).map((v) => (
              <div key={v} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', v)} className="grid h-16 w-20 cursor-grab place-items-center border-2 border-black bg-white text-[15px] active:cursor-grabbing">{v}</div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  ) : null

  const setML = (slot: 'most' | 'least', idx: number) => { haptic(8); setMlPending((p) => {
    const cur: { most?: number; least?: number } = { ...(p[id] ?? {}) }
    cur[slot] = idx
    if (slot === 'most' && cur.least === idx) delete cur.least
    if (slot === 'least' && cur.most === idx) delete cur.most
    return { ...p, [id]: cur }
  }) }
  const clearML = (slot: 'most' | 'least') => setMlPending((p) => { const cur = { ...(p[id] ?? {}) }; delete cur[slot]; return { ...p, [id]: cur } })

  const Img = q?.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={q.image} alt="Question diagram" className="my-4 max-w-full border border-gray-200" />
  ) : null

  const ML = q?.mostLeast ? (
    <div className="mt-6">
      <div className="flex flex-col gap-3">
        {(['most', 'least'] as const).map((slot) => {
          const label2 = slot === 'most' ? 'Most Appropriate' : 'Least Appropriate'
          const idx = mlPending[id]?.[slot]
          const action = idx != null ? q.mostLeast!.actions.find((a) => a.index === idx) : undefined
          const ok = mlAnswered ? (slot === 'most' ? mlAnswered.result.most_correct : mlAnswered.result.least_correct) : null
          let boxCls = 'border-gray-400 bg-[#b3aca7] text-white'
          if (mlAnswered && ok != null) boxCls = ok ? 'border-[#157d72] bg-[#e2efec] text-[#157d72]' : 'border-[#dc2626] bg-[#fdecec] text-[#dc2626]'
          else if (action) boxCls = 'border-[#1268ad] bg-[#eef5fb] text-[#1268ad]'
          return (
            <div key={slot} className="flex items-stretch gap-3">
              <div className="grid w-40 flex-none place-items-center border-2 border-black px-2 py-3 text-center text-[15px]">{label2}</div>
              <div
                onClick={() => { if (!mlAnswered) { if (mlSelected != null) { setML(slot, mlSelected); setMlSelected(null) } else if (action) clearML(slot) } }}
                onDragOver={(e) => { if (!mlAnswered) e.preventDefault() }}
                onDrop={(e) => { if (!mlAnswered) { const v = Number(e.dataTransfer.getData('text/plain')); if (!Number.isNaN(v)) setML(slot, v) } }}
                className={`flex min-h-[64px] flex-1 cursor-pointer items-center justify-center border-2 px-4 text-center text-[15px] ${boxCls}`}
              >{action ? action.text : ''}</div>
            </div>
          )
        })}
      </div>
      {!mlAnswered ? (
        <div className="mt-6 flex flex-col gap-3 bg-gray-200 p-3">
          {q.mostLeast.actions.map((a) => {
            const used = mlPending[id]?.most === a.index || mlPending[id]?.least === a.index
            return (
              <div key={a.index} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(a.index))} onClick={() => setMlSelected(mlSelected === a.index ? null : a.index)}
                className={`cursor-grab border-2 px-4 py-3 text-center text-[15px] active:cursor-grabbing ${mlSelected === a.index ? 'border-[#1268ad] bg-[#eef5fb]' : 'border-black bg-white'} ${used ? 'opacity-50' : ''}`}>{a.text}</div>
            )
          })}
          <p className="text-xs text-gray-500">Drag an action into a box, or tap an action then tap a box.</p>
        </div>
      ) : null}
    </div>
  ) : null

  const Content = (
    <div className="flex-1 overflow-auto p-6 text-[#1b1b1b]">
      {!loaded && q === undefined ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#1268ad]/25 border-t-[#1268ad]" />
          <p className="text-sm text-gray-500">Loading questions…</p>
        </div>
      ) : q === undefined ? (
        <div className="flex items-center justify-center py-24"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#1268ad]/25 border-t-[#1268ad]" /></div>
      ) : q === null ? (
        <p className="text-gray-500">This question isn&rsquo;t available.</p>
      ) : isGrid ? (
        <div className="mx-auto max-w-6xl">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>
          {Img}{Table}{Grid}
          {Explanation(gridAnswered?.result, gridAnswered?.video, answeredIds.has(id))}
        </div>
      ) : isML ? (
        <div className="mx-auto max-w-4xl">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>
          {Img}{ML}
          {Explanation(mlAnswered?.result, mlAnswered?.video, answeredIds.has(id))}
        </div>
      ) : q.passage ? (
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:divide-x md:divide-gray-300">
          <div className="md:pr-8"><p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.passage}</p>{Img}</div>
          <div className="md:pl-8">
            <p className="text-[15px] leading-relaxed">{q.stem}</p>
            <div className="mt-6">{Options}</div>
            {Explanation(answered?.result, answered?.video, answeredIds.has(id))}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl">
          {q.topic ? <p className="text-xs font-semibold uppercase tracking-wide text-[#1268ad]">{q.topic}</p> : null}
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>
          {Img}{Table}
          <div className="mt-5">{Options}</div>
          {Explanation(answered?.result, answered?.video, answeredIds.has(id))}
        </div>
      )}
    </div>
  )

  return (
    <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: ARIAL }}>
      {warn && !reviewing ? (
        <div className="flex items-center justify-between bg-[#dc2626] px-5 py-2 text-sm text-white">
          <span>You left the test window. In the real exam this isn&rsquo;t allowed.</span>
          <button onClick={() => setWarn(false)} className="underline">Dismiss</button>
        </div>
      ) : null}

      <div className="flex items-center justify-between px-5 py-2.5 text-white" style={{ background: BAR }}>
        <span className="text-lg font-semibold">{reviewing ? `${label} · Review` : label}</span>
        <div className="flex items-center gap-5">
          {timed && !reviewing ? <span className={`text-sm tabular-nums ${remaining < 60 ? 'text-[#ffd21e]' : ''}`}>{mmss(remaining)}</span> : null}
          <span className="flex items-center gap-2 text-sm tabular-nums"><CounterIcon />{activeIndex + 1} of {total}</span>
        </div>
      </div>

      {reviewing ? (
        <div className="flex items-center justify-between px-5 py-1.5 text-sm text-white" style={{ background: SUBBAR }}>
          <button onClick={() => setPhase('summary')} className="hover:underline">← Back to results</button>
          <span>{!answeredIds.has(id) ? 'Not answered' : (answered?.result.is_correct ?? gridAnswered?.result.is_correct ?? mlAnswered?.result.is_correct) ? 'Correct' : 'Incorrect'}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between px-5 py-1.5 text-sm text-white" style={{ background: SUBBAR }}>
          <button onClick={() => setCalcOpen((v) => !v)} className={`flex items-center gap-1.5 hover:underline ${calcOpen ? 'text-[#ffd21e]' : ''}`}><span aria-hidden>▭</span><span>Calculator</span></button>
          <button onClick={() => setFlags((f) => ({ ...f, [id]: !f[id] }))} className={`flex items-center gap-1.5 hover:underline ${flags[id] ? 'text-[#ffd21e]' : ''}`}><span aria-hidden>⚑</span><span>Flag for Review</span></button>
        </div>
      )}

      {Content}

      {reviewing ? (
        <div className="flex items-center justify-between text-sm text-white" style={{ background: BAR }}>
          <button onClick={() => setPhase('summary')} className="px-5 py-3 hover:bg-white/10">⤶ Back to results</button>
          <div className="flex">
            {reviewPos > 0 ? <button onClick={() => reviewGo(-1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">← Previous</button> : null}
            {reviewPos < reviewList.length - 1 ? <button onClick={() => reviewGo(1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">Next →</button> : null}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-sm text-white" style={{ background: BAR }}>
          <button onClick={() => setConfirmFinish(true)} className="px-5 py-3 hover:bg-white/10">⤶ End Exam</button>
          <div className="flex">
            {i > 0 ? <button onClick={() => go(-1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">← Previous</button> : null}
            <button onClick={() => setNavOpen(true)} className="border-l border-white/25 px-5 py-3">✧ Navigator</button>
            {i >= total - 1 ? <button onClick={() => setConfirmFinish(true)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">Finish →</button> : <button onClick={() => go(1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">Next →</button>}
          </div>
        </div>
      )}

      {calcOpen && !reviewing ? <TI108Calculator onClose={() => setCalcOpen(false)} /> : null}

      {confirmFinish && !reviewing ? (
        <ExamConfirm
          title="Finish and submit?"
          message={(() => {
            const un = questionIds.filter((qid) => !hasPending(qid)).length
            return un > 0
              ? `You have ${un} unanswered question${un === 1 ? '' : 's'}. Once you finish, your answers are marked and you can no longer change them.`
              : 'Once you finish, your answers are marked and you can no longer change them.'
          })()}
          confirmLabel="Yes, finish"
          cancelLabel="No, keep going"
          onConfirm={() => { setConfirmFinish(false); submitAll() }}
          onCancel={() => setConfirmFinish(false)}
        />
      ) : null}

      {grading ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 text-white">
          <div className="flex items-center gap-3 rounded-lg bg-[#1268ad] px-6 py-4">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Marking your answers…
          </div>
        </div>
      ) : null}

      {navOpen && !reviewing ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) setNavOpen(false) }}>
          <div className="max-h-[80vh] w-[min(520px,92vw)] overflow-auto rounded-lg bg-white">
            <div className="flex items-center justify-between px-5 py-3 font-semibold text-white" style={{ background: '#1268ad' }}>Navigator <button onClick={() => setNavOpen(false)}>✕</button></div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2 p-4">
              {questionIds.map((qid, idx) => (
                <button key={qid} onClick={() => { setI(idx); setNavOpen(false) }} className={`relative h-11 rounded border text-sm ${hasPending(qid) ? 'border-[#7bb08a] bg-[#e2efe4]' : 'border-gray-300 bg-white'} ${idx === i ? 'outline outline-2 outline-[#1268ad]' : ''}`}>
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

function CounterIcon() {
  return (
    <svg width="18" height="15" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="2" width="20" height="4" rx="1" /><rect x="2" y="8" width="20" height="4" rx="1" /><rect x="4" y="14" width="16" height="3" rx="1" /></svg>
  )
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1268ad" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="flex-none" aria-hidden>
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
