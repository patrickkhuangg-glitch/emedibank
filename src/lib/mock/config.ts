// Mock-exam definitions. A mock is an ordered set of separately-timed sections,
// each drawing a random set of published questions from that subtest's pool.
//
// The per-section question counts and minutes below approximate the current UCAT
// paper — VERIFY them against the official UCAT test specification before launch,
// and edit here. The runner caps each section at the questions actually available,
// so sparse sections still work while the bank fills up.

export type MockSection = {
  subtestSlug: string
  name: string
  count: number // target number of questions; capped at what's published
  minutes: number // section time limit
}

export type MockDef = {
  id: string
  name: string
  free: boolean // free mocks are the free tier's headline feature; premium mocks need entitlement
  sections: MockSection[]
}

const UCAT_SECTIONS: MockSection[] = [
  { subtestSlug: 'verbal-reasoning', name: 'Verbal Reasoning', count: 44, minutes: 21 },
  { subtestSlug: 'decision-making', name: 'Decision Making', count: 35, minutes: 37 },
  { subtestSlug: 'quantitative-reasoning', name: 'Quantitative Reasoning', count: 36, minutes: 26 },
  { subtestSlug: 'situational-judgement', name: 'Situational Judgement', count: 66, minutes: 26 },
]

export const MOCK_EXAMS: Record<string, MockDef[]> = {
  ucat: [
    { id: 'mock-1', name: 'Mock 1', free: true, sections: UCAT_SECTIONS },
    { id: 'mock-2', name: 'Mock 2', free: true, sections: UCAT_SECTIONS },
    { id: 'mock-3', name: 'Mock 3', free: false, sections: UCAT_SECTIONS },
    { id: 'mock-4', name: 'Mock 4', free: false, sections: UCAT_SECTIONS },
  ],
}

export function mocksForExam(examSlug: string): MockDef[] {
  return MOCK_EXAMS[examSlug] ?? []
}

export function findMock(examSlug: string, mockId: string): MockDef | null {
  return mocksForExam(examSlug).find((m) => m.id === mockId) ?? null
}
