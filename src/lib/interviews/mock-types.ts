import type { InterviewFormat } from './stations'
export type MockMode = 'individual' | 'full'
export type MockSelection = { format: InterviewFormat; mode: MockMode; selectionId?: string }
export type MockOption = { id: string; format: InterviewFormat; label: string }
export type MockStep = { stationId: string; questionIndex: number; preparationSeconds: number; responseSeconds: number }
export type MockTicket = { version: 1; id: string; userId: string; startedAt: number; format: InterviewFormat; mode: MockMode; steps: MockStep[] }
export type MockView = {
 id: string; format: InterviewFormat; mode: MockMode; index: number; total: number;
 phase: 'preparation' | 'response' | 'complete'; serverNow: number; startedAt: number;
 phaseEndsAt: number; endsAt: number; title: string; preparation: string; questions: string[];
}
