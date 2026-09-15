const origin = process.argv[2] || process.env.STAGING_URL

if (!origin) {
  console.error('Provide the staging origin as an argument or STAGING_URL.')
  process.exit(1)
}

let base
try {
  base = new URL(origin)
  if (base.protocol !== 'https:' || base.pathname !== '/' || base.search || base.hash) throw Error()
} catch {
  console.error('The staging origin must be an HTTPS origin without a path.')
  process.exit(1)
}

const failures = []
const request = async (path) => {
  try {
    return await fetch(new URL(path, base), {
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    failures.push(`${path} could not be reached`)
    return null
  }
}

const [home, robots, health] = await Promise.all([
  request('/'),
  request('/robots.txt'),
  request('/api/health'),
])

if (home) {
  if (!home.ok) failures.push(`/ returned HTTP ${home.status}`)
  const tag = home.headers.get('x-robots-tag') ?? ''
  if (!tag.includes('noindex')) failures.push('/ is missing the noindex response header')
  const html = await home.text()
  if (!html.includes('Test data and test actions only')) failures.push('/ is missing the staging banner')
}

if (robots) {
  if (!robots.ok) failures.push(`/robots.txt returned HTTP ${robots.status}`)
  const body = await robots.text()
  if (!/User-Agent:\s*\*/i.test(body) || !/Disallow:\s*\//i.test(body)) {
    failures.push('/robots.txt does not block all crawlers')
  }
  if (/Sitemap:/i.test(body)) failures.push('/robots.txt exposes a sitemap')
}

if (health) {
  let body
  try { body = await health.json() } catch {}
  if (!health.ok) failures.push(`/api/health returned HTTP ${health.status}`)
  if (body?.environment !== 'staging') failures.push('/api/health does not identify staging')
  if (body?.checks?.isolation !== 'ok') failures.push('/api/health reports failed isolation')
  if (body?.checks?.database !== 'ok') failures.push('/api/health reports an unavailable database')
}

if (failures.length) {
  console.error('Staging readiness failed:\n' + failures.map((item) => `- ${item}`).join('\n'))
  process.exit(1)
}

console.log(`Staging readiness passed for ${base.origin}.`)
