'use client'
import { type ReactNode } from 'react'
import { CinematicPage } from '@/components/marketing/cinematic-page'
import styles from '@/app/(marketing)/home.module.css'

export function HomeMotion({ children }: { children: ReactNode }) {
  return <CinematicPage className={styles.page}>{children}</CinematicPage>
}
