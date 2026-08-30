'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TI108Calculator } from '@/components/ui/ti108-calculator'
import { ExamConfirm } from '@/components/exam-confirm'
import { haptic } from '@/lib/haptics'
import {
  mockFetchQuestionsAction,
  mockGradeSingleAction,
  mockGradeGridAction,
  mockGradeMostLeastAction,
} from '@/lib/mock/actions'
import type { SafeQuestion, AnswerResult, GridResult, MostLeastResult } from '@/lib/access/questions'

type YesNo = 'Yes' | 'No'
type Section = { name: string; minutes: number; questionIds: string[] }
type Graded =
  | { kind: 'mcq'; selectedId: string; result: AnswerResult }
  | { kind: 'grid'; answers: Record<string, YesNo>; result: GridResult }
  | { kind: 'ml'; choice: { most: number; least: number }; result: MostLeastResult }

const ARIAL = 'Arial, Helvetica, sans-serif'
const BAR = 'linear-gradient(#1a78bf,#1268ad)'
const SUBBAR = '#4e82c4'

function mmss(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MockRunner({
  label,
  examSlug,
  token,
  sections,
}: {
  label: string
  examSlug: string
  token: string
  sections: Section[]
}) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)

  const [phase, setPhase] = useState<'intro' | 'running' | 'transition' | 'done'>('intro')
  const [sIdx, setSIdx] = useState(0)
  const [i, setI] = useState(0)
  const [cache, setCache] = useState<Record<string, SafeQuestion | null>>({})
  const [mcqPending, setMcqPending] = useState<Record<string, string>>({})
  const [gridPending, setGridPending] = useState<Record<string, Record<number, YesNo>>>({})
  const [mlPending, setMlPending] = useState<Record<string, { most?: number; least?: number }>>({})
  const [mlSelected, setMlSelected] = useState<number | null>(null)
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [graded, setGraded] = useState<Record<string, Graded>>({})
  const [calcOpen, setCalcOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [remaining, setRemaining] = useState((sections[0]?.minutes ?? 0) * 60)
  const [reviewQid, setReviewQid] = useState<string | null>(null)
  const [grading, setGrading] = useState(false)

  const section = sections[sIdx]
  const ids = section?.questionIds ?? []
  const id = ids[i]
  const q = cache[id]

  // Bulk-load the whole section in one round-trip when it starts, so moving
  // between its questions is instant (no per-Next server call).
  useEffect(() => {
    if (phase !== 'running' || ids.length === 0) return
    let alive = true
    mockFetchQuestionsAction(token, ids).then((map) => {
      if (alive) setCache((c) => ({ ...c, ...(map as Record<string, SafeQuestion | null>) }))
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload per section start
  }, [phase, sIdx, token])

  // Grade every answered question in a section, silently (no reveal mid-exam).
  const gradeSection = useCallback(async (index: number) => {
    const secIds = sections[index]?.questionIds ?? []
    const updates: Record<string, Graded> = {}
    for (const qid of secIds) {
      const cur = cache[qid]
      if (!cur) continue
      if (cur.statements) {
        const ans = gridPending[qid]
        if (!ans || Object.keys(ans).length === 0) continue
        const asStr: Record<string, YesNo> = {}
        for (const k of Object.keys(ans)) asStr[k] = ans[Number(k)]
        const r = await mockGradeGridAction(token, qid, asStr)
        if ('denied' in r) continue
        updates[qid] = { kind: 'grid', answers: asStr, result: r }
      } else if (cur.mostLeast) {
        const ch = mlPending[qid]
        if (ch?.most == null || ch?.least == null) continue
        const r = await mockGradeMostLeastAction(token, qid, { most: ch.most, least: ch.least })
        if ('denied' in r) continue
        updates[qid] = { kind: 'ml', choice: { most: ch.most, least: ch.least }, result: r }
      } else {
        const sel = mcqPending[qid]
        if (!sel) continue
        const r = await mockGradeSingleAction(token, qid, sel)
        if ('denied' in r) continue
        updates[qid] = { kind: 'mcq', selectedId: sel, result: r }
      }
    }
    setGraded((g) => ({ ...g, ...updates }))
  }, [cache, gridPending, mlPending, mcqPending, sections, token])

  const endSection = useCallback(async () => {
    if (grading) return
    setGrading(true)
    setCalcOpen(false)
    await gradeSection(sIdx)
    setGrading(false)
    if (sIdx < sections.length - 1) setPhase('transition')
    else {
      setPhase('done')
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [grading, gradeSection, sIdx, sections.length])

  // Section timer. endSection is held in a ref so answering (which rebuilds it)
  // never resets the countdown.
  const endRef = useRef(endSection)
  useEffect(() => { endRef.current = endSection }, [endSection])
  useEffect(() => {
    if (phase !== 'running') return
    if (remaining <= 0) { endRef.current(); return }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, remaining])

  const goTo = useCallback((idx: number) => { setI(Math.min(ids.length - 1, Math.max(0, idx))); setMlSelected(null) }, [ids.length])
  const go = useCallback((d: number) => { setI((cur) => Math.min(ids.length - 1, Math.max(0, cur + d))); setMlSelected(null) }, [ids.length])

  function begin() {
    haptic(15)
    rootRef.current?.requestFullscreen?.().catch(() => {})
    setPhase('running')
  }
  function nextSection() {
    haptic(15)
    const next = sIdx + 1
    setSIdx(next)
    setI(0)
    setMlSelected(null)
    setRemaining(sections[next].minutes * 60)
    setNavOpen(false)
    setPhase('running')
  }

  const isAnswered = (qid: string) => {
    const cur = cache[qid]
    if (cur?.statements) return Object.keys(gridPending[qid] ?? {}).length > 0
    if (cur?.mostLeast) return mlPending[qid]?.most != null && mlPending[qid]?.least != null
    return !!mcqPending[qid]
  }

  // ---------- INTRO ----------
  if (phase === 'intro') {
    const totalQ = sections.reduce((n, s) => n + s.questionIds.length, 0)
    const totalMin = sections.reduce((n, s) => n + s.minutes, 0)
    return (
      <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: ARIAL }}>
        <div className="px-5 py-3 text-white" style={{ background: BAR }}><span className="text-lg font-semibold">{label}</span></div>
        <div className="h-3" style={{ background: SUBBAR }} />
        <div className="flex-1 overflow-auto p-8 text-[#1b1b1b]">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl font-semibold">{label}</h1>
            <p className="mt-3 text-[15px] leading-relaxed">
              This is a full timed mock. You sit each section back to back under its own timer, with no answers shown
              until the end. When a section&rsquo;s timer runs out it ends automatically and the next one begins.
            </p>
            <div className="mt-6 overflow-hidden rounded border border-gray-300">
              {sections.map((s, k) => (
                <div key={k} className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 text-sm last:border-0">
                  <span className="font-medium">{k + 1}. {s.name}</span>
                  <span className="tabular-nums text-gray-600">{s.questionIds.length} questions · {s.minutes} min</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-600 tabular-nums">Total: {totalQ} questions · {totalMin} minutes</p>
            <p className="mt-1 text-xs text-gray-500">The calculator (Alt+C) and flag-for-review are available throughout.</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-white" style={{ background: BAR }}>
          <button onClick={() => router.push(`/mock/${examSlug}`)} className="px-5 py-3 hover:bg-white/10">⤶ Exit</button>
          <button onClick={begin} className="px-6 py-3 hover:bg-white/10">Begin exam →</button>
        </div>
      </div>
    )
  }

  // ---------- TRANSITION ----------
  if (phase === 'transition') {
    const next = sections[sIdx + 1]
    return (
      <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: ARIAL }}>
        <div className="px-5 py-3 text-white" style={{ background: BAR }}><span className="text-lg font-semibold">{label}</span></div>
        <div className="h-3" style={{ background: SUBBAR }} />
        <div className="flex flex-1 items-center justify-center p-8 text-center text-[#1b1b1b]">
          <div className="max-w-md">
            <p className="text-sm uppercase tracking-wide text-[#1268ad]">Section complete</p>
            <h2 className="mt-2 text-2xl font-semibold">{sections[sIdx].name} finished</h2>
            <p className="mt-4 text-[15px] text-gray-600">Next section: <span className="font-semibold text-[#1b2a46]">{next.name}</span></p>
            <p className="mt-1 text-sm text-gray-500 tabular-nums">{next.questionIds.length} questions · {next.minutes} minutes</p>
            <button onClick={nextSection} className="mt-6 rounded bg-[#1268ad] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90">Start {next.name} →</button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- DONE (results + review) ----------
  if (phase === 'done') {
    const perSection = sections.map((s) => {
      const total = s.questionIds.length
      const correct = s.questionIds.filter((qid) => graded[qid]?.result.is_correct).length
      return { name: s.name, correct, total }
    })
    const totalQ = perSection.reduce((n, s) => n + s.total, 0)
    const totalCorrect = perSection.reduce((n, s) => n + s.correct, 0)

    return (
      <div ref={rootRef} className="fixed inset-0 z-[100] overflow-auto bg-[#eef1f4] p-6" style={{ fontFamily: ARIAL }}>
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-8">
          <h1 className="text-2xl font-semibold text-[#1b2a46]">{label} results</h1>
          <p className="mt-1 text-gray-600 tabular-nums">Overall: {totalCorrect} / {totalQ} correct</p>

          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
            {perSection.map((s, k) => (
              <div key={k} className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-0">
                <span className="text-sm font-medium text-[#1b2a46]">{s.name}</span>
                <span className="tabular-nums text-sm text-gray-600">
                  {s.correct} / {s.total}{s.total ? ` · ${Math.round((s.correct / s.total) * 100)}%` : ''}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-5">
            {sections.map((s, k) => (
              <div key={k}>
                <p className="mb-2 text-sm font-semibold text-[#1b2a46]">{s.name}</p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-2">
                  {s.questionIds.map((qid, idx) => {
                    const g = graded[qid]
                    const cls = !g ? 'bg-gray-100 text-gray-400' : g.result.is_correct ? 'bg-[#e2efe4] text-[#157d72]' : 'bg-[#fdecec] text-[#dc2626]'
                    return <button key={qid} onClick={() => g && setReviewQid(qid)} className={`h-9 rounded ${cls} text-sm ${g ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}>{idx + 1}</button>
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            <Link href={`/mock/${examSlug}`} className="rounded-lg bg-[#157d72] px-5 py-2.5 text-sm font-medium text-white">Back to mock exams</Link>
            <Link href="/dashboard" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium">Dashboard</Link>
          </div>
        </div>

        {reviewQid ? <ReviewCard q={cache[reviewQid]} graded={graded[reviewQid]} onClose={() => setReviewQid(null)} /> : null}
      </div>
    )
  }

  // ---------- RUNNING ----------
  const setGrid = (idx: number, v: YesNo) => { haptic(8); setGridPending((p) => ({ ...p, [id]: { ...(p[id] ?? {}), [idx]: v } })) }
  const cycleGrid = (idx: number) => { haptic(8); setGridPending((p) => {
    const cur = p[id]?.[idx]
    const next = cur === 'Yes' ? 'No' : cur === 'No' ? undefined : 'Yes'
    const row = { ...(p[id] ?? {}) }
    if (next) row[idx] = next; else delete row[idx]
    return { ...p, [id]: row }
  }) }
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
  const Table = q?.table ? (
    <div className="my-4 inline-block overflow-x-auto">
      <table className="border-collapse text-sm">
        <thead><tr>{q.table.headers.map((h, k) => <th key={k} className="border border-gray-400 px-4 py-1.5 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{q.table.rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-gray-400 px-4 py-1.5 text-center">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  ) : null

  const Options = q ? (
    <div className="flex flex-col">
      {q.options.map((o) => {
        const sel = mcqPending[id] === o.id
        return (
          <button key={o.id} onClick={() => { haptic(8); setMcqPending((p) => ({ ...p, [id]: o.id })) }} className="flex items-start gap-3 py-2.5 text-left text-[15px]">
            <span className={`mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center rounded-full border-2 ${sel ? 'border-[#1268ad]' : 'border-gray-500'}`}>
              {sel ? <span className="h-2 w-2 rounded-full bg-[#1268ad]" /> : null}
            </span>
            <span className="w-7 flex-none font-medium">{o.label}.</span>
            <span>{o.body}</span>
          </button>
        )
      })}
    </div>
  ) : null

  const Grid = q?.statements ? (
    <div className="mt-2">
      <p className="mb-4 text-[15px]">Place &lsquo;Yes&rsquo; if the conclusion does follow. Place &lsquo;No&rsquo; if it does not.</p>
      <div className="flex items-start gap-6">
        <div className="flex flex-1 flex-col gap-3">
          {q.statements.map((s) => {
            const chosen = gridPending[id]?.[s.index]
            const boxCls = chosen ? 'border-[#1268ad] bg-[#eef5fb] text-[#1268ad]' : 'border-gray-400 bg-[#b3aca7] text-white'
            return (
              <div key={s.index} className="flex items-stretch gap-3">
                <div className="flex flex-1 items-center border-2 border-black px-4 py-3 text-center text-[15px]">{s.text}</div>
                <div
                  onClick={() => cycleGrid(s.index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { const v = e.dataTransfer.getData('text/plain') as YesNo; if (v === 'Yes' || v === 'No') setGrid(s.index, v) }}
                  className={`grid w-24 flex-none cursor-pointer place-items-center border-2 font-semibold ${boxCls}`}
                >{chosen ?? ''}</div>
              </div>
            )
          })}
        </div>
        <div className="flex flex-col gap-3 bg-gray-200 p-3">
          {(['Yes', 'No'] as YesNo[]).map((v) => (
            <div key={v} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', v)} className="grid h-16 w-20 cursor-grab place-items-center border-2 border-black bg-white text-[15px] active:cursor-grabbing">{v}</div>
          ))}
        </div>
      </div>
    </div>
  ) : null

  const ML = q?.mostLeast ? (
    <div className="mt-6">
      <div className="flex flex-col gap-3">
        {(['most', 'least'] as const).map((slot) => {
          const label = slot === 'most' ? 'Most Appropriate' : 'Least Appropriate'
          const idx = mlPending[id]?.[slot]
          const action = idx != null ? q.mostLeast!.actions.find((a) => a.index === idx) : undefined
          const boxCls = action ? 'border-[#1268ad] bg-[#eef5fb] text-[#1268ad]' : 'border-gray-400 bg-[#b3aca7] text-white'
          return (
            <div key={slot} className="flex items-stretch gap-3">
              <div className="grid w-40 flex-none place-items-center border-2 border-black px-2 py-3 text-center text-[15px]">{label}</div>
              <div
                onClick={() => { if (mlSelected != null) { setML(slot, mlSelected); setMlSelected(null) } else if (action) clearML(slot) }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { const v = Number(e.dataTransfer.getData('text/plain')); if (!Number.isNaN(v)) setML(slot, v) }}
                className={`flex min-h-[64px] flex-1 cursor-pointer items-center justify-center border-2 px-4 text-center text-[15px] ${boxCls}`}
              >{action ? action.text : ''}</div>
            </div>
          )
        })}
      </div>
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
    </div>
  ) : null

  const lastQuestion = i >= ids.length - 1

  return (
    <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ fontFamily: ARIAL }}>
      <div className="flex items-center justify-between px-5 py-2.5 text-white" style={{ background: BAR }}>
        <span className="text-lg font-semibold">{label} · {section.name}</span>
        <div className="flex items-center gap-5">
          <span className={`text-sm tabular-nums ${remaining < 60 ? 'text-[#ffd21e]' : ''}`}>{mmss(remaining)}</span>
          <span className="text-sm tabular-nums">{i + 1} of {ids.length}</span>
        </div>
      </div>
      <div className="flex items-center justify-between px-5 py-1.5 text-sm text-white" style={{ background: SUBBAR }}>
        <button onClick={() => setCalcOpen((v) => !v)} className={`flex items-center gap-1.5 hover:underline ${calcOpen ? 'text-[#ffd21e]' : ''}`}><span aria-hidden>▭</span><span>Calculator</span></button>
        <button onClick={() => setFlags((f) => ({ ...f, [id]: !f[id] }))} className={`flex items-center gap-1.5 hover:underline ${flags[id] ? 'text-[#ffd21e]' : ''}`}><span aria-hidden>⚑</span><span>Flag for Review</span></button>
      </div>

      <div className="flex-1 overflow-auto p-6 text-[#1b1b1b]">
        {q === undefined ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#1268ad]/25 border-t-[#1268ad]" />
            <p className="text-sm text-gray-500">Loading questions…</p>
          </div>
        ) : q === null ? (
          <p className="text-gray-500">This question isn&rsquo;t available.</p>
        ) : q.statements ? (
          <div className="mx-auto max-w-6xl"><p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>{Img}{Table}{Grid}</div>
        ) : q.mostLeast ? (
          <div className="mx-auto max-w-4xl"><p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>{Img}{ML}</div>
        ) : q.passage ? (
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:divide-x md:divide-gray-300">
            <div className="md:pr-8"><p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.passage}</p>{Img}</div>
            <div className="md:pl-8"><p className="text-[15px] leading-relaxed">{q.stem}</p><div className="mt-6">{Options}</div></div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            {q.topic ? <p className="text-xs font-semibold uppercase tracking-wide text-[#1268ad]">{q.topic}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>{Img}{Table}
            <div className="mt-5">{Options}</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-white" style={{ background: BAR }}>
        <button onClick={() => setConfirmEnd(true)} className="px-5 py-3 hover:bg-white/10" disabled={grading}>
          ⤶ End section
        </button>
        <div className="flex">
          {i > 0 ? <button onClick={() => go(-1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">← Previous</button> : null}
          <button onClick={() => setNavOpen(true)} className="border-l border-white/25 px-5 py-3">✧ Navigator</button>
          {lastQuestion
            ? <button onClick={() => setConfirmEnd(true)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]" disabled={grading}>{grading ? 'Saving…' : 'End section →'}</button>
            : <button onClick={() => go(1)} className="border-l border-white/25 px-5 py-3 text-[#ffd21e]">Next →</button>}
        </div>
      </div>

      {confirmEnd ? (
        <ExamConfirm
          title={sIdx < sections.length - 1 ? `End ${section.name}?` : 'End the exam?'}
          message={(() => {
            const un = ids.filter((qid) => !isAnswered(qid)).length
            const base = sIdx < sections.length - 1
              ? `You cannot return to this section once it ends.`
              : `This finishes the exam and marks your answers.`
            return un > 0 ? `You have ${un} unanswered question${un === 1 ? '' : 's'}. ${base}` : base
          })()}
          confirmLabel={sIdx < sections.length - 1 ? 'End section' : 'Finish exam'}
          cancelLabel="Keep going"
          onConfirm={() => { setConfirmEnd(false); endSection() }}
          onCancel={() => setConfirmEnd(false)}
        />
      ) : null}

      {calcOpen ? <TI108Calculator onClose={() => setCalcOpen(false)} /> : null}

      {navOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) setNavOpen(false) }}>
          <div className="max-h-[80vh] w-[min(520px,92vw)] overflow-auto rounded-lg bg-white">
            <div className="flex items-center justify-between px-5 py-3 font-semibold text-white" style={{ background: '#1268ad' }}>{section.name} · Navigator <button onClick={() => setNavOpen(false)}>✕</button></div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2 p-4">
              {ids.map((qid, idx) => (
                <button key={qid} onClick={() => { goTo(idx); setNavOpen(false) }} className={`relative h-11 rounded border text-sm ${isAnswered(qid) ? 'border-[#7bb08a] bg-[#e2efe4]' : 'border-gray-300 bg-white'} ${idx === i ? 'outline outline-2 outline-[#1268ad]' : ''}`}>
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

/** Post-exam review of a single answered question: your response vs the key, plus rationale. */
function ReviewCard({ q, graded, onClose }: { q: SafeQuestion | null | undefined; graded: Graded | undefined; onClose: () => void }) {
  const ok = graded?.result.is_correct
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ fontFamily: ARIAL }}>
      <div className="max-h-[85vh] w-[min(760px,94vw)] overflow-auto rounded-lg bg-white">
        <div className="flex items-center justify-between px-5 py-3 text-white" style={{ background: BAR }}>
          <span className="font-semibold">Review</span>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="p-6 text-[#1b1b1b]">
          <p className={`text-sm font-semibold ${ok ? 'text-[#157d72]' : 'text-[#dc2626]'}`}>{ok ? 'Correct' : 'Incorrect'}</p>
          {q?.passage ? <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700">{q.passage}</p> : null}
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{q?.stem}</p>

          {graded?.kind === 'mcq' && q ? (
            <div className="mt-4 flex flex-col gap-1.5">
              {q.options.map((o) => {
                const isCorrect = graded.result.correct_option_id === o.id
                const isPicked = graded.selectedId === o.id
                const cls = isCorrect ? 'border-[#157d72] bg-[#e2efec]' : isPicked ? 'border-[#dc2626] bg-[#fdecec]' : 'border-gray-200'
                return (
                  <div key={o.id} className={`flex items-center gap-3 rounded border px-3 py-2 text-sm ${cls}`}>
                    <span className="w-5 font-medium">{o.label}.</span><span>{o.body}</span>
                    {isCorrect ? <span className="ml-auto text-xs font-medium text-[#157d72]">Correct answer</span> : isPicked ? <span className="ml-auto text-xs font-medium text-[#dc2626]">Your answer</span> : null}
                  </div>
                )
              })}
            </div>
          ) : null}

          {graded?.kind === 'grid' && q?.statements ? (
            <div className="mt-4 flex flex-col gap-1.5">
              {q.statements.map((s) => {
                const per = graded.result.per_statement.find((p) => p.index === s.index)
                const yours = graded.answers[String(s.index)] ?? '-'
                return (
                  <div key={s.index} className={`flex items-center gap-3 rounded border px-3 py-2 text-sm ${per?.correct ? 'border-[#157d72] bg-[#e2efec]' : 'border-[#dc2626] bg-[#fdecec]'}`}>
                    <span className="flex-1">{s.text}</span>
                    <span className="tabular-nums text-xs text-gray-600">you: {yours} · answer: {per?.correct_answer}</span>
                  </div>
                )
              })}
            </div>
          ) : null}

          {graded?.kind === 'ml' && q?.mostLeast ? (
            <div className="mt-4 flex flex-col gap-1.5 text-sm">
              <div className={`rounded border px-3 py-2 ${graded.result.most_correct ? 'border-[#157d72] bg-[#e2efec]' : 'border-[#dc2626] bg-[#fdecec]'}`}>
                Most appropriate answer: <span className="font-medium">{q.mostLeast.actions.find((a) => a.index === graded.result.correct_most)?.text}</span>
              </div>
              <div className={`rounded border px-3 py-2 ${graded.result.least_correct ? 'border-[#157d72] bg-[#e2efec]' : 'border-[#dc2626] bg-[#fdecec]'}`}>
                Least appropriate answer: <span className="font-medium">{q.mostLeast.actions.find((a) => a.index === graded.result.correct_least)?.text}</span>
              </div>
            </div>
          ) : null}

          {graded?.result.explanation_text ? (
            <div className="mt-5 rounded border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed">
              <p className="mb-1 font-semibold">Answer rationale</p>{graded.result.explanation_text}
            </div>
          ) : null}
          {graded && !graded.result.can_watch_video && graded.result.has_video ? (
            <div className="mt-4 rounded border-2 border-[#157d72] bg-[#e2efec] p-4 text-center">
              <p className="font-semibold text-[#1b2a46]">Video explanation</p>
              <p className="mt-1 text-sm text-gray-600">Watch this worked through on video with a subscription.</p>
              <Link href="/pricing" className="mt-3 inline-block rounded-md bg-[#157d72] px-4 py-2 text-sm font-medium text-white">See plans</Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
