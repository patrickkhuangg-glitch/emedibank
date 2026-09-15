export const VIDEO_LIMIT = 150 * 1024 * 1024
export const AUDIO_LIMIT = 24 * 1024 * 1024
export type QuestionEvent = { question_index: number; offset_seconds: number }
export function baseMime(mime: string) { return mime.split(';')[0].trim().toLowerCase() }
export function mediaExtension(mime: string, kind: 'video' | 'audio') {
 const type = baseMime(mime)
 const accepted = kind === 'video' ? ['video/webm','video/mp4'] : ['audio/webm','audio/mp4','audio/mpeg']
 if (!accepted.includes(type)) throw new Error('Unsupported recording format.')
 return type.endsWith('mpeg') ? 'mp3' : type.split('/')[1]
}
export function validateMedia(mime:string, size:number, kind:'video'|'audio') {
 mediaExtension(mime,kind)
 if (!Number.isFinite(size) || size<=0 || size>(kind==='video'?VIDEO_LIMIT:AUDIO_LIMIT)) throw new Error('Recording size is outside the supported limit.')
}
