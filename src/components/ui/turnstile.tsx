'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Script from 'next/script'

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void; theme: 'light' }) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

export function Turnstile({ onTokenChange }: { onTokenChange: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const elementId = useId().replace(/:/g, '')
  const widgetId = useRef<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!siteKey || !loaded || !window.turnstile || widgetId.current) return
    const element = document.getElementById(elementId)
    if (!element) return
    widgetId.current = window.turnstile.render(element, {
      sitekey: siteKey,
      theme: 'light',
      callback: (token) => { setFailed(false); onTokenChange(token) },
      'expired-callback': () => onTokenChange(''),
      'error-callback': () => { setFailed(true); onTokenChange('') },
    })
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [elementId, loaded, onTokenChange, siteKey])

  if (!siteKey) return <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs leading-5 text-muted">Signup protection is being configured. Please try again shortly.</p>
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setLoaded(true)} /><div id={elementId} className="min-h-[65px]" />{failed ? <p className="text-xs text-muted">Security check failed to load. Please refresh and try again.</p> : null}</>
}
