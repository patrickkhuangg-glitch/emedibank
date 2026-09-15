import type { MMIFeedback } from './mmi-feedback'

/** Both editors must remove score-dependent highlights when a domain becomes unscored. */
export function setMMIDomainRating(value: MMIFeedback, key: MMIFeedback['domains'][number]['key'], score: number | null): MMIFeedback {
 const domains=value.domains.map(d=>d.key===key?{...d,status:score===null?'insufficient_evidence' as const:'scored' as const,score,improvement:score===null?'':d.improvement}:d)
 return {...value,domains,
  strengths:score===null?value.strengths.filter(p=>p.domain!==key):value.strengths,
  priorities:score===null?value.priorities.filter(p=>p.domain!==key):value.priorities,
  global:domains.some(d=>d.status==='scored')?value.global:{status:'insufficient_evidence',score:null,reason:'The available evidence does not support a scored domain or overall judgement.'},
 }
}
