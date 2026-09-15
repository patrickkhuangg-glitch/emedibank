type QuestionAssets = { image?: string | null; images?: string[] }

function preloadImages(sources: string[]): Promise<void> {
  return Promise.all(sources.map((src) => new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('A question image could not be loaded'))
    image.src = src
  }))).then(() => undefined)
}

/** Resolve only once every question and diagram in this section is available. */
export async function loadQuestionSection<T extends QuestionAssets>(
  ids: readonly string[],
  fetchQuestions: () => Promise<Record<string, T | null>>,
  loadImages: (sources: string[]) => Promise<void> = preloadImages,
  timeoutMs = 30_000,
): Promise<Record<string, T | null>> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      (async () => {
        const questions = await fetchQuestions()
        if (ids.length === 0 || ids.some((id) => !questions[id])) throw new Error('The section is incomplete')
        const images = new Set(ids.flatMap((id) => {
          const question = questions[id]!
          return [...(question.images ?? []), ...(question.image ? [question.image] : [])]
        }))
        await loadImages([...images])
        return questions
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Question loading timed out')), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timeout)
  }
}
