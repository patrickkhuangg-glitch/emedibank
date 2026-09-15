import { RECORDING_RETENTION_NOTICE } from '@/lib/interviews/recording-retention'
export function RecordingRetentionNotice({expiresAt,pending=false,expired=false}:{expiresAt?:string|null;pending?:boolean;expired?:boolean}){
 const date=expiresAt?new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Australia/Sydney',timeZoneName:'short'}).format(new Date(expiresAt)):null
 return <div className="my-4 rounded-2xl bg-brand-muted px-4 py-3 text-sm leading-6 text-foreground">
  {expired?<p>This recording has expired. Your transcript and any released feedback are still available.</p>:date?<><p className="font-semibold">{pending?'Kept while marking is in progress':`Download before ${date}`}</p><p>{pending?`The recording’s usual expiry is ${date}. If marking finishes after that, it will be deleted at the next cleanup.`:'The audio or video will be deleted automatically. Download a copy if you want to keep it.'} Your transcript stays in your account.</p></>:<p>{RECORDING_RETENTION_NOTICE}</p>}
 </div>
}
