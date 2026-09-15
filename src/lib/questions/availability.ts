/** Missing flags are legacy practice content. Mock-only content is served only
 * through the signed mock manifest, never through a practice question id. */
export const PRACTICE_QUESTION_FILTER = 'data->>mock_only.is.null,data->>mock_only.neq.true'

export function isMockOnly(data: unknown): boolean {
  if (!data || typeof data !== 'object' || !('mock_only' in data)) return false
  return data.mock_only === true || data.mock_only === 'true'
}
