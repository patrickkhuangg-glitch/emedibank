import type { mockPostMortem } from './postmortem'
import type { Confidence, ConfidenceRecord, ErrorAnnotation, ErrorSummary } from './reflection'
import type { timePressureMap } from './pressure'
import type { confidenceCalibration } from './reflection'
export type Response = string | Record<string, string | number> | null
export type AnswerEvent = { answer: Response; at: number }
export type QuestionTrace = { firstSeen: number | null; events: AnswerEvent[] }
export type ReportSubmission = { answers: Record<string, Response>; seconds: Record<string, number>; traces: Record<string, QuestionTrace>; confidence?: Record<string, ConfidenceRecord> }
export type ReportFact = {
  id: string; number: number; section: string; sectionName: string; type: string; setId: string
  maximum: number; score: number; answered: boolean; seconds: number; budget: number
  difficulty?: 'easy' | 'medium' | 'hard' | null; confidence?: Confidence | null; completedAt?: number | null
  firstSeen: number | null; finalAt: number | null; changes: number; firstScore: number | null
  partialResponse: boolean; format: 'mcq' | 'grid' | 'ml'
}
export type TypeRow = { section: string; sectionName: string; name: string; count: number; raw: number; maximum: number; accuracy: number; averageSeconds: number | null; paceRatio: number | null; lost: number }
export type ReportHistory = { id: string; label: string; completedAt: string; accuracy: number; seconds: number; totalScore?: number | null; sections: { slug: string; accuracy: number; scaled?: number | null }[]; sameForm: boolean }
export type ReportCore = {
  strongest: string; weakest: string; timingInsight: string
  recommendation: { section: string; sectionName: string; type: string; minutes: number; instruction: string }
  marks: { lost: number; maximum: number; unanswered: number | null; incorrect: number | null; partial: number | null }
}
export type PaidReport = {
  postMortem: ReturnType<typeof mockPostMortem>
  timePressure: ReturnType<typeof timePressureMap>
  confidence: ReturnType<typeof confidenceCalibration>
  errors: ErrorSummary

  types: TypeRow[]
  pressure: { section: string; name: string; earlyCount: number; lateCount: number; earlyAccuracy: number | null; lateAccuracy: number | null; lateUnanswered: number; budget: number }[]
  patterns: { name: string; count: number; detail: string; ids: string[] }[]
  changes: { questions: number; helped: number; hurt: number; neutral: number; netMarks: number; ids: string[] }
  queue: { id: string; number: number; section: string; sectionName: string; type: string; lost: number; seconds: number; reason: string }[]
  plan: { day: number; title: string; detail: string; minutes: number; section: string }[]
  history: ReportHistory[]
}
export type MockReport = { id: string; label: string; completedAt: string; access: 'free' | 'paid'; annotations?: ErrorAnnotation[]; confidenceChoices?: Record<string,Confidence>; core: ReportCore; paid: PaidReport | null }
