'use client'
import { useState } from 'react'
import { ERROR_CATEGORIES, type ErrorCategory, type Confidence } from '@/lib/mock/report/reflection'
import styles from './reflection.module.css'
export function ErrorClassification({category,onSave,confidence}:{category:ErrorCategory|null;onSave:(value:ErrorCategory|null)=>Promise<void>;confidence?:Confidence|null}){
 const [pending,setPending]=useState(false),[error,setError]=useState(false),[saved,setSaved]=useState(false)
 async function save(value:string){setPending(true);setError(false);setSaved(false);try{await onSave(value?value as ErrorCategory:null);setSaved(true)}catch{setError(true)}finally{setPending(false)}}
 return <section className={styles.classification}><h3>What caused this error?</h3><p>After reading the explanation, choose one main reason. You can change or clear it later.</p>{confidence&&<p>Your confidence before marking: <strong>{confidence}</strong></p>}<label>Main reason <select aria-label="Main reason for this error" value={category??''} disabled={pending} onChange={e=>save(e.target.value)}><option value="">Not classified</option>{ERROR_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>{pending&&<p role="status">Saving your classification…</p>}{saved&&<p role="status">Classification saved.</p>}{error&&<p role="alert">Could not save your choice. Select the reason again to retry.</p>}</section>
}
