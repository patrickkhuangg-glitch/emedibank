import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readAllRows } from '../src/lib/supabase/read-all-rows'

test('reads beyond the API row limit without losing questions from a set', async () => {
  const source = Array.from({ length: 1114 }, (_, i) => ({ id: i, stimulus: Math.floor((i + 2) / 4) }))
  const ranges: number[][] = []
  const rows = await readAllRows(async (from, to) => {
    ranges.push([from, to])
    return { data: source.slice(from, to + 1), error: null }
  })
  assert.deepEqual(rows, source)
  assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]])
  assert.equal(rows.filter(row => row.stimulus === 250).length, 4)
})

test('finishes correctly at an exact page boundary and for an empty bank', async () => {
  const source = Array.from({ length: 1000 }, (_, id) => ({ id }))
  assert.deepEqual(await readAllRows(async (from, to) => ({ data: source.slice(from, to + 1), error: null })), source)
  assert.deepEqual(await readAllRows(async () => ({ data: [], error: null })), [])
})

test('a failed later page fails the request instead of returning a partial bank', async () => {
  await assert.rejects(readAllRows(async (from) => from === 0
    ? { data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null }
    : { data: null, error: { message: 'Second page unavailable' } }), /Second page unavailable/)
})
