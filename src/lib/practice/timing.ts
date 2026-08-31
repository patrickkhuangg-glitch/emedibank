// Timing options for the "Select timing" step.
//
// SECTION_MINUTES is the full-section time limit, offered as the last timed
// preset (e.g. Verbal Reasoning = 22 min). VERIFY these against the current
// official UCAT spec before launch; edit here. (These are the practice presets;
// the mock engine keeps its own timings in src/lib/mock/config.ts.)

export const SECTION_MINUTES: Record<string, Record<string, number>> = {
  ucat: {
    'verbal-reasoning': 22,
    'decision-making': 37,
    'quantitative-reasoning': 26,
    'situational-judgement': 26,
  },
}

export function sectionMinutes(examSlug: string, subtestSlug: string): number | null {
  return SECTION_MINUTES[examSlug]?.[subtestSlug] ?? null
}

/** Short timed presets shown before the full-section option is appended. */
export const TIMED_PRESETS = [5, 10, 15]

/** Set-count choices for untimed practice, capped at what's available. */
export const SET_COUNTS = [1, 2, 3, 4, 5, 10]

// Minutes a single question set is worth, used to size timed practice so the
// clock matches the amount of content. Verbal Reasoning = 2 min per 4-question
// set (the real UCAT pace: 44 questions ≈ 22 min = 11 sets), so a 10-minute
// timed session loads 5 sets, 20 min loads 10, and so on. Default 2 until each
// section's real per-set pace is confirmed.
export const MINUTES_PER_SET: Record<string, Record<string, number>> = {
  ucat: {
    'verbal-reasoning': 2,
    'decision-making': 2,
    'quantitative-reasoning': 2,
    'situational-judgement': 2,
  },
}

export function minutesPerSet(examSlug: string, subtestSlug: string): number {
  return MINUTES_PER_SET[examSlug]?.[subtestSlug] ?? 2
}

/** How many whole sets a timed session of `minutes` should contain for a section. */
export function setsForMinutes(minutes: number, minsPerSet: number): number {
  return Math.max(1, Math.round(minutes / minsPerSet))
}
