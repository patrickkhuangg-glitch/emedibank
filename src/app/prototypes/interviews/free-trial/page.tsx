import Link from 'next/link'
import {InterviewTrialNotice} from '@/components/interviews/trial-notice'
import {InterviewPracticeLobby} from '@/components/interview-practice-lobby'
import {trialStations} from '@/lib/interviews/trial-stations'
import type {InterviewAccess} from '@/lib/interviews/trial'
export default async function TrialPreview({searchParams}:{searchParams:Promise<{state?:string}>}) {
 const {state}=await searchParams
 const kind:InterviewAccess['kind']=state==='expired'?'expired':state==='active'?'active':'eligible'
 const access:InterviewAccess={kind,secondsRemaining:42*60,credits:2,expiresAt:'2026-09-15T10:00:00Z'}
 return <><nav className="mx-auto flex max-w-7xl flex-wrap gap-4 px-5 pt-5 text-sm font-semibold text-brand" aria-label="Preview states"><span className="text-muted">Local trial preview</span>{['eligible','active','expired'].map(s=><Link key={s} href={`?state=${s}`} className="rounded-full border border-border px-3 py-1">{s==='eligible'?'Before first practice':s==='active'?'During trial':'After trial'}</Link>)}</nav><InterviewTrialNotice access={access}/>{kind!=='expired'&&<InterviewPracticeLobby stations={trialStations()}/>}</>
}
