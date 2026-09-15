const serverEndpoints = new Set(['/api/stripe/webhook','/api/zoom/webhook','/api/mux/webhook','/api/internal/interviews/process','/api/internal/interviews/cleanup'])
export function allowsRequestOrigin(request: Request, canonicalOrigin: string | undefined): boolean {
  if (['GET','HEAD','OPTIONS'].includes(request.method)) return true
  if (serverEndpoints.has(new URL(request.url).pathname)) return true // Each authenticates its own signature/bearer secret.
  if (!canonicalOrigin) return false
  try {return request.headers.get('origin') === new URL(canonicalOrigin).origin}
  catch {return false}
}
