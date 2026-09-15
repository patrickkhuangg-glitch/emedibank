import { isRoleplayStation, roleplayPart } from './roleplay'
import { TRIAL_MMI_IDS, TRIAL_PANEL_IDS } from './trial-catalog'
import { INTERVIEW_STATIONS } from './stations'
import type { MockOption, MockSelection, MockStep, MockTicket, MockView } from './mock-types'

// Only neutral titles and topic categories leave the server before a timed session starts.
export function mockOptions(trial = false): MockOption[] {
 return INTERVIEW_STATIONS.filter(station => station.format === 'mmi' && (!trial || TRIAL_MMI_IDS.includes(station.id))).map(station => ({id:station.id,format:station.format,label:station.title,category:station.category}))
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
   stationId: station.id, questionIndex, preparationSeconds: 0, responseSeconds: 120,
  }))
 })
}

export function makeMockSteps(selection: MockSelection, random = Math.random): MockStep[] {
 if (!selection || !['mmi','panel'].includes(selection.format) || !['individual','full'].includes(selection.mode)) throw new Error('Choose a valid mock interview.')
 if (selection.format === 'panel') {
  if (selection.mode !== 'full') throw new Error('Panel mocks are full interviews. Choose individual questions in Practice.')
  return fullPanelSteps(random)
 }
 const all = INTERVIEW_STATIONS.filter(s => s.format === 'mmi').map(s => ({ stationId:s.id,questionIndex:0,preparationSeconds:120,responseSeconds:480 }))
 if (selection.mode === 'individual') {
  const chosen = all.find(s => s.stationId === selection.selectionId)
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
   const part = isRoleplayStation(station) && phase === 'response' ? roleplayPart((now-responseAt)/1000) : null
   const questions = part ? [station.questions[part.questionIndex]] : station.format === 'panel' ? [station.questions[step.questionIndex]] : station.questions
   return { id:ticket.id, format:ticket.format, mode:ticket.mode, index,total:ticket.steps.length,phase,serverNow:now,startedAt:ticket.startedAt,phaseEndsAt:phase==='preparation'?responseAt:part?Math.min(end,responseAt+part.endsAtSeconds*1000):end,endsAt,
    ...(isRoleplayStation(station)?{responsePart:{kind:part?.kind??'roleplay',questionIndex:part?.questionIndex??0,questionCount:2}}:{}),
    questionCount:station.format==='mmi'?station.questions.length:1,
    title:station.title,preparation:station.format==='panel'?questions[0]:station.preparation,questions:phase==='response'?questions:[] }
  }
  start = end
 }
 return { id:ticket.id,format:ticket.format,mode:ticket.mode,index:ticket.steps.length,total:ticket.steps.length,phase:'complete',serverNow:now,startedAt:ticket.startedAt,phaseEndsAt:endsAt,endsAt,title:'Timed mock complete',preparation:'',questions:[] }
}

export function makeTrialMockSteps(selection: MockSelection): MockStep[] {
 if(selection.format==='panel'&&selection.mode==='full') {
  // Fixed ten themes prevents repeated starts from revealing additional questions.
  return TRIAL_PANEL_IDS.slice(0,10).map(stationId=>({stationId,questionIndex:0,preparationSeconds:0,responseSeconds:120}))
 }
 if(selection.format!=='mmi'||!['individual','full'].includes(selection.mode))throw Error('Invalid trial mock.')
 const ids=selection.mode==='full'?TRIAL_MMI_IDS.slice(0,2):[selection.selectionId??'']
 if(ids.some(id=>!TRIAL_MMI_IDS.includes(id)))throw Error('This station needs full access.')
 return ids.map(stationId=>({stationId,questionIndex:0,preparationSeconds:120,responseSeconds:480}))
}
