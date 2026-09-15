import { StationProgress } from './station-progress'
import { InterviewPrompt, InterviewTimerBar } from './question-display'

export type RoleplayStageName = 'preparation' | 'roleplay' | 'reflection'
const stages = [{key:'preparation',label:'Prepare',duration:'2 min'},{key:'roleplay',label:'Rehearse',duration:'4 min'},{key:'reflection',label:'Reflect',duration:'4 min'}] as const

export function RoleplayStage({stage,seconds,scenario,question,recording=false}:{stage:RoleplayStageName;seconds:number;scenario:string;question?:string;recording?:boolean}) {
  const index=stages.findIndex(s=>s.key===stage)
  return <div className="space-y-5">
    <StationProgress steps={stages} currentStep={index}/>
    <InterviewTimerBar tone={stage==='preparation'?'preparation':'response'} label={`${stage==='preparation'?'Preparation':stage==='roleplay'?'Role-play rehearsal':'Reflection'}${recording&&stage!=='preparation'?' · Recording':''}`} seconds={seconds}/>
    <InterviewPrompt preparation={stage==='preparation'} text={stage==='preparation'?scenario:question??''} questionNumber={stage==='reflection'?2:1} questionCount={2} scenario={scenario}>
      <p className="text-sm leading-6 text-muted">{stage==='preparation'?'Read the scenario and consider how you would begin. Your rehearsal starts automatically.':stage==='roleplay'?'Speak directly to the person as if they were here. This is a solo rehearsal; no role-player responds. Reflection opens when these four minutes finish.':'Reflect on what you actually said and what you would change. This station finishes automatically when time ends.'}</p>
    </InterviewPrompt>
  </div>
}
