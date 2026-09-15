/** Public one-off Interview catalogue. Keep separate from recurring academic plans. */
export const INTERVIEW_MARKETING = {
  route: '/interview-preparation',
  startHref: '/interviews',
  programsHref: 'https://emeducate.com.au/programs/interview',
  paidPlansAvailable: true,
  fullAnalyticsAvailable: false,
  durationMonths: 12,
  accessLabel: '1 year',
  trial: { days: 7, mmiStations: 15, panelThemes: 32, mocks: 2, transcriptMinutes: 60, credits: 2 },
  counts: { mmi: 208, panelThemes: 32, stories: 104 },
  creditCosts: { panel: 12, mmi: 2, mock: 12 },
  plans: [
    { id: 'core', kind: 'plan', lookupKey: 'studocyte_interview_core_aud_2026', name: 'Interview Core', price: 199, credits: 6, accessDays: 365, description: 'Build a steady practice routine, with feedback at the points that matter.', featured: false },
    { id: 'pro', kind: 'plan', lookupKey: 'studocyte_interview_pro_aud_2026', name: 'Interview Pro', price: 349, credits: 18, accessDays: 365, description: 'Combine regular practice with a full reviewed mock and individual feedback.', featured: true },
    { id: 'intensive', kind: 'plan', lookupKey: 'studocyte_interview_intensive_aud_2026', name: 'Interview Intensive', price: 599, credits: 36, accessDays: 365, description: 'Return to expert feedback as you work through your interview preparation.', featured: false },
  ],
  extras: [
    { id: 'credits-6', kind: 'credits', lookupKey: 'studocyte_interview_credits_6_aud_2026', name: '6 review credits', credits: 6, price: 99, accessDays: 0 },
    { id: 'credits-12', kind: 'credits', lookupKey: 'studocyte_interview_credits_12_aud_2026', name: '12 review credits', credits: 12, price: 189, accessDays: 0 },
    { id: 'credits-24', kind: 'credits', lookupKey: 'studocyte_interview_credits_24_aud_2026', name: '24 review credits', credits: 24, price: 359, accessDays: 0 },
  ],
  complete: {
    name: 'EMeducate Interview Complete', price: 1299, credits: 36, tutoringHours: 2,
    // Date-limited founding release. No quantity claim without a connected sales count.
    founding: { enabled: true, price: 999, allocation: null as number | null, sold: 0, closesAt: '2026-10-09T00:00:00+11:00' as string | null, availabilityVerifiedAt: null as string | null },
  },
} as const

export type InterviewOffer = (typeof INTERVIEW_MARKETING.plans)[number] | (typeof INTERVIEW_MARKETING.extras)[number]

export function interviewOfferById(id: string): InterviewOffer | null {
  return [...INTERVIEW_MARKETING.plans, ...INTERVIEW_MARKETING.extras].find((offer) => offer.id === id) ?? null
}

export type FoundingOffer = { enabled: boolean; allocation: number | null; sold: number; closesAt: string | null; availabilityVerifiedAt: string | null }
export function foundingOfferAvailable(offer: FoundingOffer, now = Date.now()) {
  const closes = offer.closesAt ? Date.parse(offer.closesAt) : NaN
  if (!offer.enabled || !Number.isFinite(closes) || closes <= now) return false
  // A date-only promotion expires without needing an inventory service.
  if (offer.allocation === null) return true
  const verified = offer.availabilityVerifiedAt ? Date.parse(offer.availabilityVerifiedAt) : NaN
  return Number.isInteger(offer.allocation) && Number.isInteger(offer.sold) && offer.sold >= 0 && offer.allocation > offer.sold
    && Number.isFinite(verified) && verified <= now && now - verified < 5 * 60_000
}
export function aud(value: number) { return `A$${value.toLocaleString('en-AU')}` }
export function reviewAllowance(credits: number) {
  return { mmi: Math.floor(credits / INTERVIEW_MARKETING.creditCosts.mmi), panel: Math.floor(credits / INTERVIEW_MARKETING.creditCosts.panel), mocks: Math.floor(credits / INTERVIEW_MARKETING.creditCosts.mock), remainder: credits % INTERVIEW_MARKETING.creditCosts.mock }
}

export const INTERVIEW_FAQS = [
  ['Is my feedback reviewed by a real person?', 'Yes. A trained EMeducate interview tutor reviews your response and approves every score and comment before it is released. Automated drafts are never released directly to students.'],
  ['Who are the reviewers?', 'EMeducate interview tutors review responses using the interview assessment framework. Your released report identifies the reviewer.'],
  ['How quickly will I receive feedback?', 'Our target is two working days, excluding weekends. If your review is overdue, contact support@emeducate.com.au.'],
  ['Does recording use marking credits?', 'No. Recording, playback, transcription and self-review do not use marking credits. Credits are used when you submit for tutor review. The free trial includes 60 minutes of transcription.'],
  ['How many credits does marking cost?', 'An individual MMI station uses 2 credits. A full MMI or panel mock uses 12 credits. Panel responses are marked together as one interview, with at least two saved responses required for marking.'],
  ['Can I add more credits?', 'Yes. Paid accounts can add 6, 12 or 24 review credits without buying another year of access.'],
  ['What can I try for free?', 'Seven days of practice, 15 selected MMI stations, one panel question from each of 32 themes, 104 story prompts, one MMI mock and one panel mock, 60 minutes of transcription and 2 marking credits. Use those credits for one MMI review. No card is required. The trial starts when you first practise, not when you visit this page.'],
  ['Are tutoring and live mocks included?', 'Standard Studocyte plans cover independent practice and reviewed feedback. Live mock interviews and private tutoring are delivered separately by EMeducate. Interview Complete combines one year of Studocyte, 36 review credits, two hours of tutoring and one live mock with a debrief.'],
  ['Is Studocyte university-specific?', 'Studocyte covers the major MMI and panel themes used across Australian medical and dental interviews. Formats can change: always confirm current timing and requirements directly with your university.'],
  ['Do the Interview plans renew automatically?', 'No. Core, Pro and Intensive are one-off purchases for one year of Interview access. They do not renew automatically. Existing academic subscriptions have their own terms.'],
  ['How long are recordings kept?', 'Audio and video are normally deleted seven days after saving. Download anything you want to keep. Recordings awaiting marking are protected until review is complete. Transcripts and released feedback remain available under the account-retention policy.'],
] as const
