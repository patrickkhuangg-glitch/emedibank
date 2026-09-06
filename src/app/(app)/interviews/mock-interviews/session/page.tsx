import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MockSessionRunner } from '@/components/interviews/mock-session-runner'
import { requireUser } from '@/lib/auth/dal'
import { interviewVideoEnabled } from '@/lib/interviews/config'
import { mockOptions } from '@/lib/interviews/mock-plan'
import type { MockSelection } from '@/lib/interviews/mock-types'
export const metadata:Metadata={title:'Timed Mock Interview'}
export default async function MockInterviewSessionPage({searchParams}:{searchParams:Promise<{format?:string;mode?:string;selection?:string;station?:string;draft?:string}>}){
 const user=await requireUser('/interviews/mock-interviews'),params=await searchParams
 const format=params.format==='panel'?'panel':'mmi',mode=params.mode==='full'?'full':'individual'
 // Preserve older station bookmarks without revealing their prompts during setup.
 const selectionId=params.selection??(params.station?(format==='panel'?`${params.station}:0`:params.station):undefined)
 if(!params.draft&&mode==='individual'&&!mockOptions().some(o=>o.format===format&&o.id===selectionId))redirect('/interviews/mock-interviews')
 const selection:MockSelection={format,mode,selectionId}
 return <MockSessionRunner selection={selection} draftId={params.draft} userId={user.id} enabled={interviewVideoEnabled()}/>
}
