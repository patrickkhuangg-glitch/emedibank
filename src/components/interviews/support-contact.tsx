'use client'

import {usePathname} from 'next/navigation'
import {Container} from '@/components/container'

export function InterviewSupportContact() {
  const pathname = usePathname()
  // Keep navigation and email actions out of timed recording sessions.
  if (pathname.endsWith('/session')) return null
  return (
    <Container className="pb-8 pt-4">
      <aside aria-label="Interview support" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Need a hand?</h2>
          <p className="mt-1 text-sm text-muted">Get help with recordings, transcripts or marking.</p>
          <p className="mt-1 text-sm text-muted">Marking is returned within two working days, excluding weekends. If it’s overdue, contact support.</p>
        </div>
        <a href="mailto:support@emeducate.com.au?subject=Studocyte%20interview%20support" className="eb-press inline-flex min-h-11 items-center rounded-full bg-brand-muted px-5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
          Contact support <span aria-hidden="true" className="ml-2">↗</span>
        </a>
        <p className="w-full text-xs text-muted">You can also email <a className="underline underline-offset-4" href="mailto:support@emeducate.com.au">support@emeducate.com.au</a>. Include the question and roughly when the issue happened.</p>
      </aside>
    </Container>
  )
}
