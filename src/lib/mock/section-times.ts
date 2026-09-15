/** Remove time after a section's deadline from the question left open at expiry.
 * This also bounds timing when browsers delay a timer in a background tab. */
export function boundedSectionTimes(ids: string[], times: Record<string, number>, currentId: string, seconds: number) {
  const result = Object.fromEntries(ids.map(id => [id, Math.max(0, Number.isFinite(times[id]) ? times[id] : 0)]))
  let excess = Math.max(0, Object.values(result).reduce((sum, n) => sum + n, 0) - seconds)
  for (const id of [currentId, ...ids.filter(id => id !== currentId).reverse()]) {
    if (!(id in result)) continue
    const remove = Math.min(result[id], excess)
    result[id] -= remove
    excess -= remove
    if (excess <= 0) break
  }
  return result
}
