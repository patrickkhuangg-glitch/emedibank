import 'server-only'
import {createHash} from 'node:crypto'
import {Readable, Transform} from 'node:stream'
import {S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command} from '@aws-sdk/client-s3'
import {createAdminClient} from '@/lib/supabase/admin'

type Work={id:string;attempt_id:string|null;object_key:string;action:'copy'|'delete';recording_path:string|null;mime_type:string|null}
export function recordingBackupConfiguration(){
 const account=process.env.INTERVIEW_BACKUP_R2_ACCOUNT_ID,bucket=process.env.INTERVIEW_BACKUP_R2_BUCKET
 const accessKeyId=process.env.INTERVIEW_BACKUP_R2_ACCESS_KEY_ID,secretAccessKey=process.env.INTERVIEW_BACKUP_R2_SECRET_ACCESS_KEY
 if(!account||!bucket||!accessKeyId||!secretAccessKey)return null
 if(!/^[a-f0-9]{32}$/.test(account)||!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket))throw Error('invalid_backup_configuration')
 return {bucket,endpoint:`https://${account}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey}}
}

// Stream rather than buffer a student's video in the function's memory. The
// receipt is an end-to-end content digest for a later operator restore check.
export function backupDigestStream(expectedBytes:number){
 if(!Number.isSafeInteger(expectedBytes)||expectedBytes<=0||expectedBytes>150*1024*1024)throw Error('invalid_backup_size')
 const hash=createHash('sha256');let bytes=0,finished=false
 const stream=new Transform({
  transform(chunk,encoding,callback){bytes+=chunk.length;if(bytes>expectedBytes){callback(Error('backup_size_mismatch'));return}hash.update(chunk);callback(null,chunk)},
  flush(callback){if(bytes!==expectedBytes){callback(Error('backup_size_mismatch'));return}finished=true;callback()},
 })
 return {stream,receipt:()=>{if(!finished)throw Error('backup_incomplete');return {bytes,sha256:hash.digest('hex')}}}
}

export async function runRecordingBackups(){
 const config=recordingBackupConfiguration()
 if(!config)return {configured:false,copied:0,deleted:0,failed:0}
 const db=createAdminClient(),s3=new S3Client({region:'auto',endpoint:config.endpoint,credentials:config.credentials,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'})
 const deadline=Date.now()+180_000;let copied=0,deleted=0,failed=0
 try{
  const {data:health,error:healthError}=await db.from('interview_backup_health').select('enabled').eq('singleton',true).single()
  if(healthError)throw Error('backup_health_unavailable')
  if(!health.enabled)return {configured:true,enabled:false,copied,deleted,failed}
  const lanes=await Promise.allSettled(Array.from({length:2},async()=>{
   const worker=crypto.randomUUID()
   for(let i=0;i<10&&Date.now()<deadline;i++){
    const {data,error}=await db.rpc('claim_interview_backup',{p_worker:worker})
    if(error)throw Error('backup_claim_failed')
    if(!data)break
    const work=data as Work;let receipt:{bytes:number;sha256:string}|undefined,problem=false
    const signal=AbortSignal.timeout(90_000)
    try{
     if(!/^recordings\/[a-f0-9-]{36}$/.test(work.object_key))throw Error('invalid_backup_key')
     if(work.action==='delete'){
      await s3.send(new DeleteObjectCommand({Bucket:config.bucket,Key:work.object_key}),{abortSignal:signal});deleted++
     }else{
      if(!work.recording_path||!work.attempt_id)throw Error('backup_source_unavailable')
      const source=db.storage.from('interview-recordings')
      const {data:info,error:infoError}=await source.info(work.recording_path)
      if(infoError||!info||typeof info.size!=='number')throw Error('backup_source_unavailable')
      const digest=backupDigestStream(info.size)
      const {data:signed,error:signError}=await source.createSignedUrl(work.recording_path,180)
      if(signError||!signed?.signedUrl)throw Error('backup_source_unavailable')
      const response=await fetch(signed.signedUrl,{signal,redirect:'error',cache:'no-store'})
      if(!response.ok||!response.body){await response.body?.cancel();throw Error('backup_download_failed')}
      const input=Readable.fromWeb(response.body as import('node:stream/web').ReadableStream)
      input.on('error',error=>digest.stream.destroy(error));input.pipe(digest.stream)
      try{
       // R2 encrypts all object bytes at rest. The bucket must remain private.
       await s3.send(new PutObjectCommand({Bucket:config.bucket,Key:work.object_key,Body:digest.stream,ContentLength:info.size,ContentType:work.mime_type??'application/octet-stream',Metadata:{'attempt-id':work.attempt_id,'backup-format':'1'}}),{abortSignal:signal})
       receipt=digest.receipt()
       const head=await s3.send(new HeadObjectCommand({Bucket:config.bucket,Key:work.object_key}),{abortSignal:signal})
       if(head.ContentLength!==receipt.bytes)throw Error('backup_verification_failed')
       copied++
      }finally{input.destroy();digest.stream.destroy()}
     }
    }catch{problem=true;failed++}
    const finish=await db.rpc('finish_interview_backup',{p_id:work.id,p_worker:worker,...(problem?{p_error:'backup_operation_failed'}:receipt?{p_bytes:receipt.bytes,p_sha256:receipt.sha256}:{})})
    if(finish.error||!finish.data)throw Error('backup_receipt_failed')
   }
  }))
  if(lanes.some(lane=>lane.status==='rejected'))throw Error('backup_lane_failed')
  // A bounded sweep finds objects left by an interrupted receipt or deletion.
  // SQL rechecks eligibility and leases; storage listings never authorise deletion.
  const cursor=await db.from('interview_backup_health').select('sweep_cursor').eq('singleton',true).single()
  if(cursor.error)throw Error('backup_sweep_unavailable')
  const page=await s3.send(new ListObjectsV2Command({Bucket:config.bucket,Prefix:'recordings/',MaxKeys:100,...(cursor.data.sweep_cursor?{StartAfter:cursor.data.sweep_cursor}:{})}),{abortSignal:AbortSignal.timeout(15_000)})
  for(const object of page.Contents??[]){
   if(!object.Key||!/^recordings\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(object.Key))continue
   const reconciled=await db.rpc('reconcile_interview_backup',{p_attempt:object.Key.slice(11)})
   if(reconciled.error)throw Error('backup_sweep_failed')
  }
  const sweepCursor=page.IsTruncated?page.Contents?.at(-1)?.Key??null:null
  const {error}=await db.from('interview_backup_health').update({sweep_cursor:sweepCursor,checked_at:new Date().toISOString(),...(failed?{}:{last_success_at:new Date().toISOString()}),last_error:failed?'backup_operation_failed':null}).eq('singleton',true)
  if(error)throw Error('backup_health_write_failed')
  return {configured:true,copied,deleted,failed}
 }catch{
  await db.from('interview_backup_health').update({checked_at:new Date().toISOString(),last_error:'backup_run_failed'}).eq('singleton',true)
  throw Error('backup_run_failed')
 }finally{s3.destroy()}
}
