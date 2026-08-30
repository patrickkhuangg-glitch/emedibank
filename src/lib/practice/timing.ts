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
