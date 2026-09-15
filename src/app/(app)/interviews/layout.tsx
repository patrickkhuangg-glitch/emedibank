import type {ReactNode} from 'react'
import {getProfile,requireUser} from '@/lib/auth/dal'
import {InterviewIntroduction} from '@/components/interviews/introduction'
import {InterviewSupportContact} from '@/components/interviews/support-contact'
import {InterviewInteractionLayer} from '@/components/interviews/interaction-layer'
import {hasSeenIntroduction} from '@/lib/interviews/introduction'
export default async function InterviewLayout({children}:{children:ReactNode}){
 const user=await requireUser('/interviews'),profile=await getProfile()
 if(profile?.role!=='student')return children
 return <InterviewInteractionLayer><InterviewIntroduction key={user.id} userId={user.id} alreadySeen={hasSeenIntroduction(user.user_metadata?.interview_intro_v4)}>{children}<InterviewSupportContact/></InterviewIntroduction></InterviewInteractionLayer>
}
