/** Opt in preparation routes and the focused interview rehearsal experiences. */
export function isStudyWorkspace(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/'
  if (['/app', '/dashboard', '/account', '/bookings', '/study-plan', '/practice', '/mock', '/exams'].includes(path)) return true
  if (/^\/practice\/review\/[^/]+$/.test(path)) return true
  if (/^\/practice\/[^/]+(?:\/[^/]+(?:\/start)?)?$/.test(path)) return true
  if (/^\/mock\/[^/]+$/.test(path) || /^\/mock\/[^/]+\/mini\/[^/]+$/.test(path)) return true
  if (/^\/exams\/[^/]+$/.test(path) || /^\/essays\/[^/]+\/[^/]+$/.test(path)) return true
  if (path === '/interviews/live-practice' || /^\/interviews\/live-practice\/[^/]+$/.test(path)) return true
  return ['/interviews', '/interviews/practice', '/interviews/practice/session', '/interviews/practice/recordings', '/interviews/mock-interviews', '/interviews/mock-interviews/session', '/interviews/mock-interviews/review', '/interviews/review', '/interviews/stories', '/interviews/resources', '/interviews/focus-shop'].includes(path)
}
