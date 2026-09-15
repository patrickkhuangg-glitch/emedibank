import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dashboardActivity } from '../src/lib/dashboard/activity'
import { dashboardMilestones } from '../src/lib/dashboard/milestones'
import type { SectionStat } from '../src/lib/dashboard/stats'

const section = (slug:string, attempted=0):SectionStat => ({id:slug,name:slug,slug,attempted,correct:0,accuracy:null,avgSeconds:null,xp:0,level:1,into:0,streak:0})
test('activity fills seven calendar days, counts attempts, and excludes future and invalid timestamps', () => {
  const activity = dashboardActivity(['2026-09-04T23:00:00Z','2026-09-10T00:00:00Z','2026-09-10T11:00:00Z','2026-09-10T14:00:00Z','invalid'],new Date('2026-09-10T12:00:00Z'))
  assert.equal(activity.days.length,7)
  assert.deepEqual(activity.days.map(d=>d.answers),[1,0,0,0,0,0,2])
  assert.equal(activity.todayAnswers,2)
  assert.equal(activity.activeDays,2)
})
test('UTC day boundaries agree with dashboard streaks across month and leap-year changes', () => {
  const activity = dashboardActivity(['2024-02-29T23:59:00Z','2024-03-01T10:00:00+11:00','2024-03-01T00:01:00Z'],new Date('2024-03-01T01:00:00Z'))
  assert.deepEqual(activity.days.slice(-2),[{date:'2024-02-29',answers:2},{date:'2024-03-01',answers:1}])
})
test('empty accounts have no unlocked milestones or invented activity', () => {
  const activity = dashboardActivity([],new Date('2026-09-10T12:00:00Z'))
  assert.equal(activity.todayAnswers,0)
  assert.equal(activity.activeDays,0)
  assert.ok(dashboardMilestones({attempted:0,totalXp:0,sections:[section('vr'),section('dm')]}).every(m=>!m.reached && m.percent===0))
})
test('milestones unlock at the correct threshold and progress never exceeds 100 percent', () => {
  const data = {attempted:100,totalXp:5000,sections:[section('vr',100),section('dm',0)]}
  const milestones = dashboardMilestones(data)
  assert.equal(milestones.find(m=>m.id==='century')?.reached,true)
  assert.equal(milestones.find(m=>m.id==='momentum')?.reached,true)
  assert.equal(milestones.find(m=>m.id==='explorer')?.reached,false)
  assert.equal(milestones.find(m=>m.id==='five-hundred')?.percent,20)
  assert.ok(milestones.every(m=>m.percent>=0 && m.percent<=100))
  assert.equal(dashboardMilestones({...data,attempted:99}).find(m=>m.id==='century')?.reached,false)
})
test('section exploration needs two practised sections and is omitted when unavailable', () => {
  const base = {attempted:100,totalXp:100,sections:[section('vr',50),section('dm',50)]}
  assert.equal(dashboardMilestones(base).find(m=>m.id==='explorer')?.reached,true)
  assert.equal(dashboardMilestones({...base,sections:[section('vr',100)]}).some(m=>m.id==='explorer'),false)
})
