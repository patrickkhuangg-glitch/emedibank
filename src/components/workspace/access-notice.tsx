'use client'

import Link from 'next/link'
import { useId, useState, type ReactNode } from 'react'
import styles from '@/components/interviews/trial-notice.module.css'

export function AccessNotice({ label, title, summary, pricingHref = '/pricing', children }: {
  label: string; title: string; summary: ReactNode; pricingHref?: string; children: ReactNode
}) {
  const [expanded, setExpanded] = useState(true)
  const contentId = useId()
  function toggle() { setExpanded(value => !value) }
  return <aside className={styles.notice} aria-label={`${title} — access details`}>
    <div className={styles.header}>
      <div><p className={styles.label}>{label}</p><h2 className={styles.title}>{title}</h2></div>
      <div className={styles.headerActions}>
        <Link href={pricingHref} className={styles.subscribe}>Subscribe now <span aria-hidden="true">→</span></Link>
        <button type="button" onClick={toggle} className={styles.toggle} aria-expanded={expanded} aria-controls={contentId}>
          {expanded ? 'Collapse details' : 'Show inclusions'}<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className={expanded ? styles.chevronOpen : undefined}><path d="m4 6 4 4 4-4"/></svg>
        </button>
      </div>
    </div>
    <p className={styles.allowance}>{summary}</p>
    <div id={contentId} hidden={!expanded}>{children}</div>
  </aside>
}
