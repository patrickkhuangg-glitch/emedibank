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
