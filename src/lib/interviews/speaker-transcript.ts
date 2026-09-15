export type DiarizedSegment = { speaker: string; text: string; start: number; end: number }

export function isDiarizedTranscript(value: unknown): value is { segments: DiarizedSegment[] } {
  if (!value || typeof value !== 'object' || !('segments' in value) || !Array.isArray(value.segments) || !value.segments.length || value.segments.length > 10_000) return false
  return value.segments.every(segment => !!segment && typeof segment === 'object'
    && typeof segment.speaker === 'string' && segment.speaker.length > 0 && segment.speaker.length <= 100
    && typeof segment.text === 'string'
    && typeof segment.start === 'number' && Number.isFinite(segment.start) && segment.start >= 0
    && typeof segment.end === 'number' && Number.isFinite(segment.end) && segment.end >= segment.start)
}

export function formatSpeakerTranscript(segments: DiarizedSegment[]) {
  const names = new Map<string, string>()
  return segments.flatMap(segment => {
    const text = segment.text.trim()
    if (!text) return []
    if (!names.has(segment.speaker)) names.set(segment.speaker, `Speaker ${names.size + 1}`)
    return `[${timestamp(segment.start)}] ${names.get(segment.speaker)}: ${text}`
  }).join('\n\n')
}

function timestamp(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const remainder = rounded % 60
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${minutes}:${String(remainder).padStart(2, '0')}`
}
