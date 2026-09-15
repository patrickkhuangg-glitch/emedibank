'use client'
import { useEffect, useState } from 'react'
import type { SafeQuestion } from '@/lib/access/questions'
import type { Response } from './types'
import { responseKey } from './telemetry'
import { confidenceForAnswer, type Confidence, type ConfidenceRecord } from './reflection'
export function useQuestionConfidence(id:string,question:SafeQuestion|null|undefined,mcq:Record<string,string>,grids:Record<string,Record<number,string>>,ml:Record<string,{most?:number;least?:number}>) {
 const [records,setRecords]=useState<Record<string,ConfidenceRecord>>({})
 let answer:Response=mcq[id]??null,complete=!!answer
 if(question?.statements){answer=grids[id]??null;complete=question.statements.every(s=>grids[id]?.[s.index]!=null)}
 if(question?.mostLeast){answer=ml[id]??null;complete=ml[id]?.most!=null&&ml[id]?.least!=null}
 const key=responseKey(answer),record=records[id],value=complete?confidenceForAnswer(record,answer):null
 useEffect(()=>{
  if(!record||record.answerKey===key)return
  const timer=setTimeout(()=>setRecords(prev=>{const next={...prev};delete next[id];return next}),0)
  return()=>clearTimeout(timer)
 },[id,key,record])
 const setValue=(value:Confidence|null)=>{if(!complete&&value!==null)return;setRecords(prev=>{const next={...prev};if(value)next[id]={value,answerKey:key};else delete next[id];return next})}
 return {records,value,setValue,complete}
}
