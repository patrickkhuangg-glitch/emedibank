/** Provisional reference conversion, observed 9 September 2026.
 * Source: https://www.theukcatpeople.co.uk/application-guide/ucat/ucat-score-calculator
 * These are third-party estimates, not UCAT equating or Studocyte cohort norms.
 */
export const UCAT_SCORE_VERSION = 'studocyte-estimate-2026-09-09-v2'
export type QrTopScoreRaw = 35 | 36
export const UCAT_SCORE_SOURCE = 'https://www.theukcatpeople.co.uk/application-guide/ucat/ucat-score-calculator'
export const COGNITIVE_SECTIONS = ['verbal-reasoning', 'decision-making', 'quantitative-reasoning'] as const
export type CognitiveSection = typeof COGNITIVE_SECTIONS[number]
export type UcatSection = CognitiveSection | 'situational-judgement'

// Indexed by whole raw mark. Keeping the plateaus reproduces the reference calculator.
const TABLES: Record<CognitiveSection, readonly number[]> = {
  'verbal-reasoning': [300,330,330,330,330,330,330,350,350,380,400,400,430,450,450,480,500,500,530,550,550,580,600,600,630,630,650,650,680,680,700,730,730,730,750,780,800,830,830,850,880,900,900,900,900],
  'decision-making': [300,330,330,330,330,330,350,380,400,430,450,480,500,500,530,550,580,600,600,630,650,650,680,700,700,730,750,750,780,800,800,830,850,880,880,900],
  'quantitative-reasoning': [300,330,330,330,350,380,380,400,400,430,430,450,450,480,480,500,500,530,550,580,600,630,650,680,680,700,730,750,780,800,830,850,850,900,900,900,900],
}

export function isCognitiveSection(value: string): value is CognitiveSection {
  return COGNITIVE_SECTIONS.some(section => section === value)
}

export function validateRawMarks(raw: number, maximum: number, allowHalfMarks = false) {
  if (!Number.isInteger(maximum) || maximum <= 0 || !Number.isFinite(raw) || raw < 0 || raw > maximum || !Number.isInteger(raw * (allowHalfMarks ? 2 : 1))) {
    throw new RangeError('Raw marks must be within the available marks and use valid mark increments.')
  }
}

/** DM defaults to earned marks /47, not fully correct questions /35.
 * Normalising to /35 and rounding reproduces all 48 observed partial-mode outputs.
 * A different maximum is an explicit length-adjusted approximation, not calibration.
 */
export function referenceCognitiveScore(section: CognitiveSection, raw: number, maximum?: number): number {
  if (!isCognitiveSection(section)) throw new RangeError('Unknown cognitive section.')
  const table = TABLES[section]
  const max = maximum ?? (section === 'decision-making' ? 47 : table.length - 1)
  validateRawMarks(raw, max)
  return table[Math.round(raw / max * (table.length - 1))]
}

/** Studocyte QR override: only 36/36 reaches 900 by default; a reviewed harder
 * form may use 35/36. Preserve the reference through 32/36 = 850, then interpolate
 * to the selected endpoint. This is an editorial estimate, not official equating.
 */
export function estimateCognitiveScore(section: CognitiveSection, raw: number, maximum?: number, qrTopScoreRaw: QrTopScoreRaw = 36): number {
  const reference = referenceCognitiveScore(section, raw, maximum)
  if (section !== 'quantitative-reasoning') return reference
  if (qrTopScoreRaw !== 35 && qrTopScoreRaw !== 36) throw new RangeError('QR 900 requires a threshold of 35 or 36 out of 36.')
  const equivalent = raw / (maximum ?? 36) * 36
  if (equivalent >= qrTopScoreRaw) return 900
  if (equivalent <= 32) return reference
  // Do not allow rounding just below the threshold to award 900 on short forms.
  return Math.min(890, Math.round((850 + 50 * (equivalent - 32) / (qrTopScoreRaw - 32)) / 10) * 10)
}

export function decisionMakingMarks(oneMarkCorrect: number, twoMarkCorrect: number, partiallyCorrect: number): number {
  validateRawMarks(oneMarkCorrect, 23)
  validateRawMarks(twoMarkCorrect, 12)
  validateRawMarks(partiallyCorrect, 12)
  if (twoMarkCorrect + partiallyCorrect > 12) throw new RangeError('Fully and partially correct two-mark questions cannot total more than 12.')
  return oneMarkCorrect + 2 * twoMarkCorrect + partiallyCorrect
}

/** UK band estimate only. Half marks extend the reference's percentage thresholds. */
export function estimateSjtBand(raw: number, maximum = 69): 1 | 2 | 3 | 4 {
  validateRawMarks(raw, maximum, true)
  const proportion = raw / maximum
  return proportion >= 0.8 ? 1 : proportion >= 0.65 ? 2 : proportion >= 0.5 ? 3 : 4
}

/** User-selected ANZ placeholder: percentage mapped linearly to 300–900.
 * This is NOT supplied by the reference calculator or an official ANZ conversion.
 */
export function estimateAnzSjtScore(raw: number, maximum = 69): number {
  validateRawMarks(raw, maximum, true)
  return Math.round((300 + 600 * raw / maximum) / 10) * 10
}

/** No total until all three sections are present; SJT is always separate. */
export function cognitiveTotal(scores: Partial<Record<CognitiveSection, number | null>>): number | null {
  const values = COGNITIVE_SECTIONS.map(section => scores[section])
  if (values.some(value => value == null)) return null
  if (values.some(value => !Number.isInteger(value) || value! < 300 || value! > 900)) throw new RangeError('Scaled scores must be between 300 and 900.')
  return values.reduce<number>((sum, value) => sum + value!, 0)
}

export function summariseMarks(items: { maximum: number; score: number | null; answered: boolean; correct: boolean }[]) {
  let raw = 0, maximum = 0, correct = 0
  let complete = items.length > 0
  for (const item of items) {
    if (!Number.isInteger(item.maximum) || item.maximum <= 0) { complete = false; continue }
    maximum += item.maximum
    if (item.answered && item.score == null) { complete = false; continue }
    const score = item.score ?? 0
    try { validateRawMarks(score, item.maximum, true) } catch { complete = false; continue }
    raw += score
    if (item.correct) correct++
  }
  return { raw, maximum, correct, total: items.length, complete }
}
