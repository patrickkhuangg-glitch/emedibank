'use client'
import Link from 'next/link'
import { CinematicPage } from '@/components/marketing/cinematic-page'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { trackAnalyticsEvent } from '@/components/analytics'
import { INTERVIEW_MARKETING as config, aud, reviewAllowance } from '@/lib/interviews/marketing'
import { startInterviewPurchaseAction } from '@/lib/stripe/interview-actions'
import styles from './landing.module.css'

export function LandingMotion({ children }: { children: ReactNode }) {
  const selectors = [
    `.${styles.split} > *`, `.${styles.reviewSplit} > *`, `.${styles.reviewerSection} > *`,
    `.${styles.featureRow} > *`, `.${styles.credits} > *`, `.${styles.planGrid} > *`,
    `.${styles.sectionHeading}`, `.${styles.reviewIntro}`, `.${styles.pricingHeading}`,
    `.${styles.complete} > *`, `.${styles.faqLayout} > *`, `.${styles.final} > *`,
  ].join(',')
  return <CinematicPage story="interview" className={styles.page} revealSelector={selectors}>{children}</CinematicPage>
}

function track(event: string, parameters: Record<string, string | number> = {}) {
  trackAnalyticsEvent(`interview_${event}`, { surface: 'interview_landing', ...parameters })
}
export function TrackedLink({ href, event, children, className }: { href: string; event: string; children: ReactNode; className?: string }) {
  return <Link href={href} className={className} onClick={() => track(event)}>{children}</Link>
}
export function ObservedSection({ id, event, children, className }: { id: string; event: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { track(event); observer.disconnect() } }, { threshold: 0.12 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [event])
  return <section id={id} ref={ref} className={className}>{children}</section>
}
export function MobileStart() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const hero = document.getElementById('interview-hero')
    if (!hero) return
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom < 0))
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])
  return visible ? <aside className={styles.mobileStart} aria-label="Start your interview trial"><span>7 days · 2 review credits</span><TrackedLink href={config.startHref} event="mobile_free_trial" className={styles.primary}>Start free <Arrow /></TrackedLink></aside> : null
}
export function Arrow({ external = false }: { external?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{external ? <path d="M7 17 17 7M7 7h10v10"/> : <path d="M4 12h15m-6-6 6 6-6 6"/>}</svg>
}
export function Faq({ items, event = 'faq_expansion' }: { items: readonly (readonly [string, string])[]; event?: string }) {
  return <div className={styles.faqs}>{items.map(([question, answer], index) => <details key={question} onToggle={toggle => { if (toggle.currentTarget.open) track(event, { faq: index + 1 }) }}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
}
export function Pricing() {
  const tableScrolled = useRef(false)
  const rows: { label: string; values: string[] }[] = [
    { label: 'Price · one-off', values: [aud(0), ...config.plans.map(p => aud(p.price))] },
    { label: 'Access', values: ['7 days', ...config.plans.map(() => config.accessLabel)] },
    { label: 'MMI stations', values: [`${config.trial.mmiStations} selected`, ...config.plans.map(() => `All ${config.counts.mmi}`)] },
    { label: 'Panel practice', values: ['1 question per theme', 'Complete bank', 'Complete bank', 'Complete bank'] },
    { label: 'Personal-story prompts', values: ['104', '104', '104', '104'] },
    { label: 'Timed individual practice', values: ['Included', 'Included', 'Included', 'Included'] },
    { label: 'Recorded mocks', values: ['1 MMI + 1 panel', 'Unlimited self-review', 'Unlimited self-review', 'Unlimited self-review'] },
    { label: 'Transcription', values: ['60 minutes', 'Included', 'Included', 'Included'] },
    { label: 'Private notes and story bank', values: ['Included', 'Included', 'Included', 'Included'] },
    { label: 'Practice calendar', values: ['Included', 'Included', 'Included', 'Included'] },
    { label: 'Analytics', values: ['Practice activity', 'Full at launch¹', 'Full at launch¹', 'Full at launch¹'] },
    { label: 'Reviewed score trends', values: ['—', 'At launch¹', 'At launch¹', 'At launch¹'] },
    { label: 'Next-practice recommendations', values: ['—', 'At launch¹', 'At launch¹', 'At launch¹'] },
    { label: 'Tutor-review credits', values: [String(config.trial.credits), ...config.plans.map(p => String(p.credits))] },
    { label: 'If used for individual MMI reviews', values: ['Up to 1', ...config.plans.map(p => `Up to ${reviewAllowance(p.credits).mmi}`)] },

    { label: 'If used for complete mock reviews', values: ['—', '—', '1 + 6 credits remaining', 'Up to 3'] },
    { label: 'Feedback target', values: ['2 working days', '2 working days', '2 working days', '2 working days'] },
    { label: 'Extra credits', values: ['After upgrading', 'Available at launch', 'Available at launch', 'Available at launch'] },
    { label: 'Automatic renewal', values: ['No', 'No', 'No', 'No'] },
  ]
  return <>
    <div className={styles.planGrid}>
      <article className={styles.plan}><div><h3>Free</h3><p>Try the complete workflow before paying.</p></div><div className={styles.price}>{aud(0)}<small>7 days · no card required</small></div><ul><li>15 selected MMI stations</li><li>One question from each panel theme</li><li>All 104 story prompts</li><li>One MMI mock + one panel mock</li><li>60 minutes of transcription</li><li><strong>2 tutor-review credits</strong></li></ul><TrackedLink href={config.startHref} event="pricing_free_trial" className={styles.secondary}>Start free <Arrow/></TrackedLink></article>
      {config.plans.map(plan => <article className={`${styles.plan} ${plan.featured ? styles.featured : ''}`} key={plan.id}>{plan.featured && <span className={styles.recommended}>Recommended</span>}<div><h3>{plan.name}</h3><p>{plan.description}</p></div><div className={styles.price}>{aud(plan.price)}<small>One payment · {config.accessLabel}</small></div><ul><li>All {config.counts.mmi} MMI stations</li><li>Complete panel and story banks</li><li>Recording, transcripts and notes</li><li>Full analytics at launch</li><li><strong>{plan.credits} tutor-review credits</strong></li><li>Up to {reviewAllowance(plan.credits).mmi} individual MMI reviews</li><li>{reviewAllowance(plan.credits).mocks ? `${reviewAllowance(plan.credits).mocks} full mock${reviewAllowance(plan.credits).mocks > 1 ? 's' : ''}${reviewAllowance(plan.credits).remainder ? ` + ${reviewAllowance(plan.credits).remainder} credits` : ''}` : 'Use your credits for individual MMI reviews'}</li></ul><form action={startInterviewPurchaseAction} onSubmit={() => track(`${plan.id}_checkout`, { credits: plan.credits, value: plan.price, currency: 'AUD' })}><input type="hidden" name="offerId" value={plan.id}/><button type="submit" className={plan.featured ? styles.primary : styles.secondary}>Choose {plan.name.replace('Interview ', '')} <Arrow/></button></form></article>)}
    </div>
    <p className={styles.note}>One payment gives one year of access. Review examples are alternatives for spending the same credits, not additional allowances.</p>
    <details className={styles.comparison} onToggle={e => { if (e.currentTarget.open) track('pricing_table_interaction', { action: 'expand' }) }}><summary>Compare every inclusion <span aria-hidden="true">+</span></summary><div className={styles.tableScroll} role="region" aria-label="Interview plan comparison; scroll horizontally on a small screen" tabIndex={0} onScroll={() => { if (!tableScrolled.current) { tableScrolled.current = true; track('pricing_table_interaction', { action: 'scroll' }) } }}><table><caption>Free and one-year Interview plans</caption><thead><tr><th scope="col">What’s included</th>{['Free', 'Core', 'Pro', 'Intensive'].map(p => <th scope="col" key={p}>{p}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((v,i) => <td key={i}>{v}</td>)}</tr>)}</tbody></table></div><p className={styles.note}>¹ Reviewed score trends and extended analytics are planned for launch. Current practice calendars and self-ratings are available now.</p></details>
    <div className={styles.extras}><div><h3>Need more expert feedback?</h3><p>Add-ons for paid accounts. One complete reviewed mock uses {config.creditCosts.mock} credits.</p></div><div>{config.extras.map(extra => <form action={startInterviewPurchaseAction} key={extra.credits} onSubmit={() => track('extra_credit_checkout', { credits: extra.credits, value: extra.price, currency: 'AUD' })}><input type="hidden" name="offerId" value={extra.id}/><button type="submit"><b>{extra.credits} credits</b><span>{aud(extra.price)} <Arrow/></span></button></form>)}</div></div>
  </>
}
