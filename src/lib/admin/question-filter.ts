// Shared filter shape for the admin question list. Lives outside the 'use server'
// module so both the page (query) and the bulk actions can use the type.
export type QuestionStatus = 'all' | 'published' | 'draft'

export type QFilter = {
  examId: string | null
  subtestId: string | null
  status: QuestionStatus
  search: string
}

export const PAGE_SIZE = 25
