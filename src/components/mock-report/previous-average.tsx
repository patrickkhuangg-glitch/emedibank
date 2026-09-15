import Link from 'next/link'
import type { MockReport } from '@/lib/mock/report/types'
import { previousMockComparison } from '@/lib/mock/report/comparison'
import styles from './previous-average.module.css'

export function PreviousMockAverage({ report, score, section, compact = false, loading = false }: {report?: MockReport | null; score: number | null; section?: string; compact?: boolean; loading?: boolean}) {
  if (!report) return <div className={styles.comparison} data-compact={compact}><span>Previous mock average</span><strong className={styles.empty}>—</strong><p>{loading ? 'Loading comparison…' : 'Comparison unavailable'}</p></div>
  if (!report.paid) return <div className={styles.comparison} data-compact={compact}><span>Previous mock average</span><div className={styles.locked}><i aria-hidden="true"/><span>{compact ? 'Paid report' : <Link href="/pricing">Paid report</Link>}</span></div><p>Unlock your average and trend</p></div>
  const result = previousMockComparison(report.paid.history, report.id, report.completedAt, score, section)
  if (result.average == null) return <div className={styles.comparison} data-compact={compact}><span>Previous mock average</span><strong className={styles.empty}>—</strong><p>No previous {section ? 'subtest result' : 'full mock'} yet</p></div>
  const delta = result.delta, trend = delta == null ? 'unavailable' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'same'
  const series = [...result.scores,...(score == null ? [] : [score])]
  const min = Math.min(...series,result.average)-20, range = Math.max(...series,result.average)+20-min
  const point = (s:number,i:number) => `${2+i*106/Math.max(1,series.length-1)},${29-(s-min)/range*26}`
  return <div className={styles.comparison} data-compact={compact}>
    <span>{compact ? 'Previous average' : 'Previous mock average'}</span>
    <strong>{result.average}<small> / {section ? 900 : 2700}</small></strong>
    <p className={styles.delta} data-trend={trend}>{delta == null ? 'Current score unavailable' : <>{delta!==0&&<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={delta>0?'M2 8 6 4l4 4M6 4v7':'M2 4l4 4 4-4M6 1v7'}/></svg>}{delta===0?'Equal to your average':`${delta>0?'+':''}${delta} points ${delta>0?'above':'below'} average`}</>}</p>
    {!compact && series.length>1 && <svg className={styles.chart} viewBox="0 0 110 34" role="img" aria-label={`Estimated scores in order: ${series.join(', ')}. Last point is this mock; dashed line is your previous average.`}><path d={`M2 ${29-(result.average-min)/range*26}H108`} stroke="#b7adc9" strokeDasharray="3 3"/><polyline points={series.map(point).join(' ')} fill="none" stroke="#6a45c9" strokeWidth="2"/><circle cx="108" cy={29-(series.at(-1)!-min)/range*26} r="2.5" fill="#6a45c9"/></svg>}
    <p className={styles.caption}>Based on {result.count} previous mock{result.count===1?'':'s'}</p>
  </div>
}
