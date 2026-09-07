export const INTRO_VERSION=1
export const INTRO_STATUSES=['started','skipped','completed'] as const
export type IntroStatus=typeof INTRO_STATUSES[number]
export function hasSeenIntroduction(value:unknown){return typeof value==='string'&&INTRO_STATUSES.includes(value as IntroStatus)}
export const INTRO_STEPS=[
 {path:'/interviews',target:'dashboard-start',title:'Start with your dashboard',body:'See your weekly practice totals and suggested next questions. Below, the calendar tracks completed practice, themes and self-ratings. Open Practice, Stories or Mock Interviews from the header, or from Menu on a smaller screen.'},
 {path:'/interviews',target:'study-notes',title:'Keep the lesson from each response',body:'Use Study notes to save what went well and one thing to improve after each rehearsal or recording. Your reminders stay here for your next visit.'},
 {path:'/interviews/practice',target:'practice-selection',title:'Choose what you want to practise',body:'Switch between MMI stations and panel questions, then choose a topic from the question bank. You can see the prompt before beginning practice, so you have time to prepare your ideas.'},
 {path:'/interviews/practice',target:'practice-preview',title:'Prepare, rehearse, then record',body:'Open the selected station, prepare your ideas and choose audio recording or an unrecorded rehearsal. Listen back and review your transcript in Practice recordings. Keep your reflections in Study notes. Mock Interviews adds video and full exam conditions.'},
 {path:'/interviews/stories',target:'story-bank',title:'Build your own bank of experiences',body:'Save examples from your own life: the context, what you did and what you learnt. Search and revisit your stories when preparing for questions about teamwork, responsibility, empathy or growth.'},
 {path:'/interviews/mock-interviews',target:'mock-selection',title:'Practise under timed conditions',body:'Choose an individual MMI station or panel question, an eight-station MMI, or a 30-minute panel. The question stays hidden until the timed conditions begin. Camera and microphone setup happens only when you choose to record.'},
 {path:'/interviews/mock-interviews/review',target:'recording-library',title:'Review your recording and get feedback',body:'Saved recordings live here, with full mocks grouped together. Self-review is free. Marking costs 2 credits per MMI station, 1 per panel response, or 12 per full mock. Submit when you are ready for a reviewer’s report on strengths and areas to improve.'},
] as const
export function introductionAllowed(path:string){return ['/interviews','/interviews/practice','/interviews/stories','/interviews/resources','/interviews/mock-interviews','/interviews/mock-interviews/review'].includes(path)}
export function readIntroductionStep(value:string|null):number|null{
 try{const parsed=JSON.parse(value??'null');return parsed?.version===INTRO_VERSION&&Number.isInteger(parsed.step)&&parsed.step>=0&&parsed.step<INTRO_STEPS.length?parsed.step:null}catch{return null}
}
