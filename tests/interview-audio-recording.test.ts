import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AUDIO_CAPTURE_CONSTRAINTS, audioRecordingType, prepareAudioRecording } from '../src/lib/interviews/audio-recording'

test('practice requests microphone only and chooses supported WebM or MP4 audio', () => {
  assert.equal(AUDIO_CAPTURE_CONSTRAINTS.video, false)
  assert.ok(AUDIO_CAPTURE_CONSTRAINTS.audio)
  assert.equal(audioRecordingType(type => type.includes('webm')), 'audio/webm;codecs=opus')
  assert.equal(audioRecordingType(type => type === 'audio/mp4'), 'audio/mp4')
  assert.throws(() => audioRecordingType(() => false), /cannot record/)
})

test('preparation records nothing, response stop is idempotent, and tracks are released', async () => {
  const original = globalThis.MediaRecorder
  let starts = 0, stops = 0, released = 0
  class Recorder {
    static isTypeSupported() { return true }
    mimeType = 'audio/webm;codecs=opus'; state = 'inactive'
    ondataavailable: ((e: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    start() { starts++; this.state = 'recording' }
    stop() { stops++; this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['synthetic speech']) }); this.onstop?.() }
  }
  globalThis.MediaRecorder = Recorder as unknown as typeof MediaRecorder
  const stream = { getTracks: () => [{ stop: () => { released++ } }] } as unknown as MediaStream
  try {
    const prep = prepareAudioRecording(stream, () => assert.fail('unexpected recorder error'))
    assert.equal(starts, 0); assert.equal(await prep.stop(), null); assert.equal(stops, 0); assert.equal(released, 1)
    const response = prepareAudioRecording(stream, () => assert.fail('unexpected recorder error'))
    response.start(); const first = response.stop(), second = response.stop()
    assert.equal(first, second); assert.equal(starts, 1); assert.equal(stops, 1)
    const audio = await first; assert.equal(await audio!.text(), 'synthetic speech'); assert.equal(audio!.type, 'audio/webm;codecs=opus')
    assert.equal(released, 2)
  } finally { globalThis.MediaRecorder = original }
})
