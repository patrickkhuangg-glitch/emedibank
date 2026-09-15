// Mock-exam definitions. Every form uses an explicit, fixed question assignment
// so all students receive the same questions in the same order.
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
  assignmentKey: string
  name: string
  free: boolean // free mocks are the free tier's headline feature; premium mocks need entitlement
  kind: 'mini' | 'full'
  sections: MockSection[]
}

export const UCAT_SECTIONS: MockSection[] = [
  { subtestSlug: 'verbal-reasoning', name: 'Verbal Reasoning', count: 44, minutes: 22 },
  { subtestSlug: 'decision-making', name: 'Decision Making', count: 35, minutes: 37 },
  { subtestSlug: 'quantitative-reasoning', name: 'Quantitative Reasoning', count: 36, minutes: 26 },
  { subtestSlug: 'situational-judgement', name: 'Situational Judgement', count: 69, minutes: 26 },
]

export const MINI_MOCKS_PER_SECTION = 4

export function miniMocksPerSection(subtestSlug: string): number {
  return subtestSlug === 'quantitative-reasoning' ? 8 : MINI_MOCKS_PER_SECTION
}

/** Override a fixed form only after difficulty review. Unreviewed forms require
 * 36/36; a harder form can explicitly be set to 35. Never chosen by a student.
 */
export const QR_TOP_SCORE_BY_FORM: Record<string, 35 | 36> = {
  'practice-test-1': 36,
  'practice-test-2': 36,
  'practice-test-3': 36,
  'practice-test-4': 36,
  'mini-quantitative-reasoning-1': 36,
  'mini-quantitative-reasoning-2': 36,
  'mini-quantitative-reasoning-3': 36,
  'mini-quantitative-reasoning-4': 36,
  'mini-quantitative-reasoning-5': 36,
  'mini-quantitative-reasoning-6': 36,
  'mini-quantitative-reasoning-7': 36,
  'mini-quantitative-reasoning-8': 36,
}

/** UCAT runner titles identify the platform, form and (for minis) section. */
export function ucatMockTitle(mock: MockDef): string {
  const number = mock.id.match(/(\d+)$/)?.[1]
  const suffix = number ? ` #${number}` : ''
  if (mock.id === 'diagnostic') return 'Studocyte UCAT Diagnostic Mock Exam'
  if (mock.kind === 'full') return `Studocyte UCAT Mock${suffix}`
  const section = mock.sections[0]
  const abbreviations: Record<string, string> = {
    'verbal-reasoning': 'VR',
    'decision-making': 'DM',
    'quantitative-reasoning': 'QR',
    'situational-judgement': 'SJT',
  }
  return `Studocyte Mini ${abbreviations[section?.subtestSlug] ?? section?.name ?? 'UCAT'} Mock${suffix}`
}

export const MOCK_EXAMS: Record<string, MockDef[]> = {
  ucat: [
    { id: 'diagnostic', assignmentKey: 'diagnostic-1', name: 'Diagnostic Mock Exam', free: true, kind: 'full', sections: UCAT_SECTIONS },
    { id: 'practice-test-1', assignmentKey: 'practice-test-1', name: 'Practice Test 1', free: true, kind: 'full', sections: UCAT_SECTIONS },
    { id: 'practice-test-2', assignmentKey: 'practice-test-2', name: 'Practice Test 2', free: true, kind: 'full', sections: UCAT_SECTIONS },
    { id: 'practice-test-3', assignmentKey: 'practice-test-3', name: 'Practice Test 3', free: false, kind: 'full', sections: UCAT_SECTIONS },
    { id: 'practice-test-4', assignmentKey: 'practice-test-4', name: 'Practice Test 4', free: false, kind: 'full', sections: UCAT_SECTIONS },
  ],
}

export function mocksForExam(examSlug: string): MockDef[] {
  return MOCK_EXAMS[examSlug] ?? []
}

export function findMock(examSlug: string, mockId: string): MockDef | null {
  const normalized = mockId.replace(/^mock-(\d+)$/, 'practice-test-$1')
  return mocksForExam(examSlug).find((m) => m.id === normalized) ?? null
}

export function miniSection(examSlug: string, subtestSlug: string): MockSection | null {
  if (examSlug !== 'ucat') return null
  return UCAT_SECTIONS.find((section) => section.subtestSlug === subtestSlug) ?? null
}

export function findMiniMock(examSlug: string, subtestSlug: string, mockId: string): MockDef | null {
  const section = miniSection(examSlug, subtestSlug)
  const match = mockId.match(/^mini-(\d+)$/)
  if (!section || !match) return null
  const number = Number(match[1])
  if (number < 1 || number > miniMocksPerSection(subtestSlug)) return null
  return { id: mockId, assignmentKey: `mini-${subtestSlug}-${number}`, name: `${section.name} Mini Mock ${number}`, free: false, kind: 'mini', sections: [section] }
}
