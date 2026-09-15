/** Read every page. Callers must order by a unique, stable column before range(). */
export async function readAllRows<Row>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: Row[] | null
    error: { message: string } | null
  }>,
): Promise<Row[]> {
  const pageSize = 500
  const rows: Row[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}
