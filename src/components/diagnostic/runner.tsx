'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExamIntroduction } from './exam-introduction'
import { ExamShell, ExamLoading } from './exam-shell'
import { TI108Calculator } from '@/components/ui/ti108-calculator'
import { ExamConfirm } from '@/components/exam-confirm'
import { haptic } from '@/lib/haptics'
import { MockReview } from '@/components/mock-review'
import { ConfidenceChoice } from '@/components/mock-report/confidence-choice'
import { useQuestionConfidence } from '@/lib/mock/report/use-confidence'
import { useMockTelemetry } from '@/lib/mock/report/use-telemetry'
import { boundedSectionTimes } from '@/lib/mock/section-times'
import { QuestionTimeTracker, type MockGraded, type ReviewItem } from '@/lib/mock/review'
import { estimateAnzPercentile } from '@/lib/ucat/benchmarks'
import { QuestionLoading } from '@/components/question-loading'
import { loadQuestionSection } from '@/lib/practice/load-question-section'
import { useQuestionViews } from '@/lib/practice/use-question-views'
import { canMarkQuestions } from '@/lib/practice/question-views'
import { COGNITIVE_SECTIONS, cognitiveTotal, estimateCognitiveScore, estimateAnzSjtScore, estimateSjtBand, isCognitiveSection, summariseMarks } from '@/lib/ucat/scoring'
import {
  mockFetchQuestionsAction,
  mockRevealSolutionAction,
  mockGradeSingleAction,
  mockGradeGridAction,
  mockGradeMostLeastAction,
} from '@/lib/mock/actions'
import type { SafeQuestion } from '@/lib/access/questions'

type YesNo = 'Yes' | 'No'
type Section = { name: string; subtestSlug?: string; qrTopScoreRaw?: 35 | 36; minutes: number; questionIds: string[] }
type Graded = MockGraded

const ARIAL = 'Arial, Helvetica, sans-serif'
const BAR = 'linear-gradient(#1a78bf,#1268ad)'
const SUBBAR = '#4e82c4'

function mmss(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function DiagnosticRunner({
  kind,
  label,
  examSlug,
  token,
  sections,
}: {
  kind: 'mini' | 'full'
  label: string
  examSlug: string
  token: string
  sections: Section[]
}) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)

  const [instructionRemaining,setInstructionRemaining]=useState(90)
  const [phase, setPhase] = useState<'intro' | 'instructions' | 'running' | 'transition' | 'done'>('intro')
  const [sIdx, setSIdx] = useState(0)
  const [loadedSection, setLoadedSection] = useState<number | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
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
  const [questionClock] = useState(() => new QuestionTimeTracker())
  const [reviewTimes, setReviewTimes] = useState<Record<string, number>>({})
  const [grading, setGrading] = useState(false)
  const [gradingError,setGradingError] = useState(false)
  const completedGrades = useRef<Record<string,Graded>>({})
  const endedSections = useRef(new Set<number>())
  const finalTimes = useRef<Record<string,number>>({})
  const sectionDeadline = useRef<{index:number;at:number}|null>(null)

  const section = sections[sIdx]
  const ids = section?.questionIds ?? []
  const id = ids[i]
  const q = cache[id]
  const confidence=useQuestionConfidence(id,q,mcqPending,gridPending,mlPending)
  const sectionReady = loadedSection === sIdx
  const reportTelemetry = useMockTelemetry(phase === 'running' && sectionReady && !grading, id, sIdx, (section?.minutes ?? 0) * 60, q, mcqPending, gridPending, mlPending)
  const { allViewed, unviewedCount, firstUnviewedIndex } = useQuestionViews(ids, id, phase === 'running' && sectionReady && !!q)

  useEffect(() => {
    questionClock.switchTo(phase === 'running' && sectionReady && !grading && !gradingError && q ? id : null, performance.now())
    return () => questionClock.switchTo(null, performance.now())
  }, [phase, sectionReady, grading, gradingError, id, q, questionClock])

  // Bulk-load the whole section in one round-trip when it starts, so moving
  // between its questions is instant (no per-Next server call).
  useEffect(() => {
    if (!['running','instructions'].includes(phase) || sectionReady) return
    let alive = true
    loadQuestionSection(ids, () => mockFetchQuestionsAction(token, ids)).then((map) => {
      if (alive) {
        setCache((c) => ({ ...c, ...(map as Record<string, SafeQuestion | null>) }))
        setLoadedSection(sIdx)
      }
    }).catch(() => { if (alive) setLoadError(true) })
    return () => { alive = false }
  }, [phase, sIdx, token, ids, sectionReady, loadAttempt])

  // Grade every answered question in a section, silently (no reveal mid-exam).
  const gradeSection = useCallback(async (index: number) => {
    const secIds = sections[index]?.questionIds ?? []
    const updates: Record<string, Graded> = {}
    for (const qid of secIds) {
      const cur = cache[qid]
      if (!cur || completedGrades.current[qid]) continue
      const timeSpentSeconds = Math.round(finalTimes.current[qid] ?? 0)
      if (cur.statements) {
        const ans = gridPending[qid]
        if (!ans || Object.keys(ans).length === 0) continue
        const asStr: Record<string, YesNo> = {}
        for (const k of Object.keys(ans)) asStr[k] = ans[Number(k)]
        const r = await mockGradeGridAction(token, qid, asStr, timeSpentSeconds)
        if ('denied' in r) throw new Error('Marking access expired')
        updates[qid] = { kind: 'grid', answers: asStr, result: r }
      } else if (cur.mostLeast) {
        const ch = mlPending[qid]
        if (ch?.most == null || ch?.least == null) continue
        const r = await mockGradeMostLeastAction(token, qid, { most: ch.most, least: ch.least }, timeSpentSeconds)
        if ('denied' in r) throw new Error('Marking access expired')
        updates[qid] = { kind: 'ml', choice: { most: ch.most, least: ch.least }, result: r }
      } else {
        const sel = mcqPending[qid]
        if (!sel) continue
        const r = await mockGradeSingleAction(token, qid, sel, timeSpentSeconds)
        if ('denied' in r) throw new Error('Marking access expired')
        updates[qid] = { kind: 'mcq', selectedId: sel, result: r }
      }
      if(updates[qid]){completedGrades.current[qid]=updates[qid];setGraded(g=>({...g,[qid]:updates[qid]}))}
    }
    setGraded((g) => ({ ...g, ...updates }))
  }, [cache, gridPending, mlPending, mcqPending, sections, token, questionClock])

  const endSection = useCallback(async (cause: 'manual' | 'timer' = 'manual') => {
    if (phase !== 'running' || endedSections.current.has(sIdx) || !sectionReady || grading || !canMarkQuestions(allViewed, cause)) return
    endedSections.current.add(sIdx)
    questionClock.switchTo(null, performance.now())
    finalTimes.current = {...finalTimes.current,...boundedSectionTimes(ids,questionClock.snapshot(performance.now()),id,sections[sIdx].minutes*60)}
    setReviewTimes({...finalTimes.current})
    setConfirmEnd(false);setNavOpen(false);
    setGradingError(false)
    setGrading(true)
    setCalcOpen(false)
    try {
      if(sIdx === sections.length - 1) {for(let index=0;index<sections.length;index++) await gradeSection(index)}
    } catch {endedSections.current.delete(sIdx);setGradingError(true);setGrading(false);return}
    setGrading(false)
    if (sIdx < sections.length - 1) setPhase('transition')
    else {
      setPhase('done')
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [phase, sectionReady, grading, allViewed, gradeSection, sIdx, sections, ids, id, questionClock])

  // Section timer. endSection is held in a ref so answering (which rebuilds it)
  // never resets the countdown.
  const endRef = useRef(endSection)
  useEffect(() => { endRef.current = endSection }, [endSection])
  useEffect(() => {
    if (phase !== 'running' || !sectionReady || grading || gradingError) return
    if(sectionDeadline.current?.index !== sIdx)sectionDeadline.current={index:sIdx,at:Date.now()+sections[sIdx].minutes*60000};
    const deadline=sectionDeadline.current.at;
    let active=true;let expired=false;
    const tick=()=>{if(!active||expired)return;const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));setRemaining(left);if(left===0){expired=true;endRef.current('timer')}};
    tick();const t=setInterval(tick,250);return()=>{active=false;clearInterval(t)};
  },[phase,sIdx,sectionReady,grading,gradingError]);
  useEffect(()=>{
    if(phase!=='instructions'||!sectionReady)return;
    const seconds=[90,90,120,90][sIdx];setInstructionRemaining(seconds);
    const deadline=Date.now()+seconds*1000;
    let active=true;const t=setInterval(()=>{if(!active)return;const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));setInstructionRemaining(left);if(left===0){active=false;setPhase('running')}},250);
    return()=>{active=false;clearInterval(t)};
  },[phase,sIdx,sectionReady]);
  useEffect(()=>{if(phase==='transition')nextSection()},[phase]);
  const calculatorAllowed=['decision-making','quantitative-reasoning'].includes(section?.subtestSlug??'');
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.altKey&&e.key.toLowerCase()==='c'&&calculatorAllowed&&phase==='running'){e.preventDefault();setCalcOpen(v=>!v)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[calculatorAllowed,phase]);

  const goTo = useCallback((idx: number) => { setI(Math.min(ids.length - 1, Math.max(0, idx))); setMlSelected(null) }, [ids.length])
  const go = useCallback((d: number) => { setI((cur) => Math.min(ids.length - 1, Math.max(0, cur + d))); setMlSelected(null) }, [ids.length])

  function begin() {
    haptic(15)
    // The diagnostic uses the same signed server actions as the live mock platform.
    setPhase('instructions')
  }
  function nextSection() {
    haptic(15)
    const next = sIdx + 1
    setSIdx(next)
    setLoadError(false)
    setI(0)
    setMlSelected(null)
    setRemaining(sections[next].minutes * 60)
    setNavOpen(false)
    setPhase('instructions')
  }

  useEffect(()=>{const key=(e:KeyboardEvent)=>{
    if(!e.altKey||phase!=='running'||!sectionReady||grading||confirmEnd||navOpen)return;
    const k=e.key.toLowerCase();if(!['n','p','f','v'].includes(k))return;e.preventDefault();
    if(k==='n'){if(i===ids.length-1)setConfirmEnd(true);else go(1)}
    if(k==='p')go(-1);if(k==='f')setFlags(f=>({...f,[id]:!f[id]}));if(k==='v')setNavOpen(true);
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[phase,sectionReady,grading,confirmEnd,navOpen,i,id,ids.length,go]);
  const isAnswered = (qid: string) => {
    const cur = cache[qid]
    if (cur?.statements) return Object.keys(gridPending[qid] ?? {}).length > 0
    if (cur?.mostLeast) return mlPending[qid]?.most != null && mlPending[qid]?.least != null
    return !!mcqPending[qid]
  }

  if(phase==='intro')return <ExamIntroduction label={label} sections={sections} onBegin={begin} onExit={()=>router.push(`/mock/${examSlug}`)}/>

  if(phase==='instructions')return <ExamShell label={`${label} · ${section.name}`} toolbar={<><span>Section {sIdx+1} of 4 · Instructions</span>{sectionReady&&<span style={{marginLeft:'auto'}} role="timer">Time remaining {mmss(instructionRemaining)}</span>}</>} footer={<><span className="ucat-footer-note">{ids.length} questions · {section.minutes} minutes</span><div className="ucat-footer-right"><button disabled={!sectionReady} onClick={()=>setPhase('running')}>Start {section.name} →</button></div></>}>
    {!sectionReady?<ExamLoading error={loadError} onRetry={()=>{setLoadError(false);setLoadAttempt(v=>v+1)}}/>:<div className="ucat-information"><h1>{section.name}</h1><p>{[
    'Read each passage and answer using only the supplied information. For True / False / Cannot Tell questions, select Cannot Tell when the passage does not establish the conclusion.',
    'The order is 6 syllogisms, 6 logic puzzles, 5 recognising assumptions, 6 interpreting information, 6 Venn diagrams and 6 probability. Five-statement grids award 2 marks for five correct statements or 1 for four; other items award 1 mark.',
    'Seven sets of four questions come first, followed by eight standalone questions. Use the supplied tables and diagrams. Each question awards one mark.',
    'Rate each action or consideration on the displayed scale, judging each response separately. In the final four questions, select both the most and least appropriate actions. Both choices must be correct to earn the mark.'
    ][sIdx]}</p><h2>During this section</h2><ul><li>Use Next, Previous or Navigator to move between questions. Flag any question you want to return to.</li><li>You can submit manually after viewing every question. Unanswered questions receive no marks.</li><li>The section submits automatically at expiry, including any unseen questions.</li></ul><p>You cannot return to this section after it ends. Answer explanations appear after the whole exam has been marked.</p><p>Read these instructions, then select Start. Otherwise, the questions begin automatically when the instruction timer reaches zero.</p></div>}
  </ExamShell>
  if(gradingError)return <ExamShell label={label}><div className="ucat-loading" role="alert"><h2>Marking could not be completed</h2><p>Your answers are still in this tab. Check your connection, then retry.</p><button onClick={()=>endSection('timer')}>Retry marking</button></div></ExamShell>
  if(grading)return <ExamShell label={label} toolbar={<span>{section.name}</span>} footer={<span className="ucat-footer-note">Please keep this tab open</span>}><div className="ucat-loading" role="status"><span className="ucat-spinner"/><h2>{sIdx===sections.length-1?'Marking your exam…':'Finishing your section…'}</h2><p>{sIdx===sections.length-1?'Your results and review will appear when marking is complete.':'The next section will appear shortly.'}</p></div></ExamShell>

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
      const summary = summariseMarks(s.questionIds.map(qid => ({
        maximum: cache[qid]?.marks ?? 0,
        score: graded[qid]?.result.score ?? null,
        answered: !!(mcqPending[qid] || Object.keys(gridPending[qid] ?? {}).length || (mlPending[qid]?.most != null && mlPending[qid]?.least != null)),
        correct: graded[qid]?.result.is_correct ?? false,
      })))
      const slug = s.subtestSlug ?? ''
      const scaled = examSlug === 'ucat' && summary.complete
        ? isCognitiveSection(slug) ? estimateCognitiveScore(slug, summary.raw, summary.maximum, s.qrTopScoreRaw ?? 36)
          : slug === 'situational-judgement' ? estimateAnzSjtScore(summary.raw, summary.maximum) : null
        : null
      const band = examSlug === 'ucat' && summary.complete && slug === 'situational-judgement' ? estimateSjtBand(summary.raw, summary.maximum) : null
      return { name: s.name, slug, ...summary, scaled, band, percentile: scaled == null ? null : estimateAnzPercentile(slug, scaled), qrTopScoreRaw: s.qrTopScoreRaw ?? 36 }
    })
    const estimatedTotal = cognitiveTotal(Object.fromEntries(COGNITIVE_SECTIONS.map(slug => {
      const matches = perSection.filter(s => s.slug === slug)
      return [slug, matches.length === 1 ? matches[0].scaled : null]
    })))
    const totalPercentile = estimatedTotal == null ? null : estimateAnzPercentile('total', estimatedTotal)

    const times = reviewTimes
    let number = 0
    const reviewItems: ReviewItem[] = sections.flatMap(s => s.questionIds.map(qid => {
      const question = cache[qid] ?? null, g = graded[qid], answered = isAnswered(qid)
      return {
        id: qid, number: ++number, section: s.subtestSlug ?? s.name, sectionName: s.name,
        setId: question?.review?.setId ?? qid, setTitle: question?.review?.setTitle ?? 'Question set',
        questionType: question?.review?.questionType ?? question?.topic ?? 'Uncategorised',
        question, graded: g, maximum: question?.marks ?? 0, score: g?.result.score ?? (answered ? null : 0),
        seconds: times[qid] ?? 0,
        status: !answered ? 'unanswered' : !g ? 'unavailable' : g.result.is_correct ? 'correct' : g.result.score > 0 ? 'partial' : 'incorrect',
      }
    }))
    async function reveal(qid: string) {
      if (isAnswered(qid)) throw new Error('This response has not been graded. Its score remains unavailable.')
      const r = await mockRevealSolutionAction(token, qid)
      if ('denied' in r) throw new Error('Review unavailable')
      const result: Graded = r.kind === 'mcq' ? { kind: 'mcq', selectedId: '', result: r.result }
        : r.kind === 'grid' ? { kind: 'grid', answers: {}, result: r.result }
        : { kind: 'ml', choice: { most: -1, least: -1 }, result: r.result }
      setGraded(previous => ({ ...previous, [qid]: result }))
    }
    return <MockReview label={label} examSlug={examSlug} items={reviewItems} sections={perSection} totalScore={estimatedTotal} totalPercentile={totalPercentile} onReveal={reveal} reportToken={token} reportSubmission={{answers: {...mcqPending, ...gridPending, ...mlPending}, seconds: reviewTimes, traces: reportTelemetry.snapshot(), confidence:confidence.records}} />
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
  const Table = (q?.tables ?? (q?.table ? [q.table] : [])).map((table, tableIndex) => (
    <div key={tableIndex} className="my-4 max-w-full overflow-x-auto">
      <table className="border-collapse text-sm">
        <thead><tr>{table.headers.map((h, k) => <th key={k} className="border border-gray-400 px-4 py-1.5 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{table.rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-gray-400 px-4 py-1.5 text-center">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  ))

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
        <div className="flex flex-1 flex-col gap-3 lg:w-[calc(50vw+108px)] lg:flex-none">
          {q.statements.map((s) => {
            const chosen = gridPending[id]?.[s.index]
            const boxCls = chosen ? 'border-[#1268ad] bg-[#eef5fb] text-[#1268ad]' : 'border-gray-400 bg-[#b3aca7] text-white'
            return (
              <div key={s.index} className="flex items-stretch gap-3">
                <div className="flex flex-1 items-center border-2 border-black px-4 py-3 text-center text-[15px]">{s.text}</div>
                <div
                  role="button" tabIndex={0} aria-label={`Answer statement ${s.index+1}`} onKeyDown={e=>{if(e.key==="Enter"||e.key===" " ){e.preventDefault();cycleGrid(s.index)}}} onClick={() => cycleGrid(s.index)}
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
    <div className="mt-6 lg:w-[50vw]">
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
                role="button" tabIndex={0} aria-label={`Select ${slot} appropriate`} onClick={() => { if (mlSelected != null) { setML(slot, mlSelected); setMlSelected(null) } else if (action) clearML(slot) }}
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
        <span className="text-lg font-semibold">{kind === 'full' ? `${label} · ${section.name}` : label}</span>
        <div className="flex items-center gap-5">
          <span className={`text-sm tabular-nums ${remaining < 60 ? 'text-[#ffd21e]' : ''}`}>{mmss(remaining)}</span>
          <span className="text-sm tabular-nums">{i + 1} of {ids.length}</span>
        </div>
      </div>
      <div className="flex items-center justify-between px-5 py-1.5 text-sm text-white" style={{ background: SUBBAR }}>
        {calculatorAllowed && <button onClick={() => setCalcOpen((v) => !v)} className={`flex items-center gap-1.5 hover:underline ${calcOpen ? 'text-[#ffd21e]' : ''}`}><span aria-hidden>▭</span><span>Calculator</span></button>}
        <button onClick={() => setFlags((f) => ({ ...f, [id]: !f[id] }))} className={`flex items-center gap-1.5 hover:underline ${flags[id] ? 'text-[#ffd21e]' : ''}`}><span aria-hidden>⚑</span><span>Flag for Review</span></button>
      </div>

      <div className="flex-1 overflow-auto p-6 text-[#1b1b1b]">
        {!sectionReady ? (
          <QuestionLoading error={loadError} onRetry={() => { setLoadError(false); setLoadAttempt((attempt) => attempt + 1) }} />
        ) : q === null ? (
          <p className="text-gray-500">This question isn&rsquo;t available.</p>
        ) : q.statements ? (
          <div className="mx-auto max-w-6xl"><p className="mb-4 whitespace-pre-wrap text-[15px] leading-relaxed">{q.passage}</p><p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>{Img}{Table}{Grid}</div>
        ) : q.mostLeast ? (
          <div className="mx-auto max-w-4xl"><p className="mb-4 whitespace-pre-wrap text-[15px] leading-relaxed">{q.passage}</p><p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>{Img}{ML}</div>
        ) : q.passage ? (
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:divide-x md:divide-gray-300">
            <div className="md:pr-8"><p className="whitespace-pre-wrap text-[15px] leading-relaxed">{q.passage}</p>{Img}{Table}</div>
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

      {sectionReady&&q&&<ConfidenceChoice value={confidence.value} onChange={confidence.setValue} disabled={!confidence.complete||grading}/>}

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
            if (!allViewed) return `View every question in this section before marking. You still have ${unviewedCount} question${unviewedCount === 1 ? '' : 's'} to view. The timer will still submit automatically when time expires.`
            const un = ids.filter((qid) => !isAnswered(qid)).length
            const base = sIdx < sections.length - 1
              ? `You cannot return to this section once it ends.`
              : `This finishes the exam and marks your answers.`
            return un > 0 ? `You have ${un} unanswered question${un === 1 ? '' : 's'}. ${base}` : base
          })()}
          confirmLabel={sIdx < sections.length - 1 ? 'End section' : 'Finish exam'}
          confirmDisabled={!allViewed || grading}
          cancelLabel={allViewed ? "Keep going" : "View unseen questions"}
          onConfirm={() => { setConfirmEnd(false); endSection() }}
          onCancel={() => { setConfirmEnd(false); if (!allViewed && firstUnviewedIndex >= 0) goTo(firstUnviewedIndex) }}
        />
      ) : null}

      {calcOpen && calculatorAllowed ? <TI108Calculator onClose={() => setCalcOpen(false)} /> : null}

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
