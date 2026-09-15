import { validateMMIFeedback, type MMIFeedback } from './mmi-feedback'
import { MMI_DOMAINS } from './mmi-rubric-v2'

export type MMIReviewIssue = { target: string; label: string }
/** Form guidance only. The existing server validation and human approval remain authoritative. */
export function mmiReviewIssues(value: MMIFeedback): MMIReviewIssue[] {
 const issues: MMIReviewIssue[] = []
 const missing = (text: string, target: string, label: string) => { if (!text.trim()) issues.push({ target, label }) }
 missing(value.global.reason, 'mmi-global-reason', 'Explain the overall score or why it is unscored.')
 for (const domain of value.domains) {
  const name = MMI_DOMAINS[domain.key].label
  missing(domain.rationale, domain.status === 'not_applicable' ? 'mmi-detailed-editor' : `mmi-rationale-${domain.key}`, `${name}: add the scoring basis.`)
  if (domain.status === 'insufficient_evidence') missing(domain.needed_evidence, `mmi-needed-${domain.key}`, `${name}: tell the student what evidence is missing.`)
  if (domain.status === 'scored') missing(domain.improvement, 'mmi-detailed-editor', `${name}: add the advice supporting this score.`)
 }
 for (const field of ['strengths', 'priorities'] as const) value[field].forEach((point, index) => {
  missing(point.text, `mmi-${field}-${index}`, `${field === 'strengths' ? 'Strength' : 'Improvement'} ${index + 1}: write the student feedback or remove this point.`)
 })
 missing(value.closing.verdict, 'mmi-overall-feedback', 'Write the overall feedback, starting with encouragement.')
 missing(value.closing.successful_improvement, 'mmi-next-step', 'Explain what successful improvement looks like.')
 for (const concern of value.concerns) {
  missing(concern.description, 'mmi-detailed-editor', 'Describe the supported concern that the student will see.')
  missing(concern.consequence, 'mmi-detailed-editor', 'Explain why the supported concern matters.')
 }
 // Catch evidence, quotation, scope and schema errors without duplicating their validation here.
 if (!issues.length) try { validateMMIFeedback(value) } catch { issues.push({ target: 'mmi-detailed-editor', label: 'Check the detailed marks and evidence: the draft does not yet pass the feedback checks.' }) }
 return issues
}
