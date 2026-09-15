'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wordmark } from '@/components/ui/wordmark'
import { isStudyWorkspace } from '@/lib/workspace/routes'
import { WorkspaceWelcome } from './workspace-welcome'
import styles from './workspace.module.css'
import motion from './entry-motion.module.css'

export function WorkspaceFrame({ children, navigation, examSwitcher, originalHeader, name, preview = false, welcomeOnEntry, examKey }: {
  children: ReactNode; navigation: ReactNode; examSwitcher: ReactNode; originalHeader?: ReactNode; name: string; preview?: boolean; welcomeOnEntry?: boolean; examKey?: string
}) {
  const pathname = usePathname()
  const showWelcome = welcomeOnEntry ?? !preview
  const isExamEntry = pathname === '/app' || pathname === '/prototypes/workspace-entry'
  if (!preview && !isStudyWorkspace(pathname)) return <>{originalHeader}<main className="flex-1">{children}</main></>
  return <div className={styles.workspace} data-study-workspace>
    {showWelcome ? <WorkspaceWelcome name={name} /> : null}
    {isExamEntry ? (
      <main id="study-content" className={styles.entryMain}>
        <div className={motion.enter}>{children}</div>
      </main>
    ) : <>
      <a className={styles.skip} href="#study-content">Skip to content</a>
      <aside className={styles.sidebar}>
        <Link href={preview ? '/prototypes/workspace' : '/app'} className={styles.logo} aria-label="Studocyte — choose your exam"><Wordmark variant="clean" markSize={28} endorsement className="text-xl" /></Link>
        <p className={styles.navLabel}>Your workspace</p>
        <div className={styles.navigation}>{navigation}</div>
      </aside>
      <div className={styles.main}>
        <header className={styles.toolbar}>
          <div className={styles.switcher}>{examSwitcher}</div>
          <div className={styles.toolbarRight}><span>{preview ? 'Design preview · example data' : 'Your study space'}</span><Link href={preview ? '/prototypes/workspace?view=account' : '/account'} className={styles.avatar} aria-label={`${name}'s account`}>{name.slice(0, 1).toUpperCase()}</Link></div>
        </header>
        <div id="study-content" tabIndex={-1} className={styles.content}><div key={`${pathname}:${examKey ?? ''}`} className={preview || ['/dashboard', '/interviews'].includes(pathname) ? motion.enter : undefined}>{children}</div></div>
      </div>
    </>}
  </div>
}
