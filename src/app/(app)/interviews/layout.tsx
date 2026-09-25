import type {ReactNode} from 'react'
import {Container} from '@/components/container'
import {ButtonLink} from '@/components/ui/button'
import {getProfile,requireUser} from '@/lib/auth/dal'
import {InterviewIntroduction} from '@/components/interviews/introduction'
import {hasSeenIntroduction} from '@/lib/interviews/introduction'
import {canUseInterviews} from '@/lib/interviews/access'
// Interviews needs a running free trial or a paid plan. The interview APIs
// enforce the same check server-side (requireInterviewAccess).
export default async function InterviewLayout({children}:{children:ReactNode}){
 const user=await requireUser('/interviews'),profile=await getProfile()
 if(profile?.role!=='student')return children
 if(!(await canUseInterviews(user.id)))return <InterviewsLocked/>
 return <InterviewIntroduction key={user.id} userId={user.id} alreadySeen={hasSeenIntroduction(user.user_metadata?.interview_intro_v1)}>{children}</InterviewIntroduction>
}
function InterviewsLocked(){
 return <Container className="py-16">
  <div className="mx-auto max-w-xl rounded-2xl border border-border bg-brand-muted p-8 text-center">
   <h1 className="text-lg font-semibold">Your free trial has ended</h1>
   <p className="mx-auto mt-2 max-w-md text-sm text-muted">Unlock MMI and panel practice, mock interviews, recordings and transcripts with the Interviews plan or any annual subscription. Access starts immediately — cancel anytime.</p>
   <ButtonLink href="/pricing" className="mt-5">See plans</ButtonLink>
  </div>
 </Container>
}
