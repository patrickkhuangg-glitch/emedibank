// Canonical category taxonomy per exam + section. These give every section a
// full, stable category list on the "Select category" page — so the structure
// is visible before any questions are imported — and they double as the exact
// tag strings to use when authoring/importing questions. A question tagged with
// one of these names lands in that category automatically.
//
// Counts come from the live question bank; a category with nothing published
// yet shows 0 available and can't be started. Any extra tags found on questions
// that aren't listed here are appended after the canonical set, so nothing is
// hidden. Edit these lists to reshape the categories.

export const CATEGORY_TAXONOMY: Record<string, Record<string, string[]>> = {
  ucat: {
    'verbal-reasoning': [
      'Reading Comprehension',
      "True, False, Can't Tell",
    ],
    'decision-making': [
      'Syllogisms',
      'Inference (text-based)',
      'Inference (data-based)',
      'Strongest Argument',
      'Logic Puzzles',
      'Venn Diagrams',
      'Probability',
    ],
    'quantitative-reasoning': [
      'Tables',
      'Diagrams',
      'Complex',
      'Text only',
    ],
    'situational-judgement': [
      'Appropriateness',
      'Importance',
      'Most vs Least Important',
    ],
  },
  gamsat: {
    // Section III subject → topic. One flat level for now; 'Genetics' is the
    // Biology sub-topic seeded first.
    'biological-physical-sciences': [
      'Genetics',
    ],
  },
}

/** Ordered canonical categories for a section, or null if none are defined. */
export function canonicalCategories(examSlug: string, subtestSlug: string): string[] | null {
  return CATEGORY_TAXONOMY[examSlug]?.[subtestSlug] ?? null
}
