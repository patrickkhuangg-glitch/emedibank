import type { InterviewStation } from './stations'

export type RoleplayPart = 'roleplay' | 'reflection'
export const ROLEPLAY_PART_SECONDS = 240
export const ROLEPLAY_ASSESSMENT_SCOPE = 'This is a solo role-play rehearsal with no responding actor. Assess the candidate’s demonstrated wording, reasoning and reflection. Do not infer listening, adaptation to an actor, the other person’s feelings or agreement, or a resolved conversation. A claimed action in reflection is not evidence it occurred in the rehearsal. Explain these limits and use insufficient evidence where the task requires unavailable interaction.'
export function isRoleplayStation(station: Pick<InterviewStation, 'responseMode'>) { return station.responseMode === 'roleplay_reflection' }
export function roleplayPart(elapsedSeconds: number): { kind: RoleplayPart; questionIndex: number; endsAtSeconds: number } {
  return elapsedSeconds < ROLEPLAY_PART_SECONDS
    ? { kind: 'roleplay', questionIndex: 0, endsAtSeconds: ROLEPLAY_PART_SECONDS }
    : { kind: 'reflection', questionIndex: 1, endsAtSeconds: ROLEPLAY_PART_SECONDS * 2 }
}
