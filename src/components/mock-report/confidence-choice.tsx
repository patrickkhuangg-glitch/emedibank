'use client'
import { CONFIDENCE_OPTIONS, type Confidence } from '@/lib/mock/report/reflection'
import styles from './reflection.module.css'
export function ConfidenceChoice({value,onChange,disabled=false}:{value:Confidence|null;onChange:(v:Confidence|null)=>void;disabled?:boolean}){
 return <fieldset className={styles.confidence} disabled={disabled}><legend>Confidence <span>(optional)</span></legend><div>{CONFIDENCE_OPTIONS.map(option=><button type="button" key={option} aria-pressed={value===option} onClick={()=>onChange(value===option?null:option)}>{option}</button>)}</div><small>{disabled?'Complete your answer to record confidence.':'Changing your answer clears this choice.'}</small></fieldset>
}
