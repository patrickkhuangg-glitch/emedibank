import 'server-only'
export function interviewVideoEnabled() { return process.env.INTERVIEW_VIDEO_MARKING_ENABLED === 'true' }
