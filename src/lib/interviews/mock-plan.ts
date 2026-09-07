import { INTERVIEW_STATIONS } from './stations'
import type { MockOption, MockSelection, MockStep, MockTicket, MockView } from './mock-types'

// Only neutral labels leave the server before a timed session starts.
export function mockOptions(): MockOption[] {
 return INTERVIEW_STATIONS.flatMap(station => station.format === 'mmi'
  ? [{ id: station.id, format: station.format, label: station.title }]
  : station.questions.map((_, index) => ({ id: `${station.id}:${index}`, format: station.format, label: `${String(station.panelThemeNumber).padStart(2, '0')} · ${station.title} · Question ${index + 1}` })))
}
function shuffled<T>(values: T[], random: () => number): T[] {
 const result = [...values]
 for (let i = result.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1))
  ;[result[i], result[j]] = [result[j], result[i]]
 }
 return result
}

function fullPanelSteps(random: () => number): MockStep[] {
 const themes = INTERVIEW_STATIONS.filter(station => station.format === 'panel')
 const motivation = themes.find(station => station.panelThemeNumber === 1)
 const firstPool = themes.filter(station => station.panelThemeNumber! >= 2 && station.panelThemeNumber! <= 14)
 const remainingPool = themes.filter(station => station.panelThemeNumber! >= 15 && station.panelThemeNumber! <= 32)
 if (!motivation || firstPool.length < 2 || remainingPool.length < 2) throw new Error('There are not enough panel themes for this mock.')
 const selected = [motivation, ...shuffled([
  ...shuffled(firstPool, random).slice(0, 2),
  ...shuffled(remainingPool, random).slice(0, 2),
 ], random)]
 // Keep each theme's two questions together; motivation always opens the panel.
 return selected.flatMap(station => {
  if (station.questions.length < 2) throw new Error('There are not enough questions in a selected panel theme.')
  return shuffled(station.questions.map((_, questionIndex) => questionIndex), random).slice(0, 2).map(questionIndex => ({
   stationId: station.id, questionIndex, preparationSeconds: 0, responseSeconds: 180,
  }))
 })
}

export function makeMockSteps(selection: MockSelection, random = Math.random): MockStep[] {
 if (!selection || !['mmi','panel'].includes(selection.format) || !['individual','full'].includes(selection.mode)) throw new Error('Choose a valid mock interview.')
 if (selection.format === 'panel' && selection.mode === 'full') return fullPanelSteps(random)
 const all = INTERVIEW_STATIONS.filter(s => s.format === selection.format).flatMap(s => s.format === 'mmi'
  ? [{ stationId: s.id, questionIndex: 0, preparationSeconds: 120, responseSeconds: 480 }]
  : s.questions.map((_, questionIndex) => ({ stationId: s.id, questionIndex, preparationSeconds: selection.mode === 'full' ? 0 : 30, responseSeconds: 180 })))
 if (selection.mode === 'individual') {
  const chosen = all.find(s => (selection.format === 'mmi' ? s.stationId : `${s.stationId}:${s.questionIndex}`) === selection.selectionId)
  if (!chosen) throw new Error('Choose an available station or question.')
  return [chosen]
 }
 const count = 8
 if (all.length < count) throw new Error('There are not enough distinct stations or questions for this mock.')
 return shuffled(all, random).slice(0,count)
}
export function mockView(ticket: MockTicket, now: number): MockView {
 const endsAt = ticket.startedAt + ticket.steps.reduce((n,s) => n + s.preparationSeconds + s.responseSeconds,0) * 1000
 let start = ticket.startedAt
 for (let index = 0; index < ticket.steps.length; index++) {
  const step = ticket.steps[index], responseAt = start + step.preparationSeconds * 1000, end = responseAt + step.responseSeconds * 1000
  if (now < end) {
   const station = INTERVIEW_STATIONS.find(s => s.id === step.stationId)
   if (!station) throw new Error('Station is no longer available.')
   const phase = now < responseAt ? 'preparation' : 'response'
   const questions = station.format === 'panel' ? [station.questions[step.questionIndex]] : station.questions
   return { id:ticket.id, format:ticket.format, mode:ticket.mode, index,total:ticket.steps.length,phase,serverNow:now,startedAt:ticket.startedAt,phaseEndsAt:phase==='preparation'?responseAt:end,endsAt,
    title:station.title,preparation:station.format==='panel'?questions[0]:station.preparation,questions:phase==='response'?questions:[] }
  }
  start = end
 }
 return { id:ticket.id,format:ticket.format,mode:ticket.mode,index:ticket.steps.length,total:ticket.steps.length,phase:'complete',serverNow:now,startedAt:ticket.startedAt,phaseEndsAt:endsAt,endsAt,title:'Timed mock complete',preparation:'',questions:[] }
}
