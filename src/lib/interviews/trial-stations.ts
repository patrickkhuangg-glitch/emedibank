import 'server-only'
import { INTERVIEW_STATIONS, type InterviewStation } from './stations'
import { TRIAL_MMI_IDS, TRIAL_PANEL_IDS } from './trial-catalog'
export function studentStation(station: InterviewStation): InterviewStation {
  const {examinerFeedback: _guide,rolePlayerInstructions: _actor,...safe}=station; void _guide; void _actor; return safe
}
export function trialStations(): InterviewStation[] {
  return INTERVIEW_STATIONS.filter(s=>TRIAL_MMI_IDS.includes(s.id)||TRIAL_PANEL_IDS.includes(s.id)).map(s=>studentStation({...s,questions:s.format==='panel'?s.questions.slice(0,1):s.questions}))
}
