import { INTERVIEW_STATIONS } from '../src/lib/interviews/stations'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { averageRating, completedLogs, logsInWeek, monthDays, practiceDay, progressRange, shiftDay, shiftMonth, summariseThemes, suggestPractice, validProgressMonth, weekStart, type PracticeLog } from '../src/lib/interviews/practice-progress'
const log = (id: string, station_id: string, date: string, self_rating: number | null = null): PracticeLog => ({ id, station_id, format: station_id.startsWith('mmi') ? 'mmi' : 'panel', source: 'recording', completed_at: date, duration_seconds: 90, self_rating })
test('Sydney day boundaries and Monday-first weeks survive DST, leap years and year boundaries', () => {
  assert.equal(practiceDay('2026-09-06T13:59:59Z'), '2026-09-06')
  assert.equal(practiceDay('2026-09-06T14:00:00Z'), '2026-09-07')
  assert.equal(practiceDay('2026-10-04T13:00:00Z'), '2026-10-05')
  assert.equal(weekStart('2026-01-01'), '2025-12-29')
  assert.equal(shiftDay('2026-10-04', 1), '2026-10-05')
  assert.equal(shiftMonth('2026-01', -1), '2025-12')
  assert.equal(monthDays('2024-02').filter(Boolean).length, 29)
  assert.equal(monthDays('2026-08').length, 42)
  assert.equal(monthDays('2026-09')[1], '2026-09-01')
  assert.deepEqual(progressRange('2026-09'), { from: '2026-07-27', until: '2026-10-05' })
  assert.equal(validProgressMonth('2027-01', '2026-09-06'), '2026-09')
  assert.equal(validProgressMonth('2026-13', '2026-09-06'), '2026-09')
})
test('weekly counts include each completed response once; unrated and unfinished practice do not become zero ratings', () => {
  const rows = [log('a','mmi-confidentiality-patient-safety','2026-09-01T01:00:00Z',2),log('b','mmi-resource-choice','2026-09-01T01:30:00Z',4),log('c','mmi-resource-choice','2026-09-01T02:00:00Z'),{...log('d','mmi-resource-choice','2026-09-01T02:00:00Z'),completed_at:null}]
  const week = logsInWeek([...rows,rows[0],log('next','panel-motivation','2026-09-06T14:00:00Z',5)],'2026-08-31')
  assert.equal(week.length,3)
  assert.equal(averageRating(week),3)
  assert.deepEqual(summariseThemes(week).find(row=>row.theme==='Ethics'),{theme:'Ethics',count:3,rated:2,average:3})
  assert.equal(averageRating([rows[2]]),null)
  assert.equal(completedLogs(Array.from({length:8},(_,index)=>log(String(index),'mmi-resource-choice','2026-09-01T02:00:00Z'))).length,8)
})
test('suggestions explain low self-ratings and missing coverage and link to an available station', () => {
  const rows=[log('a','mmi-confidentiality-patient-safety','2026-09-05T01:00:00Z',1),log('b','mmi-resource-choice','2026-09-05T02:00:00Z',1)]
  const suggestions=suggestPractice(rows,'2026-09-06')
  assert.equal(suggestions[0].theme,'Ethics')
  assert.match(suggestions[0].reason,/1.0\/5 across 2 rated/)
  assert.match(suggestions[1].reason,/haven’t practised.*28 days/)
  const station = INTERVIEW_STATIONS.find(station => station.id === suggestions[0].stationId)!
  assert.ok(station)
  assert.equal(station.category.split(' · ')[0], 'Ethics')
  assert.equal(suggestions[0].href, `/interviews/practice/session?format=${station.format}&station=${encodeURIComponent(station.id)}`)
  assert.equal(new Set(suggestions.map(item=>item.theme)).size,3)
  assert.deepEqual(suggestPractice([log('future','panel-motivation','2027-01-01T00:00:00Z',1)],'2026-09-06'),suggestPractice([],'2026-09-06'))
})
