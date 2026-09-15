import 'server-only'
export function interviewVideoEnabled() { return process.env.INTERVIEW_VIDEO_MARKING_ENABLED === 'true' }

// Enable only after panel calibration and migration 0048; existing queued jobs can finish when disabled.
export function wholePanelMarkingEnabled(){return process.env.INTERVIEW_WHOLE_PANEL_MARKING_ENABLED==='true'}
