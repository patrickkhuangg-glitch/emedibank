import type { Metadata } from 'next'
import { MockInterviewLobby } from '@/components/interviews/mock-lobby'
import { requireUser } from '@/lib/auth/dal'
import { interviewVideoEnabled } from '@/lib/interviews/config'
import { mockOptions } from '@/lib/interviews/mock-plan'
export const metadata:Metadata={title:'Mock Interviews'}
export default async function MockInterviewsPage(){
 const user=await requireUser('/interviews/mock-interviews')
 return <MockInterviewLobby options={mockOptions()} enabled={interviewVideoEnabled()} userId={user.id}/>
}
