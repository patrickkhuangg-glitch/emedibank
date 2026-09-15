import type { AnzPercentile } from '@/lib/ucat/benchmarks'
import { percentileLabel } from '@/lib/ucat/benchmarks'
import styles from './percentile-curve.module.css'

// Integrate a standard normal curve, then invert its cumulative area. The
// horizontal location represents percentile rank, not a calibrated raw score.
const points = Array.from({length:321},(_,i)=>{
  const z=-4+i/40
  return {z,density:Math.exp(-z*z/2)}
})
const cumulative=[0]
for(let i=1;i<points.length;i++) cumulative.push(cumulative[i-1]+(points[i-1].density+points[i].density)/2)
const total=cumulative[cumulative.length-1]
export function percentileZ(percent:number){
  const target=Math.max(0,Math.min(100,percent))/100*total
  const i=cumulative.findIndex(v=>v>=target)
  if(i<=0)return -4
  return points[i-1].z+(target-cumulative[i-1])/(cumulative[i]-cumulative[i-1])/40
}
const x=(z:number)=>12+(z+4)/8*216
const y=(z:number)=>53-Math.exp(-z*z/2)*38
const path=(from:number,to:number)=>{
  const steps=80
  return Array.from({length:steps+1},(_,i)=>{const z=from+(to-from)*i/steps;return `${i?'L':'M'}${x(z).toFixed(2)},${y(z).toFixed(2)}`}).join(' ')
}
export function PercentileCurve({percentile}:{percentile:AnzPercentile|null}){
  if(!percentile)return null
  const exact=percentile.kind==='estimate'
  const p=exact?percentile.value:percentile.boundary
  const z=percentileZ(p),px=x(z),py=y(z)
  const from=percentile.kind==='above'?z:-4,to=percentile.kind==='below'?z:exact?z:4
  const label=percentileLabel(percentile)
  return <svg className={styles.curve} viewBox="0 0 240 72" role="img" aria-label={`${label}. ${exact?'Your estimated position is marked.':'The shaded tail shows your range; an exact percentile is unavailable.'} Illustrative normal curve.`}>
    <title>{label} · illustrative bell curve</title>
    <path d={`${path(-4,4)} L228,53 L12,53 Z`} fill="currentColor" opacity=".06"/>
    <path d={`${path(from,to)} L${x(to)},53 L${x(from)},53 Z`} fill="currentColor" opacity=".24"/>
    <path d={path(-4,4)} fill="none" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M12 53H228" className={styles.axis}/>
    <path d={`M120 14V53`} className={styles.median}/>
    {exact?<><path d={`M${px} 11V53`} stroke="currentColor" strokeWidth="1.6"/><circle cx={px} cy={py} r="3" fill="currentColor"/><text x={px} y="8" textAnchor="middle" className={styles.marker}>You</text></>:<><path d={`M${px} 18V53`} stroke="currentColor" strokeDasharray="3 3"/><path d={percentile.kind==='above'?`M${px+3} 30h26m-5 -4 5 4-5 4`:`M${px-3} 30h-26m5 -4-5 4 5 4`} fill="none" stroke="currentColor" strokeWidth="1.6"/><text x={percentile.kind==='above'?px+18:px-18} y="17" textAnchor="middle" className={styles.marker}>You</text></>}
    {[10,50,90].map(t=><text key={t} x={x(percentileZ(t))} y="68" textAnchor="middle" className={styles.tick}>{t}th</text>)}
  </svg>
}
