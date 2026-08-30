import type { ReactNode } from 'react'
import { MarketingHeader } from '@/components/marketing-header'
import { SiteFooter } from '@/components/site-footer'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  )
}
