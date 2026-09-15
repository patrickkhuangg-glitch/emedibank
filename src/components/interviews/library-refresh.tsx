'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

// A prefetched library is a quick preview, not the authority for charging credits.
// Refresh on entry and tab focus; keep the list visible while new data arrives.
export function InterviewLibraryRefresh({ message = 'Updating your recordings and credits…' }: { message?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== 'hidden') {
        startTransition(() => router.refresh())
      }
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [router])

  return <p role="status" className="mt-2 h-5 text-xs text-muted">{pending ? message : ''}</p>
}
