/** Published scaled-score statistics; these do not define raw-mark conversions. */
export const UCAT_ANZ_2026 = {
  year: 2026,
  candidates: 17341,
  source: 'https://www.ucat.edu.au/media/1634/summary-statistics-for-2026.pdf',
  // Deciles in order: 10th, 20th, ... 90th percentile boundaries.
  sections: {
    'verbal-reasoning': { name: 'Verbal Reasoning', maximum: 900, mean: 619, quartiles: [560, 610, 670], deciles: [510, 550, 570, 600, 610, 630, 660, 680, 730] },
    'decision-making': { name: 'Decision Making', maximum: 900, mean: 655, quartiles: [590, 650, 720], deciles: [530, 570, 610, 630, 650, 680, 710, 740, 770] },
    'quantitative-reasoning': { name: 'Quantitative Reasoning', maximum: 900, mean: 691, quartiles: [590, 680, 780], deciles: [530, 580, 610, 640, 680, 710, 760, 820, 880] },
    'total': { name: 'Cognitive total', maximum: 2700, mean: 1964, quartiles: [1760, 1950, 2170], deciles: [1610, 1720, 1800, 1880, 1950, 2040, 2120, 2220, 2340] },
    'situational-judgement': { name: 'Situational Judgement', maximum: 900, mean: 580, quartiles: [539, 589, 630], deciles: [486, 525, 550, 570, 589, 607, 621, 640, 664] },
  },
} as const

export type AnzPercentile = { kind: 'estimate'; value: number } | { kind: 'below'; boundary: 10 } | { kind: 'above'; boundary: 90 }

/** Linear interpolation between published deciles and quartiles. No tail
 * extrapolation: these summary statistics cannot distinguish 91st from 99th.
 */
export function estimateAnzPercentile(section: string, scaledScore: number): AnzPercentile | null {
  if (!Object.hasOwn(UCAT_ANZ_2026.sections, section)) return null
  const row = UCAT_ANZ_2026.sections[section as keyof typeof UCAT_ANZ_2026.sections]
  const minimum = section === 'total' ? 900 : 300
  if (!Number.isFinite(scaledScore) || scaledScore < minimum || scaledScore > row.maximum) return null
  const anchors: { score: number; percentile: number }[] = row.deciles.map((score, i) => ({ score, percentile: (i + 1) * 10 }))
  anchors.push({ score: row.quartiles[0], percentile: 25 }, { score: row.quartiles[2], percentile: 75 })
  anchors.sort((a, b) => a.score - b.score)
  if (scaledScore < anchors[0].score) return { kind: 'below', boundary: 10 }
  if (scaledScore > anchors[anchors.length - 1].score) return { kind: 'above', boundary: 90 }
  for (let i = 0; i < anchors.length; i++) {
    const upper = anchors[i]
    if (scaledScore === upper.score) return { kind: 'estimate', value: upper.percentile }
    if (scaledScore < upper.score) {
      const lower = anchors[i - 1]
      const value = lower.percentile + (scaledScore - lower.score) / (upper.score - lower.score) * (upper.percentile - lower.percentile)
      return { kind: 'estimate', value: Math.round(value) }
    }
  }
  return null
}

export function percentileLabel(percentile: AnzPercentile): string {
  if (percentile.kind === 'below') return 'Below 10th percentile'
  if (percentile.kind === 'above') return 'Above 90th percentile'
  const value = percentile.value
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th'
  return `Approximately ${value}${suffix} percentile`
}
