import { validateMedia } from './media-validation'
export const AUDIO_CAPTURE_CONSTRAINTS: MediaStreamConstraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }
export function audioRecordingType(supported: (type: string) => boolean) {
  const type = ['audio/webm;codecs=opus', 'audio/mp4'].find(supported)
  if (!type) throw new Error('This browser cannot record supported audio. Try a current Chrome, Safari or Edge browser.')
  return type
}
// Prepared during microphone setup; start() is called only when preparation ends.
export function prepareAudioRecording(stream: MediaStream, onError: () => void) {
  const recorder = new MediaRecorder(stream, { mimeType: audioRecordingType(type => MediaRecorder.isTypeSupported(type)), audioBitsPerSecond: 64000 })
  const chunks: Blob[] = []
  let started = false, failed = false, stopping: Promise<Blob | null> | null = null, done!: () => void
  const stopped = new Promise<void>(resolve => { done = resolve })
  const release = () => stream.getTracks().forEach(track => track.stop())
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
  recorder.onstop = () => { release(); done() }
  recorder.onerror = () => { failed = true; onError(); release(); done() }
  return {
    start() { recorder.start(1000); started = true },
    stop() {
      if (stopping) return stopping
      stopping = (async () => {
        if (!started) { release(); return null }
        if (recorder.state !== 'inactive') recorder.stop(); else done()
        await stopped
        if (failed) throw new Error('The microphone stopped unexpectedly. Please try again.')
        const blob = new Blob(chunks, { type: recorder.mimeType })
        validateMedia(blob.type, blob.size, 'audio')
        return blob
      })()
      return stopping
    },
    dispose() { if (recorder.state !== 'inactive') recorder.stop(); release(); done() },
  }
}
