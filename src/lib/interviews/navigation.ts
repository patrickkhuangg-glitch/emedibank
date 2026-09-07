// Warm authenticated page snapshots in the current browser only. Stories and
// the recording library refresh on entry. Never preload selected media or exams.
export const INTERVIEW_PREFETCH_PATHS=[
 '/interviews',
 '/interviews/practice',
 '/interviews/practice/recordings',
 '/interviews/mock-interviews',
 '/interviews/mock-interviews/review',
 '/interviews/stories',
 '/interviews/resources',
] as const
export function canPrefetchInterviewPage(href:string){return (INTERVIEW_PREFETCH_PATHS as readonly string[]).includes(href)}
