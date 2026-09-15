// Removed body-proxy upload. All new recording callers use initiate → direct TUS → finalise.
export async function POST() { return Response.json({error:'Please refresh and use the camera recording workflow.'},{status:410}) }
