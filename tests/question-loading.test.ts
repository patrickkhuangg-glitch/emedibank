import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadQuestionSection } from '../src/lib/practice/load-question-section'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

test('section stays unready until both question data and diagrams finish loading', async () => {
  const data = deferred<Record<string, { images: string[] }>>()
  const images = deferred<void>()
  const imagesStarted = deferred<void>()
  let ready = false
  const loading = loadQuestionSection(['a', 'b'], () => data.promise, async (sources) => {
    assert.deepEqual(sources, ['/shared.svg', '/b.svg'])
    imagesStarted.resolve()
    await images.promise
  }).then(() => { ready = true })
  await Promise.resolve()
  assert.equal(ready, false)
  data.resolve({ a: { images: ['/shared.svg'] }, b: { images: ['/shared.svg', '/b.svg'] } })
  await imagesStarted.promise
  assert.equal(ready, false)
  images.resolve()
  await loading
  assert.equal(ready, true)
})

test('missing questions and failed images reject instead of starting the section', async () => {
  await assert.rejects(loadQuestionSection(['a', 'b'], async () => ({ a: { images: [] }, b: null }), async () => {}), /incomplete/)
  await assert.rejects(loadQuestionSection(['a'], async () => ({ a: { image: '/broken.svg' } }), async () => { throw new Error('image failed') }), /image failed/)
})

test('a stalled request times out and a fresh retry can complete', async () => {
  await assert.rejects(loadQuestionSection(['a'], () => new Promise(() => {}), async () => {}, 5), /timed out/)
  const data = { a: { images: [] } }
  assert.equal(await loadQuestionSection(['a'], async () => data, async () => {}), data)
})

test('each new section waits for its own questions, even if another section loaded earlier', async () => {
  await loadQuestionSection(['first'], async () => ({ first: { images: [] } }), async () => {})
  await assert.rejects(loadQuestionSection(['second'], async () => ({ first: { images: [] } }), async () => {}), /incomplete/)
})
