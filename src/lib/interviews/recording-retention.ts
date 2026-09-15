import type { InterviewMarkingStatus } from '@/lib/supabase/types'
export const RECORDING_RETENTION_DAYS = 7
export const RECORDING_RETENTION_NOTICE = 'Audio and video are deleted seven days after saving. Download anything you want to keep. Recordings awaiting marking are kept until marking is finished. Your transcript stays in your account.'
type Recording = {recording_expires_at?: string | null; marking_status: InterviewMarkingStatus | null; video_deleted_at: string | null; upload_status: string}
export function markingProtectsRecording(status: InterviewMarkingStatus | null) { return !!status && !['released', 'ungradable'].includes(status) }
export function recordingExpired(a: Recording, now=Date.now()) {
 return !!a.video_deleted_at || (!markingProtectsRecording(a.marking_status) && !!a.recording_expires_at && Date.parse(a.recording_expires_at)<=now)
}
export function recordingAvailable(a: Recording, now=Date.now()) { return a.upload_status==='ready' && !recordingExpired(a,now) }
export function recordingUrlLifetime(a: Recording, now=Date.now()) {
 return markingProtectsRecording(a.marking_status)||!a.recording_expires_at ? 600 : Math.max(1,Math.min(600,Math.floor((Date.parse(a.recording_expires_at)-now)/1000)))
}
