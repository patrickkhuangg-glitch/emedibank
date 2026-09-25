// PostgREST caps every response (1,000 rows by default) without any error, so a
// plain select silently truncates large result sets. fetchAllRows pages through
// with .range() until a short page. The query must have a deterministic order.
import 'server-only'

const PAGE_SIZE = 1000

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}
