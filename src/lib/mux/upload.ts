import 'server-only'
import { getMux } from './client'

/** Create a Mux direct-upload for a question's explanation video (signed playback). */
export async function createVideoUpload(questionId: string, corsOrigin: string) {
  const upload = await getMux().video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: {
      playback_policy: ['signed'],
      passthrough: questionId,
      video_quality: 'basic',
    },
  })
  return { uploadId: upload.id, uploadUrl: upload.url }
}
