import { redirect } from 'next/navigation'

// Preserve bookmarks for recordings created before Mock Interviews had its own section.
export default function InterviewReviewRedirect() {
  redirect('/interviews/mock-interviews/review')
}
