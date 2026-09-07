import { mockMembership } from '@/lib/interviews/mock-marking'
import type { Metadata } from 'next'
import { InterviewAttemptReview, type InterviewAttempt } from '@/components/interview-attempt-review'
import { requireUser,getProfile } from '@/lib/auth/dal'
import { getInterviewStation } from '@/lib/interviews/stations'
import { createClient } from '@/lib/supabase/server'
import type { InterviewAttemptRow } from '@/lib/supabase/types'
import { canSubmit,statusLabel,type QuestionEvent } from '@/lib/interviews/video-validation'
import { interviewVideoEnabled } from '@/lib/interviews/config'
import { validateFeedback } from '@/lib/interviews/marking-validation'
import { reviewLibrary,type ReviewResponse } from '@/lib/interviews/review-library'
// Widen the select string to avoid recursive inference of the JSON snapshot type.
const libraryColumns:string='id,format,station_title,created_at,duration_seconds,marking_status,upload_status,video_deleted_at,mock_session:station_snapshot->mock_session'
type LibraryRow=Pick<InterviewAttemptRow,'id'|'format'|'station_title'|'created_at'|'duration_seconds'|'marking_status'|'upload_status'|'video_deleted_at'>&{mock_session:unknown}
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Mock Interviews · Recordings & feedback'}
export default async function InterviewReviewPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const user=await requireUser('/interviews/mock-interviews/review'),supabase=await createClient(),params=await searchParams
 const value=(key:string)=>typeof params[key]==='string'?params[key] as string:undefined
 const query={q:value('q')?.slice(0,150),format:['mmi','panel'].includes(value('format')??'')?value('format'):undefined,status:['saved','pending','feedback','unavailable'].includes(value('status')??'')?value('status'):undefined,page:value('page')}
 // The library receives metadata only. Private media, transcript and feedback load for one selected response.
 const [profile,{data:attempts,error}]=await Promise.all([getProfile(),supabase.from('interview_attempts').select(libraryColumns).eq('user_id',user.id).or('station_snapshot->>source.is.null,station_snapshot->>source.neq.practice_audio').order('created_at',{ascending:false}).returns<LibraryRow[]>()])
 if(error)return <main className="p-8"><h1>Mock Interview recordings</h1><p>Your attempts could not be loaded. Please try again shortly.</p></main>
 const responses:ReviewResponse[]=(attempts??[]).map(a=>({id:a.id,format:a.format,title:a.station_title,createdAt:a.created_at,duration:a.duration_seconds,mock:mockMembership({mock_session:a.mock_session},a.format),status:a.marking_status==='released'?'feedback':a.marking_status==='ungradable'?'unavailable':a.marking_status?'pending':a.video_deleted_at||a.upload_status!=='ready'?'unavailable':'saved',eligible:interviewVideoEnabled()&&canSubmit(a)}))
 const library=reviewLibrary(responses,query),selectedId=value('attempt'),selectedEntry=library.all.find(e=>e.responses.some(r=>r.id===selectedId))
 let selected:InterviewAttempt|null=null
 if(selectedEntry){
  const {data:a}=await supabase.from('interview_attempts').select('*').eq('id',selectedId!).eq('user_id',user.id).maybeSingle()
  if(a){
   const [{data:activity},{data:recording}]=await Promise.all([supabase.from('interview_practice_logs').select('self_rating').eq('id',a.id).eq('user_id',user.id).maybeSingle(),!a.video_deleted_at&&(a.upload_status??'ready')==='ready'?supabase.storage.from('interview-recordings').createSignedUrl(a.recording_path,600):Promise.resolve({data:null})])
   let feedback=null
   if(a.marking_status==='released')try{feedback=validateFeedback(a.approved_feedback,a.format)}catch{}
   selected={activityTracked:!!activity,selfRating:activity?.self_rating??null,id:a.id,format:a.format,mock:mockMembership(a.station_snapshot,a.format),stationId:a.station_id,stationTitle:a.station_title,questions:a.questions,durationSeconds:a.duration_seconds,createdAt:a.created_at,audioUrl:recording?.signedUrl??null,examinerFeedback:getInterviewStation(a.format,a.station_id)?.examinerFeedback,transcript:a.transcript,transcriptionStatus:a.transcription_status,kind:a.media_kind??'audio',events:Array.isArray(a.question_events)?a.question_events as QuestionEvent[]:[],markingLabel:a.upload_status==='awaiting_upload'||a.upload_status==='uploading'?'Upload unfinished — return to your recording tab to resume':statusLabel({...a,marking_status:a.marking_status??null}),expired:!!a.video_deleted_at,eligible:interviewVideoEnabled()&&canSubmit(a),feedback}
  }
 }
 return <InterviewAttemptReview library={library} query={query} selected={selected} selectedEntry={selectedEntry} responseCount={responses.length} credits={profile?.mmi_credits??0}/>
}
