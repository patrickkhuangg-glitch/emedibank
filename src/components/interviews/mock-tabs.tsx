import Link from 'next/link'

export function MockInterviewTabs({ active }: { active: 'stations' | 'review' }) {
  return (
    <nav className="mt-8 flex w-fit flex-wrap items-center rounded-3xl bg-surface-muted p-1" aria-label="Mock Interviews">
      <Link
        href="/interviews/mock-interviews"
        prefetch={true}
        aria-current={active === 'stations' ? 'page' : undefined}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active === 'stations' ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}
      >
        New mock interview
      </Link>
      <Link
        href="/interviews/mock-interviews/review"
        prefetch={true}
        aria-current={active === 'review' ? 'page' : undefined}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active === 'review' ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}
      >
        Recordings & feedback
      </Link>
    </nav>
  )
}
