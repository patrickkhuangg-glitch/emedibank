import type { AnzPercentile } from '@/lib/ucat/benchmarks'

export function percentileBand(percentile: AnzPercentile | null): number | undefined {
  if (!percentile) return undefined
  if (percentile.kind === 'below') return 0
  if (percentile.kind === 'above') return 4
  if (!Number.isFinite(percentile.value)) return undefined
  return Math.min(4, Math.max(0, Math.floor(percentile.value / 20)))
}
