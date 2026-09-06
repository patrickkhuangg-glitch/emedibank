import { INTERVIEW_STATIONS } from './stations'
import type { MockOption, MockSelection, MockStep, MockTicket, MockView } from './mock-types'

// Only neutral labels leave the server before a timed session starts.
export function mockOptions(): MockOption[] {
 return INTERVIEW_STATIONS.flatMap(station => station.format === 'mmi'
  ? [{ id: station.id, format: station.format, label: station.title }]
  : station.questions.map((_, index) => ({ id: `${station.id}:${index}`, format: station.format, label: `${station.title} · Question ${index + 1}` })))
}
export function makeMockSteps(selection: MockSelection, random = Math.random): MockStep[] {
 if (!selection || !['mmi','panel'].includes(selection.format) || !['individual','full'].includes(selection.mode)) throw new Error('Choose a valid mock interview.')
 const all = INTERVIEW_STATIONS.filter(s => s.format === selection.format).flatMap(s => s.format === 'mmi'
  ? [{ stationId: s.id, questionIndex: 0, preparationSeconds: 120, responseSeconds: 480 }]
  : s.questions.map((_, questionIndex) => ({ stationId: s.id, questionIndex, preparationSeconds: selection.mode === 'full' ? 0 : 30, responseSeconds: 180 })))
 if (selection.mode === 'individual') {
  const chosen = all.find(s => (selection.format === 'mmi' ? s.stationId : `${s.stationId}:${s.questionIndex}`) === selection.selectionId)
  if (!chosen) throw new Error('Choose an available station or question.')
  return [chosen]
 }
 for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [all[i],all[j]] = [all[j],all[i]] }
 const count = selection.format === 'mmi' ? 8 : 10
 if (all.length < count) throw new Error('There are not enough distinct stations or questions for this mock.')
 return all.slice(0,count)
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
