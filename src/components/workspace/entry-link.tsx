'use client'

import Link, { useLinkStatus } from 'next/link'
import { createPortal } from 'react-dom'
import type { ComponentProps } from 'react'
import { WorkspaceLoading } from './workspace-loading'
import styles from './entry-motion.module.css'

/** The portal avoids fixed-position clipping inside animated marketing sections. */
export function WorkspaceEntryLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<PendingEntry /></Link>
}

function PendingEntry() {
  const { pending } = useLinkStatus()
  return pending ? createPortal(<div className={styles.overlay}><WorkspaceLoading /></div>, document.body) : null
}
