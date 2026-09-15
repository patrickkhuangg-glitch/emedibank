export const CAPTURE_CONSTRAINTS:MediaStreamConstraints={
 video:{facingMode:'user',width:{ideal:1280,max:1280},height:{ideal:720,max:720},frameRate:{ideal:24,max:30}},
 audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
}
export function recordingTypes(supported:(type:string)=>boolean) {
 const video=['video/webm;codecs=vp8,opus','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'].find(supported)
 const audio=['audio/webm;codecs=opus','audio/mp4'].find(supported)
 if(!video)throw new Error('This browser cannot record a supported video. Please try a current Chrome, Safari or Edge browser.')
 return {video,audio}
}
export function prepareRecorders(stream:MediaStream) {
 const types=recordingTypes(type=>MediaRecorder.isTypeSupported(type))
 const video=new MediaRecorder(stream,{mimeType:types.video,videoBitsPerSecond:1200000,audioBitsPerSecond:64000})
 let audio:MediaRecorder|null=null
 try{if(types.audio)audio=new MediaRecorder(new MediaStream(stream.getAudioTracks()),{mimeType:types.audio,audioBitsPerSecond:64000})}catch{audio=null}
 return {video,audio}
}
export type LocalRecording={video:Blob;audio:Blob|null;durationSeconds:number}
export function startRecording(recorders:ReturnType<typeof prepareRecorders>,onVideoError:()=>void) {
 const {video,audio}=recorders
 const started=performance.now(),videoChunks:Blob[]=[],audioChunks:Blob[]=[]
 let audioFailed=false,stopped:Promise<LocalRecording>|null=null
 let videoDone!:()=>void,audioDone!:()=>void
 const videoStopped=new Promise<void>(r=>{videoDone=r}),audioStopped=new Promise<void>(r=>{audioDone=r})
 video.ondataavailable=e=>{if(e.data.size)videoChunks.push(e.data)}
 video.onstop=videoDone
 video.onerror=()=>onVideoError()
 if(audio){audio.ondataavailable=e=>{if(e.data.size)audioChunks.push(e.data)};audio.onstop=audioDone;audio.onerror=()=>{audioFailed=true;audioDone()}}
 video.start(1000)
 try{if(audio)audio.start(1000);else audioDone()}catch{audioFailed=true;audioDone()}
 return {started,stop:()=>{
 if(stopped)return stopped
 const durationSeconds=(performance.now()-started)/1000
 stopped=(async()=>{
 if(video.state!=='inactive')video.stop();else videoDone()
 if(audio&&audio.state!=='inactive')audio.stop();else audioDone()
 await Promise.all([videoStopped,audioStopped])
 return {video:new Blob(videoChunks,{type:video.mimeType}),audio:!audioFailed&&audio&&audioChunks.length?new Blob(audioChunks,{type:audio.mimeType}):null,durationSeconds}
 })()
 return stopped
 }}
}
