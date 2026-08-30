import { Container } from '@/components/container'

/** Instant placeholder shown the moment a navigation starts, while the dynamic
 *  page renders on the server. Shape roughly matches the list-style pages. */
export function PageSkeleton({ rows = 4, sidebar = false }: { rows?: number; sidebar?: boolean }) {
  const list = (
    <div className="space-y-3">
      <div className="eb-skeleton h-8 w-52 rounded-lg" />
      <div className="eb-skeleton h-4 w-72 rounded" />
      <div className="mt-6 space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="eb-skeleton h-16 rounded-2xl" style={{ opacity: 1 - i * 0.12 }} />
        ))}
      </div>
    </div>
  )
  return (
    <Container className="py-10">
      {sidebar ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {list}
          <div className="eb-skeleton hidden h-72 rounded-2xl lg:block" />
        </div>
      ) : (
        list
      )}
    </Container>
  )
}
