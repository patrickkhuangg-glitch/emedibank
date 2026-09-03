'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || 'G-886N2HS3Q2'
const CONSENT_COOKIE = 'em_analytics_consent'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180

type AnalyticsConsent = 'granted' | 'denied' | null
type AnalyticsParameters = Record<string, string | number | boolean>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    __emeducateAnalyticsStarted?: boolean
  }
}

function readConsent(): AnalyticsConsent {
  if (typeof document === 'undefined') return null
  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
    ?.split('=')[1]
  return value === 'granted' || value === 'denied' ? value : null
}

function writeConsent(value: Exclude<AnalyticsConsent, null>) {
  const onProductionDomain = window.location.hostname === 'emeducate.com.au'
    || window.location.hostname.endsWith('.emeducate.com.au')
  const productionAttributes = onProductionDomain ? '; Domain=.emeducate.com.au; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${productionAttributes}`
}

function subscribeToConsent(onChange: () => void) {
  window.addEventListener('emeducate-analytics-consent', onChange)
  return () => window.removeEventListener('emeducate-analytics-consent', onChange)
}

function subscribeToLocation() {
  return () => undefined
}

function initialiseQueue() {
  window.dataLayer ??= []
  window.gtag ??= (...args: unknown[]) => { window.dataLayer?.push(args) }
}

function sendPageView(pathname = window.location.pathname) {
  window.gtag?.('event', 'page_view', {
    page_location: `${window.location.origin}${pathname}`,
    page_title: document.title,
  })
}

function startAnalytics() {
  if (!MEASUREMENT_ID || window.__emeducateAnalyticsStarted) return
  window.__emeducateAnalyticsStarted = true
  initialiseQueue()
  window.gtag?.('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  window.gtag?.('consent', 'update', { analytics_storage: 'granted' })
  window.gtag?.('js', new Date())
  window.gtag?.('config', MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: 'emeducate.com.au',
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  document.head.appendChild(script)
}

function revokeAnalytics() {
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
  const analyticsCookies = ['_ga', ...(MEASUREMENT_ID ? [`_ga_${MEASUREMENT_ID.replace(/^G-/, '')}`] : [])]
  analyticsCookies.forEach((name) => {
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.emeducate.com.au; SameSite=Lax; Secure`
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
  })
}

export function trackAnalyticsEvent(name: string, parameters: AnalyticsParameters = {}) {
  if (!MEASUREMENT_ID || typeof window === 'undefined' || readConsent() !== 'granted') return
  startAnalytics()
  window.gtag?.('event', name, parameters)
}

function trackOnce(name: string, parameters: AnalyticsParameters = {}) {
  const key = `studocyte_analytics_${name}`
  if (window.sessionStorage.getItem(key)) return
  window.sessionStorage.setItem(key, 'sent')
  trackAnalyticsEvent(name, parameters)
}

export function Analytics() {
  const pathname = usePathname()
  const consent = useSyncExternalStore(subscribeToConsent, readConsent, () => null)
  const search = useSyncExternalStore(subscribeToLocation, () => window.location.search, () => '')
  const [editing, setEditing] = useState(false)
  const previousPath = useRef<string | null>(null)
  const publicPage = pathname === '/' || pathname === '/pricing' || pathname === '/signup' || pathname === '/login'
  const conversionReturn = pathname === '/dashboard'
    && (search.includes('signup=success') || search.includes('checkout=success'))
  const analyticsAllowedOnPage = publicPage || conversionReturn

  useEffect(() => {
    if (consent !== 'granted' || !analyticsAllowedOnPage) return
    startAnalytics()

    if (publicPage && previousPath.current !== pathname) sendPageView(pathname)
    previousPath.current = pathname

    const params = new URLSearchParams(search)
    if (pathname === '/dashboard' && params.get('signup') === 'success') {
      trackOnce('signup_completed', { method: 'account_created' })
    }
    if (pathname === '/dashboard' && params.get('checkout') === 'success') {
      trackOnce('subscription_checkout_completed')
    }
  }, [analyticsAllowedOnPage, consent, pathname, publicPage, search])

  if (!MEASUREMENT_ID || !analyticsAllowedOnPage) return null

  const choose = (value: Exclude<AnalyticsConsent, null>) => {
    writeConsent(value)
    setEditing(false)
    window.dispatchEvent(new Event('emeducate-analytics-consent'))
    if (value === 'granted') {
      previousPath.current = null
      if (window.__emeducateAnalyticsStarted) {
        window.gtag?.('consent', 'update', { analytics_storage: 'granted' })
      }
    } else {
      revokeAnalytics()
    }
  }

  if (consent === null || editing) {
    return (
      <aside className="fixed inset-x-4 bottom-4 z-[100] ml-auto grid max-w-2xl gap-4 rounded-2xl border border-border bg-surface p-5 text-foreground shadow-2xl sm:grid-cols-[1fr_auto] sm:items-center" aria-label="Analytics preferences">
        <div>
          <strong className="font-display text-lg">Optional analytics</strong>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">Allow anonymous usage measurement so we can understand which pages lead to signups. Names, contact details and answers are never sent to analytics. <a className="underline underline-offset-2" href="https://emeducate.com.au/privacy">Privacy notice</a></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full border border-border px-4 py-2 text-xs font-semibold" type="button" onClick={() => choose('denied')}>Decline</button>
          <button className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-ink-foreground" type="button" onClick={() => choose('granted')}>Allow analytics</button>
        </div>
      </aside>
    )
  }

  return <button className="fixed bottom-3 left-3 z-[99] rounded-full border border-border bg-surface/95 px-3 py-2 text-[11px] font-semibold text-muted shadow-sm" type="button" onClick={() => setEditing(true)}>Privacy choices</button>
}
