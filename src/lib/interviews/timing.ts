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

export function getInterviewQuestions(station: InterviewStation) {
  return station.format === 'panel' ? station.questions.slice(0, 1) : station.questions
}
