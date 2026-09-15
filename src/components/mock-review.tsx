'use client'
import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { MockReview as BaseReview } from './mock-review-base'
import { ReportPanels, ReportTakeaways } from './mock-report/panels'
import { saveMockReport, readMockReport, classifyMockError } from '@/lib/mock/report/actions'
import { summarizeErrors, type ErrorCategory } from '@/lib/mock/report/reflection'
import type { MockReport, ReportSubmission } from '@/lib/mock/report/types'
import reportStyles from './mock-report/report.module.css'
import styles from './review-sections.module.css'
type Props = ComponentProps<typeof BaseReview> & { reportToken?: string; reportSubmission?: ReportSubmission; previewReport?: MockReport }
export function MockReview({ reportToken, reportSubmission, previewReport, ...props }: Props) {
  const [section,setSection] = useState('all')
  const [selectedQuestion,setSelectedQuestion] = useState<string|null>(null)
  const [report,setReport] = useState<MockReport|null>(previewReport ?? null)
  const [reportError,setReportError] = useState(false)
  const navRef=useRef<HTMLElement>(null)
  const [refreshing,setRefreshing]=useState(false)
  useEffect(()=>{navRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'})},[section])
  const [retry,setRetry] = useState(0)
  const payload = useRef(reportSubmission)
  const request = useRef<Promise<MockReport>|null>(null)
  const reportEnabled = props.variant !== 'practice' && !!(reportToken || previewReport)
  useEffect(() => {
    if (!reportToken || !payload.current || previewReport) return
    let alive = true
    setReportError(false)
    request.current ??= saveMockReport(reportToken,payload.current)
    request.current.then(r=>{if(alive)setReport(r)}).catch(()=>{if(alive)setReportError(true);request.current=null})
    return()=>{alive=false}
  },[reportToken,retry,previewReport])
  async function refresh() {
    if(!report || previewReport || refreshing)return
    setRefreshing(true);setReportError(false)
    try { setReport(await readMockReport(report.id));setReportError(false) } catch { setReportError(true) } finally { setRefreshing(false) }
  }
  async function classify(questionId:string,category:ErrorCategory|null){
    if(!report)throw new Error('Report not ready')
    if(previewReport){
      const annotations=[...(report.annotations??[]).filter(a=>a.questionId!==questionId),...(category?[{questionId,category}]:[])]
      setReport({...report,annotations,paid:report.paid?{...report.paid,postMortem:{...report.paid.postMortem,reasons:annotations.map(a=>({category:a.category,marks:props.items.filter(q=>q.id===a.questionId).reduce((n,q)=>n+q.maximum-(q.score??0),0),repeated:false})).sort((a,b)=>b.marks-a.marks)},errors:summarizeErrors([{facts:props.items.map(q=>({id:q.id,score:q.score??0,maximum:q.maximum})),annotations}])}:null});return
    }
    setReport(await classifyMockError(report.id,questionId,category))
  }
  function changeSection(slug:string) { setSection(slug);setSelectedQuestion(null) }
  function openQuestion(id:string) { const q=props.items.find(q=>q.id===id);if(q){setSection(q.section);setSelectedQuestion(id)} }
  const sec=props.sections.find(s=>s.slug===section)
  const counts:Record<string,number>={}
  const numbered=props.items.map(q=>({...q,number:counts[q.section]=(counts[q.section]??0)+1}))
  const items=sec?numbered.filter(q=>q.section===section):numbered
  const navigation=<nav ref={navRef} className={styles.sections} aria-label="Review sections">{[{slug:'all',name:'Overview'},...props.sections,...(reportEnabled?[{slug:'report',name:'Detailed report'}]:[])].map(s=><button key={s.slug} aria-pressed={section===s.slug} onClick={()=>changeSection(s.slug)}>{s.name}</button>)}</nav>
  const state=reportEnabled&&!report?<div className={reportStyles.state} role={reportError?'alert':'status'}>{reportError?<>Your results are shown below, but the detailed report could not be saved. <button onClick={()=>setRetry(n=>n+1)}>Retry report</button></>:'Preparing your report…'}</div>:null
  return <BaseReview onClassify={reportEnabled?classify:undefined} comparisonReport={report} comparisonLoading={reportEnabled&&!report&&!reportError} key={`${section}:${selectedQuestion??''}`} {...props} items={items} sections={sec?[sec]:props.sections} label={props.label+(sec?' · '+sec.name:'')} sectionNavigation={navigation} onSectionSelect={changeSection} initialSelected={selectedQuestion} premiumAnalytics={props.variant==='practice'||!reportEnabled||report?.access==='paid'} takeaways={section==='all'?report?<ReportTakeaways report={report} examSlug={props.examSlug} onPostMortem={()=>changeSection('report')}/>:state:state} reportContent={section==='report'?(report?<ReportPanels refreshing={refreshing} refreshError={reportError} scores={{total:props.totalScore,sections:props.sections}} report={report} examSlug={props.examSlug} onQuestion={openQuestion} onRefresh={refresh}/>:state):null}/>
}
