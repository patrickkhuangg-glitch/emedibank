import type { InterviewFormat, InterviewStation } from './stations'

export const INTERVIEW_TIMING = {
  mmi: {
    preparationSeconds: 2 * 60,
    responseSeconds: 8 * 60,
    preparationLabel: '2 min prep',
    responseLabel: '8 min response',
  },
  panel: {
    preparationSeconds: 30,
    responseSeconds: 3 * 60,
    preparationLabel: '30 sec reading',
    responseLabel: '3 min response',
  },
} as const

export function getInterviewTiming(format: InterviewFormat) {
  return INTERVIEW_TIMING[format]
}

export function getInterviewQuestions(station: InterviewStation, questionIndex = 0) {
  return station.format === 'panel' ? station.questions.slice(questionIndex, questionIndex + 1) : station.questions
}

/** Missing selection preserves existing links; invalid panel indexes are rejected. */
export function getPracticeQuestionIndex(station: InterviewStation, value: unknown): number | null {
  if (station.format !== 'panel' || value === undefined) return 0
  const index = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < station.questions.length ? index : null
}
