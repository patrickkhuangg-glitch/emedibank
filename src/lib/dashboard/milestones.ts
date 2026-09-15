import type { Dashboard } from './stats'
export type Milestone = { id: string; title: string; detail: string; current: number; target: number; unit: string; reached: boolean; percent: number }
export function dashboardMilestones(data: Pick<Dashboard, 'attempted' | 'totalXp' | 'sections'>): Milestone[] {
  const reachedSections = data.sections.filter(s => s.attempted > 0).length
  const candidates = [
    { id: 'first-steps', title: 'First steps', detail: 'Answer your first 10 questions. Every attempt counts.', current: data.attempted, target: 10, unit: 'answers' },
    { id: 'century', title: 'Century club', detail: 'Build experience with 100 question attempts.', current: data.attempted, target: 100, unit: 'answers' },
    { id: 'explorer', title: 'Branching out', detail: 'Answer questions in two different sections.', current: reachedSections, target: 2, unit: 'sections' },
    { id: 'momentum', title: 'Finding your rhythm', detail: 'Earn 5,000 XP through your regular question practice.', current: data.totalXp, target: 5000, unit: 'XP' },
    { id: 'five-hundred', title: 'Going the distance', detail: 'Build a body of practice with 500 question attempts.', current: data.attempted, target: 500, unit: 'answers' },
    { id: 'ten-thousand', title: 'Steady dedication', detail: 'Reach 10,000 XP through consistent practice.', current: data.totalXp, target: 10000, unit: 'XP' },
  ].filter(m => m.id !== 'explorer' || data.sections.filter(s => s.attempted > 0 || s.slug !== 'written-communication').length >= 2)
  return candidates.map(m => ({ ...m, reached: m.current >= m.target, percent: Math.min(100, Math.max(0, m.current / m.target * 100)) }))
}
