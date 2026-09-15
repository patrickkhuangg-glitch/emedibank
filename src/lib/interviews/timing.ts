import type { InterviewFormat, InterviewStation } from './stations'

export const INTERVIEW_TIMING = {
  mmi: {
    preparationSeconds: 2 * 60,
    responseSeconds: 8 * 60,
    preparationLabel: '2 min prep',
    responseLabel: '8 min response',
  },
  panel: {
    preparationSeconds: 0,
    responseSeconds: 2 * 60,
    preparationLabel: 'No preparation',
    responseLabel: '2 min response',
  },
} as const

export const DAILY_PANEL_TIMING = {
  preparationSeconds: 0,
  responseSeconds: 5 * 60,
  preparationLabel: 'No preparation',
  responseLabel: '5 min response',
} as const

export function getInterviewTiming(format: InterviewFormat, context: 'standard' | 'daily' = 'standard') {
  if (format === 'panel' && context === 'daily') return DAILY_PANEL_TIMING
  return INTERVIEW_TIMING[format]
}

export function getInterviewTimingLabel(format: InterviewFormat) {
  const timing = getInterviewTiming(format)
  return timing.preparationSeconds > 0 ? `${timing.preparationLabel} · ${timing.responseLabel}` : timing.responseLabel
}

export function getInterviewQuestions(station: InterviewStation, questionIndex = 0) {
  return station.format === 'panel' ? station.questions.slice(questionIndex, questionIndex + 1) : [...new Set(station.questions)]
}

/** Missing selection preserves existing links; invalid panel indexes are rejected. */
export function getPracticeQuestionIndex(station: InterviewStation, value: unknown): number | null {
  if (station.format !== 'panel' || value === undefined) return 0
  const index = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < station.questions.length ? index : null
}
