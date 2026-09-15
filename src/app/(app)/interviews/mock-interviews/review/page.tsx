import { recordingAvailable,recordingExpired,recordingUrlLifetime,markingProtectsRecording } from '@/lib/interviews/recording-retention'
import { FeedbackReadMarker } from '@/components/interviews/continue-practice'
import {myPanelReport,myPanelReportIndex} from '@/lib/interviews/panel-data'
import type {PanelReport} from '@/components/interviews/panel-feedback-view'
import type { MMIReportEntry } from '@/lib/interviews/mmi-summary'
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
const libraryColumns:string='id,format,station_title,created_at,duration_seconds,marking_status,upload_status,video_deleted_at,recording_expires_at,mock_session:station_snapshot->mock_session'
type LibraryRow=Pick<InterviewAttemptRow,'id'|'format'|'station_title'|'created_at'|'duration_seconds'|'marking_status'|'upload_status'|'video_deleted_at'|'recording_expires_at'>&{mock_session:unknown}
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Mock Interviews · Recordings & feedback'}
export default async function InterviewReviewPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const user=await requireUser('/interviews/mock-interviews/review'),supabase=await createClient(),params=await searchParams
 const value=(key:string)=>typeof params[key]==='string'?params[key] as string:undefined
 const query={q:value('q')?.slice(0,150),format:['mmi','panel'].includes(value('format')??'')?value('format'):undefined,status:['saved','pending','feedback','unavailable'].includes(value('status')??'')?value('status'):undefined,page:value('page')}
 // The library receives metadata only. Private media, transcript and feedback load for one selected response.
 const [profile,{data:attempts,error}]=await Promise.all([getProfile(),supabase.from('interview_attempts').select(libraryColumns).eq('user_id',user.id).or('station_snapshot->>source.is.null,station_snapshot->>source.neq.practice_audio').order('created_at',{ascending:false}).returns<LibraryRow[]>()])
 if(error)return <main className="page-frame page-shell"><h1 className="page-title">Mock Interview recordings</h1><p>Your attempts could not be loaded. Please try again shortly.</p></main>
 const responses:ReviewResponse[]=(attempts??[]).map(a=>({id:a.id,format:a.format,title:a.station_title,createdAt:a.created_at,duration:a.duration_seconds,mock:mockMembership({mock_session:a.mock_session},a.format),status:a.marking_status==='released'?'feedback':a.marking_status==='ungradable'?'unavailable':a.marking_status?'pending':!recordingAvailable(a)?'unavailable':'saved',eligible:interviewVideoEnabled()&&canSubmit(a)}))
 const library=reviewLibrary(responses,query),selectedId=value('attempt'),selectedEntry=library.all.find(e=>e.responses.some(r=>r.id===selectedId))
 const panelIndex=await myPanelReportIndex()
 let panelReport:PanelReport|null=null
 let mockFeedback:MMIReportEntry[]|undefined
 let selected:InterviewAttempt|null=null
 if(selectedEntry){
  const {data:a}=await supabase.from('interview_attempts').select('*').eq('id',selectedId!).eq('user_id',user.id).maybeSingle()
  if(a){
   const [{data:activity},{data:recording}]=await Promise.all([supabase.from('interview_practice_logs').select('self_rating').eq('id',a.id).eq('user_id',user.id).maybeSingle(),recordingAvailable(a)?supabase.storage.from('interview-recordings').createSignedUrl(a.recording_path,recordingUrlLifetime(a)):Promise.resolve({data:null})])
   let feedback=null
   if(a.marking_status==='released')try{feedback=validateFeedback(a.approved_feedback,a.format)}catch{}
   const membership=mockMembership(a.station_snapshot,a.format)
   if(a.format==='panel'&&membership)panelReport=await myPanelReport(membership.id)
   if(a.format==='mmi'&&membership){
    const {data:members}=await supabase.from('interview_attempts').select('id,station_title,station_snapshot,format,marking_status,approved_feedback').eq('user_id',user.id).eq('station_snapshot->mock_session->>id',membership.id).limit(8)
    mockFeedback=(members??[]).filter(r=>r.format==='mmi'&&mockMembership(r.station_snapshot,r.format)?.id===membership.id).map(r=>({id:r.id,index:mockMembership(r.station_snapshot,r.format)!.index,title:r.station_title,status:r.marking_status??'pending',feedback:r.marking_status==='released'?r.approved_feedback:null}))
   }
   selected={activityTracked:!!activity,selfRating:activity?.self_rating??null,id:a.id,format:a.format,mock:mockMembership(a.station_snapshot,a.format),stationId:a.station_id,stationTitle:a.station_title,questions:a.questions,durationSeconds:a.duration_seconds,createdAt:a.created_at,audioUrl:recording?.signedUrl??null,examinerFeedback:getInterviewStation(a.format,a.station_id)?.examinerFeedback,transcript:a.transcript,transcriptionStatus:a.transcription_status,kind:a.media_kind??'audio',events:Array.isArray(a.question_events)?a.question_events as QuestionEvent[]:[],markingLabel:a.upload_status==='awaiting_upload'||a.upload_status==='uploading'?'Upload unfinished — return to your recording tab to resume':statusLabel({...a,marking_status:a.marking_status??null}),recordingExpiresAt:a.recording_expires_at,markingPending:markingProtectsRecording(a.marking_status),expired:recordingExpired(a),eligible:interviewVideoEnabled()&&canSubmit(a),feedback}
  }
 }
 const readId=panelReport?.feedback?`panel:${panelReport.sessionId}`:selected?.feedback?`attempt:${selected.id}`:null
 return <>{readId&&<FeedbackReadMarker userId={user.id} feedbackId={readId}/>}<InterviewAttemptReview panelReport={panelReport} panelIndex={panelIndex} mockFeedback={mockFeedback} library={library} query={query} selected={selected} selectedEntry={selectedEntry} responseCount={responses.length} credits={profile?.mmi_credits??0}/></>
}
