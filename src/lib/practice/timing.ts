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

/** Full-section question counts. Where set (and a SECTION_MINUTES entry exists),
 *  timed practice is proportioned to that pace and labelled in questions, not
 *  sets — e.g. Situational Judgement is 69 questions in 26 min. */
export const SECTION_QUESTIONS: Record<string, Record<string, number>> = {
  ucat: {
    'situational-judgement': 69,
  },
}

/** Approx questions a timed session of `minutes` covers at the section's real pace,
 *  or null when the section isn't proportioned this way (then sets are shown). */
export function questionsForMinutes(examSlug: string, subtestSlug: string, minutes: number): number | null {
  const total = SECTION_QUESTIONS[examSlug]?.[subtestSlug]
  const mins = SECTION_MINUTES[examSlug]?.[subtestSlug]
  if (!total || !mins) return null
  return Math.max(1, Math.min(total, Math.round(minutes * (total / mins))))
}

/** Short timed presets shown before the full-section option is appended. */
export const TIMED_PRESETS = [5, 10, 15]

/** Per-section timed presets (minutes), where the generic 5/10/15 don't fit the
 *  section's clock. SJT is 26 min, so ~quarter / half / three-quarter of it. */
export const TIMED_PRESETS_BY_SECTION: Record<string, Record<string, number[]>> = {
  ucat: {
    'situational-judgement': [7, 13, 20],
  },
}

export function timedPresets(examSlug: string, subtestSlug: string): number[] {
  return TIMED_PRESETS_BY_SECTION[examSlug]?.[subtestSlug] ?? TIMED_PRESETS
}

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
    // SJT: ~5-question scenarios at the real 69-in-26-min pace (5 × 26/69 ≈ 1.9).
    'situational-judgement': 1.9,
  },
}

export function minutesPerSet(examSlug: string, subtestSlug: string): number {
  return MINUTES_PER_SET[examSlug]?.[subtestSlug] ?? 2
}

/** How many whole sets a timed session of `minutes` should contain for a section. */
export function setsForMinutes(minutes: number, minsPerSet: number): number {
  return Math.max(1, Math.round(minutes / minsPerSet))
}
