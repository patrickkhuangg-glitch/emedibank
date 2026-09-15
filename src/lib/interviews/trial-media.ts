import 'server-only'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import ffprobe from '@ffprobe-installer/ffprobe'

/** Inspect packet timestamps, not browser-supplied duration or a container header alone. */
export async function inspectTrialAudio(audio: Blob, maximumSeconds=490) {
  if(audio.size>24*1024*1024||audio.size<1)throw Error('trial_audio_size')
  const bytes=Buffer.from(await audio.arrayBuffer()),directory=await mkdtemp(join(tmpdir(),'interview-audio-'))
  try {
    const path=join(directory,'recording');await writeFile(path,bytes,{mode:0o600})
    const {stdout}=await promisify(execFile)(ffprobe.path,['-v','error','-protocol_whitelist','file','-format_whitelist','matroska,webm,mov,mp4,m4a,3gp,3g2,mj2,ogg,wav,mp3','-select_streams','a','-show_packets','-show_entries','packet=pts_time,duration_time','-of','json',path],{timeout:20000,maxBuffer:8*1024*1024})
    const packets=(JSON.parse(stdout) as {packets?:Array<{pts_time?:string;duration_time?:string}>}).packets??[]
    const times=packets.map(p=>({start:Number(p.pts_time),length:Number(p.duration_time??0)})).filter(p=>Number.isFinite(p.start)&&Number.isFinite(p.length)&&p.length>=0)
    if(!times.length)throw Error('trial_audio_unreadable')
    let first=Infinity,last=-Infinity,total=0
    for(const p of times){first=Math.min(first,p.start);last=Math.max(last,p.start+p.length);total+=p.length}
    const seconds=Math.ceil(Math.max(last-first,total))
    if(seconds<1||seconds>maximumSeconds)throw Error('trial_audio_duration')
    return {seconds,fingerprint:createHash('sha256').update(bytes).digest('hex')}
  }finally{await rm(directory,{recursive:true,force:true})}
}
