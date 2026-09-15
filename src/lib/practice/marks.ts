const DM_TWO_MARK_TAGS = new Set([
  'Syllogisms',
  'Interpreting Information',
  // Preserve the value of content authored under the earlier taxonomy.
  'Inference (text-based)',
  'Inference (data-based)',
])

/** Maximum marks awarded by one question item. */
export function questionMarkValue(subtestSlug: string, tags: string[] | null | undefined): number {
  if (subtestSlug === 'decision-making' && (tags ?? []).some((tag) => DM_TWO_MARK_TAGS.has(tag))) return 2
  return 1
}

/** Five-statement DM grids award 2 for 5/5 and 1 for 4/5. */
export function gridMarkValue(subtestSlug: string, tags: string[] | null | undefined, correct: number, total: number): number {
  if (!Number.isInteger(total) || total <= 0 || !Number.isInteger(correct) || correct < 0 || correct > total) return 0
  if (subtestSlug === 'decision-making' && total === 5) return correct === 5 ? 2 : correct === 4 ? 1 : 0
  return correct === total ? questionMarkValue(subtestSlug, tags) : 0
}
