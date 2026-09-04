import Link from 'next/link'

export function InterviewPracticeTabs({ active }: { active: 'stations' | 'review' }) {
  return (
    <nav className="mt-8 flex w-fit items-center rounded-full bg-surface-muted p-1" aria-label="Interview practice">
      <Link
        href="/interviews/practice"
        aria-current={active === 'stations' ? 'page' : undefined}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active === 'stations' ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}
      >
        Stations
      </Link>
      <Link
        href="/interviews/review"
        aria-current={active === 'review' ? 'page' : undefined}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active === 'review' ? 'bg-surface text-foreground eb-soft' : 'text-muted hover:text-foreground'}`}
      >
        Previous attempts
      </Link>
    </nav>
  )
}
