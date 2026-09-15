import styles from './station-progress.module.css'

/** Read-only progress: moving between questions remains controlled by the runner. */
export function StationProgress({steps,currentStep}:{steps:readonly {label:string;duration?:string}[];currentStep:number}) {
  return <ol aria-label="Station stages" className={`${styles.progress} grid gap-1 rounded-2xl border p-2 sm:gap-2`} style={{gridTemplateColumns:`repeat(${steps.length}, minmax(0, 1fr))`}}>
    {steps.map((step,index)=><li key={`${index}-${step.label}`} aria-current={index===currentStep?'step':undefined} className={`${styles.step} ${index===currentStep?styles.current:index<currentStep?styles.complete:''} min-w-0 rounded-xl px-1 pb-3 pt-5 text-center text-xs sm:px-3 sm:py-3 sm:text-left sm:text-sm`}>
      <p className="flex flex-wrap items-center justify-center gap-x-1 font-semibold sm:justify-start">{index<currentStep&&<span aria-label="Completed">✓</span>}<span>{step.label}</span></p>
      {step.duration&&<p className="mt-1 text-xs">{step.duration}</p>}
    </li>)}
  </ol>
}

export function MMIQuestionProgress({preparation,questionIndex,questionCount}:{preparation:boolean;questionIndex:number;questionCount:number}) {
  if(questionCount<1)return null
  const steps=[{label:'Prepare'},...Array.from({length:questionCount},(_,index)=>({label:`Q${index+1}`}))]
  return <StationProgress steps={steps} currentStep={preparation?0:Math.min(questionCount,Math.max(0,questionIndex)+1)}/>
}
