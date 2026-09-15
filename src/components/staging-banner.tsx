export function StagingBanner() {
  return (
    <aside
      aria-label="Staging environment"
      className="relative z-[110] flex min-h-8 items-center justify-center gap-2 bg-ink px-4 py-1.5 text-center text-xs font-semibold text-ink-foreground"
    >
      <span className="rounded-full bg-brand px-2.5 py-0.5 text-white">Staging</span>
      <span>Test data and test actions only</span>
    </aside>
  )
}
