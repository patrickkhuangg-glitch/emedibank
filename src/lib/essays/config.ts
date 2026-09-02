// Which exam sections are essay-writing sections (no MCQs). These route to the
// essay writer (/essays/...) instead of the category → timing → question runner.
// Client-safe: no server-only imports, so pages and links can both use it.

export const ESSAY_SECTIONS: Record<string, string[]> = {
  gamsat: ['written-communication'],
}

export function isEssaySection(examSlug: string, subtestSlug: string): boolean {
  return ESSAY_SECTIONS[examSlug]?.includes(subtestSlug) ?? false
}

/** Credits a new account starts with (also the profiles column default). */
export const START_CREDITS = 40
/** Credits spent to submit one essay for tutor marking. */
export const MARK_COST = 2

export type EssayQuote = { text: string; author?: string | null }

/** Normalise the jsonb `quotes` column into a typed array (defensive). */
export function parseQuotes(raw: unknown): EssayQuote[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((q) => {
      if (typeof q === 'string') return { text: q }
      if (q && typeof q === 'object' && 'text' in q) {
        const o = q as { text: unknown; author?: unknown }
        if (typeof o.text === 'string') return { text: o.text, author: typeof o.author === 'string' ? o.author : null }
      }
      return null
    })
    .filter((q): q is EssayQuote => q !== null)
}

/** Word count used everywhere (display + storage) so they always agree. */
export function countWords(body: string): number {
  const t = body.trim()
  return t ? t.split(/\s+/).length : 0
}
