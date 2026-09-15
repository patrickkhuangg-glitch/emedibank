'use client'
import { useEffect, useState, useRef } from 'react'
import { MockTelemetry } from './telemetry'
import type { SafeQuestion } from '@/lib/access/questions'
import type { Response } from './types'
export function useMockTelemetry(active: boolean, id: string, sectionIndex: number, budget: number, question: SafeQuestion | null | undefined, mcq: Record<string,string>, grids: Record<string,Record<number,string>>, ml: Record<string,{most?:number;least?:number}>) {
  const [tracker] = useState(() => new MockTelemetry())
  const starts = useRef<Record<number,number>>({})
  useEffect(() => {
    if (!active || !id || !question) return
    if (starts.current[sectionIndex] == null) starts.current[sectionIndex] = performance.now()
    const elapsed = Math.min(budget, Math.max(0, (performance.now() - starts.current[sectionIndex]) / 1000))
    tracker.visit(id, elapsed)
    let answer: Response = mcq[id] ?? null, complete = !!answer
    if (question.statements) { answer = grids[id] ?? null; complete = !!answer && question.statements.every(s => grids[id]?.[s.index] != null) }
    if (question.mostLeast) { answer = ml[id] ?? null; complete = ml[id]?.most != null && ml[id]?.least != null }
    tracker.answer(id, answer, complete, elapsed)
  }, [active, id, sectionIndex, budget, question, mcq, grids, ml, tracker])
  return tracker
}
