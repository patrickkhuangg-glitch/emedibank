import Link from 'next/link'
import type { ReactNode } from 'react'
import { Wordmark } from '@/components/ui/wordmark'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center" aria-label="Studocyte home">
          <Wordmark className="text-2xl" />
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
