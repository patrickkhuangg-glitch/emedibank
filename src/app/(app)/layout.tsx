import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'
import { TrialBanner } from '@/components/trial-banner'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <TrialBanner />
      <main className="flex-1">{children}</main>
    </>
  )
}
