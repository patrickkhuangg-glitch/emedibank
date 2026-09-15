import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTimelineScale, timelineDay, type TimelineEvent } from '../src/lib/study-plans/timeline'
const now = new Date('2026-09-08T02:00:00Z')
const event = (id: string, date: string): TimelineEvent => ({ id, date, kind: 'exam', title: id, detail: 'Exam day' })
test('calendar spacing stays proportional within three months; later dates move to the list', () => {
  const scale = buildTimelineScale([event('a','2026-09-10'),event('b','2026-09-20'),event('c','2026-10-10'),event('d','2027-03-12')],now)
  const [a,b,c] = scale.events
  assert.ok(Math.abs((c.position-b.position)/(b.position-a.position)-2)<0.00001)
  assert.equal(scale.months.length,4)
  assert.equal(scale.endLabel,'8 Dec 2026')
  assert.deepEqual(scale.laterEvents.map(e=>e.id),['d'])
  assert.equal(scale.laterEvents[0].label,'12 Mar 2027')
  assert.ok(scale.events.at(-1)!.position < 100)
})
test('nearby and same-day labels use separate rows', () => {
  const scale=buildTimelineScale([event('a','2026-09-10'),event('b','2026-09-10'),event('c','2026-09-11')],now)
  assert.deepEqual(scale.events.map(e=>e.row),[0,1,2])
  assert.equal(scale.events[0].position,scale.events[1].position)
})
test('Sydney calendar dates handle midnight and daylight saving consistently', () => {
  assert.equal(timelineDay('2026-10-04T13:30:00Z'),timelineDay('2026-10-05'))
  assert.equal(timelineDay('2026-10-04')-timelineDay('2026-10-03'),1)
})
test('empty and past-only timelines are safe, and events are sorted', () => {
  assert.equal(buildTimelineScale([],now).events.length,0)
  const scale=buildTimelineScale([event('later','2026-11-01'),event('past','2026-09-07'),event('today','2026-09-08')],now)
  assert.deepEqual(scale.events.map(e=>e.id),['today','later'])
  assert.equal(scale.todayPosition,scale.events[0].position)
})

test('the three-month boundary is inclusive and later bookings remain sorted', () => {
  const scale=buildTimelineScale([event('after','2026-12-09'),event('boundary','2026-12-08'),event('far','2027-01-01')],now)
  assert.deepEqual(scale.events.map(e=>e.id),['boundary'])
  assert.equal(scale.events[0].position,100)
  assert.deepEqual(scale.laterEvents.map(e=>e.id),['after','far'])
})
test('month-end dates clamp to the last valid day and cross the year correctly', () => {
  const scale=buildTimelineScale([event('boundary','2027-02-28'),event('after','2027-03-01')],new Date('2026-11-30T01:00:00Z'))
  assert.equal(scale.endLabel,'28 Feb 2027')
  assert.deepEqual(scale.events.map(e=>e.id),['boundary'])
  assert.deepEqual(scale.laterEvents.map(e=>e.id),['after'])
})
test('a later-only plan retains all dated events without extending the scale', () => {
  const dates=Array.from({length:10},(_,i)=>event(String(i),`2027-03-${String(i+1).padStart(2,'0')}`))
  const scale=buildTimelineScale(dates,now)
  assert.equal(scale.events.length,0)
  assert.equal(scale.laterEvents.length,10)
  assert.equal(scale.endLabel,'8 Dec 2026')
})
