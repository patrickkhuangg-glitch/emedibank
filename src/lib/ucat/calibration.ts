import { validateRawMarks, type UcatSection } from './scoring'

// An operational review floor, not a claim that 500 attempts prove validity.
export const CALIBRATION_REVIEW_MINIMUM = 500
export type CalibrationIdentity = {
  /** Immutable version covering questions, answer keys, marks and ordering. */
  formVersion: string
  section: UcatSection
  maximum: number
  /** Keep standard timing and each accommodation in separate cohorts. */
  timingProfile: string
  qrTopScoreRaw?: 35 | 36
}
export type CalibrationAttempt = CalibrationIdentity & {
  userId: string
  raw: number
  attemptNumber: number
  submitted: boolean
  timed: boolean
  preview: boolean
  priorQuestionExposure: boolean
  voided: boolean
}
export type CalibrationModel = CalibrationIdentity & {
  version: string
  status: 'draft' | 'approved'
  sampleSize: number
  mean: number
  standardDeviation: number
  approvedAt?: string
  validationReportId?: string
}

function sameForm(a: CalibrationIdentity, b: CalibrationIdentity) {
  return a.formVersion === b.formVersion && a.section === b.section && a.maximum === b.maximum && a.timingProfile === b.timingProfile && (a.qrTopScoreRaw ?? 36) === (b.qrTopScoreRaw ?? 36)
}

/** Produces a review candidate only. Submission includes timer expiry and unanswered
 * questions; dropping low/unanswered results would bias the cohort upwards.
 * Call with server-verified attempt data, never browser-provided score claims.
 */
export function buildCalibrationDraft(identity: CalibrationIdentity, version: string, attempts: readonly CalibrationAttempt[]): CalibrationModel {
  validateRawMarks(0, identity.maximum)
  if (identity.qrTopScoreRaw != null && identity.qrTopScoreRaw !== 35 && identity.qrTopScoreRaw !== 36) throw new Error('Invalid QR top-score threshold.')
  if (!identity.formVersion || !identity.timingProfile || !version) throw new Error('Versioned form and timing are required.')
  const eligible = attempts.filter(a => sameForm(a, identity) && a.submitted && a.timed && !a.preview && !a.voided && !a.priorQuestionExposure && a.attemptNumber === 1 && a.userId)
  const seen = new Set<string>()
  const values: number[] = []
  for (const attempt of eligible) {
    if (seen.has(attempt.userId)) throw new Error('Duplicate first attempt: resolve the records before calibration.')
    seen.add(attempt.userId)
    validateRawMarks(attempt.raw, identity.maximum, identity.section === 'situational-judgement')
    values.push(attempt.raw)
  }
  if (values.length < CALIBRATION_REVIEW_MINIMUM) throw new Error(`At least ${CALIBRATION_REVIEW_MINIMUM} eligible unique candidates are required for review.`)
  const mean = values.reduce((sum, raw) => sum + raw, 0) / values.length
  const standardDeviation = Math.sqrt(values.reduce((sum, raw) => sum + (raw - mean) ** 2, 0) / (values.length - 1))
  if (standardDeviation <= 0) throw new Error('The cohort needs a non-zero spread of marks.')
  return { ...identity, version, status: 'draft', sampleSize: values.length, mean, standardDeviation }
}

/** Studocyte cohort scale: 600 + 100z, rounded to tens and bounded at 300–900.
 * Approval follows a separate validation review; reaching N alone never enables it.
 * This is within-form standardisation, NOT cross-form equating or a UCAT prediction.
 */
export function scoreWithCalibration(raw: number, identity: CalibrationIdentity, model: CalibrationModel): number {
  validateRawMarks(raw, identity.maximum, identity.section === 'situational-judgement')
  if (!sameForm(identity, model)) throw new Error('Calibration belongs to a different exam form or timing profile.')
  if (model.status !== 'approved' || !model.approvedAt || !model.validationReportId || !model.version) throw new Error('Calibration must be reviewed and approved before use.')
  if (!Number.isInteger(model.sampleSize) || model.sampleSize < CALIBRATION_REVIEW_MINIMUM || !Number.isFinite(model.mean) || model.mean < 0 || model.mean > model.maximum || !Number.isFinite(model.standardDeviation) || model.standardDeviation <= 0) throw new Error('Invalid calibration statistics.')
  const scaled = 600 + 100 * (raw - model.mean) / model.standardDeviation
  const rounded = Math.min(900, Math.max(300, Math.round(scaled / 10) * 10))
  if (identity.section === 'quantitative-reasoning') {
    const threshold = identity.qrTopScoreRaw ?? 36
    if (threshold !== 35 && threshold !== 36) throw new Error('Invalid QR top-score threshold.')
    return raw / identity.maximum * 36 >= threshold ? 900 : Math.min(890, rounded)
  }
  return rounded
}
