'use client'

import { gsap } from 'gsap'
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { positionTour, tourCutout, type TourRect } from '@/lib/interviews/tour-position'

type Geometry = {
  key: string
  target: TourRect
  tab: TourRect | null
  viewport: { width: number; height: number }
  panel: { width: number; height: number }
}

type TourSpotlightProps = {
  target: string
  tabPath: string
  stepKey: string
  onPage: boolean
  leaving: boolean
  onClose: () => void
  children: ReactNode
}

export function TourSpotlight({ target, tabPath, stepKey, onPage, leaving, onClose, children }: TourSpotlightProps) {
  const panel = useRef<HTMLElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLSpanElement>(null)
  const tabRing = useRef<HTMLSpanElement>(null)
  const close = useRef(onClose)
  const [mounted, setMounted] = useState(false)
  const [geometry, setGeometry] = useState<Geometry | null>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => { close.current = onClose }, [onClose])

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close.current()
      }
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [])

  useEffect(() => {
    if (!onPage) return

    let element: HTMLElement | null = null
    let tabElement: HTMLElement | null = null
    let frame = 0
    let settleTimer = 0
    let fallbackTimer = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function visibleRect(node: HTMLElement | null): TourRect | null {
      if (!node?.isConnected || node.getClientRects().length === 0) return null
      const rect = node.getBoundingClientRect()
      return rect.left < window.innerWidth && rect.top < window.innerHeight && rect.right > 0 && rect.bottom > 0
        ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
        : null
    }

    function measure() {
      frame = 0
      window.clearTimeout(fallbackTimer)
      fallbackTimer = 0
      if (!element?.isConnected || !panel.current) return
      const rect = element.getBoundingClientRect()
      const card = panel.current.getBoundingClientRect()
      const next = {
        key: stepKey,
        target: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        tab: visibleRect(tabElement),
        viewport: { width: window.innerWidth, height: window.innerHeight },
        panel: { width: card.width, height: card.height },
      }
      setGeometry(previous => {
        if (!previous || previous.key !== next.key) return next
        const values = [
          previous.target.left - next.target.left,
          previous.target.top - next.target.top,
          previous.target.width - next.target.width,
          previous.target.height - next.target.height,
          previous.panel.width - next.panel.width,
          previous.panel.height - next.panel.height,
          previous.viewport.width - next.viewport.width,
          previous.viewport.height - next.viewport.height,
        ]
        return values.every(value => Math.abs(value) < 0.5) ? previous : next
      })
    }

    function measureAfterPaint() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(measure) })
    }

    function settleSoon(delay = 180) {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(measureAfterPaint, delay)
    }

    const resize = new ResizeObserver(() => settleSoon(120))

    function locate() {
      const found = document.querySelector<HTMLElement>(`[data-interview-tour="${target}"]`)
      const tabFound = Array.from(document.querySelectorAll<HTMLElement>('[data-workspace-tab]'))
        .find(node => node.dataset.workspaceTab === tabPath && node.getClientRects().length > 0) ?? null
      if (!found) return
      if (found === element && tabFound === tabElement) return

      if (element) resize.unobserve(element)
      if (tabElement) resize.unobserve(tabElement)
      element = found
      tabElement = tabFound
      resize.observe(element)
      if (tabElement) resize.observe(tabElement)

      setGeometry(null)
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduced ? 'instant' : 'smooth' })
      if (reduced) measureAfterPaint()
      else {
        settleSoon(220)
        fallbackTimer = window.setTimeout(measureAfterPaint, 1100)
      }
    }

    function onScroll() { settleSoon(200) }
    function onResize() { settleSoon(160) }

    const observer = new MutationObserver(locate)
    observer.observe(document.body, { childList: true, subtree: true })
    if (panel.current) resize.observe(panel.current)
    locate()
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)

    return () => {
      observer.disconnect()
      resize.disconnect()
      cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      window.clearTimeout(fallbackTimer)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [target, tabPath, stepKey, onPage])

  const ready = onPage && geometry?.key === stepKey
  const position = geometry ? positionTour(geometry.target, geometry.viewport, geometry.panel) : null
  const hasSpot = Boolean(position?.spot)
  const tabSpot = geometry?.tab
    ? { left: geometry.tab.left - 4, top: geometry.tab.top - 4, width: geometry.tab.width + 8, height: geometry.tab.height + 8 }
    : null

  useLayoutEffect(() => {
    if (!mounted) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealNodes = [tabRing.current, ring.current, panel.current].filter(Boolean)

    if (leaving) {
      if (reduced) gsap.set(revealNodes, { opacity: 0 })
      else gsap.to(revealNodes, { opacity: 0, duration: 0.34, ease: 'power3.in', overwrite: true })
      return
    }

    if (!ready || !hasSpot) {
      gsap.set(revealNodes, { opacity: 0 })
      return
    }

    const context = gsap.context(() => {
      if (reduced) {
        gsap.set(revealNodes, { opacity: 1 })
        gsap.set(content.current, { opacity: 1, y: 0 })
        return
      }

      const timeline = gsap.timeline({ defaults: { overwrite: true } })
      timeline
        .fromTo(tabRing.current, { opacity: 0 }, { opacity: 1, duration: 0.32, ease: 'power3.out' })
        .fromTo(ring.current, { opacity: 0 }, { opacity: 1, duration: 0.46, ease: 'power3.out' }, '-=0.12')
        .fromTo(panel.current, { opacity: 0 }, { opacity: 1, duration: 0.58, ease: 'power3.out' }, '-=0.28')
        .fromTo(content.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.82, ease: 'power4.out' }, '-=0.48')
    })
    return () => context.revert()
  }, [hasSpot, leaving, mounted, ready, stepKey])

  useEffect(() => {
    if (ready && !leaving) panel.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }, [ready, leaving, stepKey])

  const panelStyle: CSSProperties = position ? { transform: `translate3d(${position.x}px,${position.y}px,0)` } : {}
  const ringStyle: CSSProperties = position?.spot ? {
    transform: `translate3d(${position.spot.left}px,${position.spot.top}px,0)`,
    width: position.spot.width,
    height: position.spot.height,
  } : {}
  const tabRingStyle: CSSProperties = tabSpot ? {
    transform: `translate3d(${tabSpot.left}px,${tabSpot.top}px,0)`,
    width: tabSpot.width,
    height: tabSpot.height,
  } : {}
  const arrowStyle: CSSProperties = position ? {
    [position.side === 'top' || position.side === 'bottom' ? 'left' : 'top']: position.arrow,
  } : {}

  const overlay = <>
    <div
      aria-hidden="true"
      className="interview-tour-shade"
      style={{
        clipPath: ready && position?.spot
          ? tourCutout(position.spot, geometry!.viewport.width, geometry!.viewport.height, tabSpot ? [tabSpot] : [])
          : undefined,
      }}
    />
    <div className="interview-tour-layer">
      {ready && position?.spot ? <span ref={ring} aria-hidden="true" className="interview-tour-ring" style={ringStyle} /> : null}
      {ready && geometry?.tab ? <span ref={tabRing} aria-hidden="true" className="interview-tour-tab-ring" style={tabRingStyle} /> : null}
      <aside
        ref={panel}
        aria-label="Interview workspace tour"
        aria-hidden={!ready || leaving}
        inert={!ready || leaving}
        className="interview-tour-panel"
        style={panelStyle}
      >
        {ready && position?.spot ? <span aria-hidden="true" className={`interview-tour-pointer from-${position.side}`} style={arrowStyle} /> : null}
        <div ref={content}>{children}</div>
      </aside>
    </div>
    {!ready && !leaving ? <div className="interview-tour-route-progress" role="status"><span>Moving to the next tab</span><i aria-hidden="true" /></div> : null}
    <style>{`
      .interview-tour-shade{position:fixed;inset:0;z-index:88;background:rgb(29 22 47 / 15%);pointer-events:none;transition:clip-path 900ms cubic-bezier(.77,0,.175,1),opacity 360ms ease}
      .interview-tour-layer{position:fixed;inset:0;z-index:90;overflow:clip;pointer-events:none}
      .interview-tour-ring,.interview-tour-tab-ring{position:absolute;left:0;top:0;will-change:transform,opacity;transition:transform 900ms cubic-bezier(.77,0,.175,1)}
      .interview-tour-ring{border:3px solid var(--brand);border-radius:20px;box-shadow:0 0 0 5px color-mix(in srgb,var(--brand) 14%,transparent),0 16px 44px rgb(62 42 126 / 16%)}
      .interview-tour-tab-ring{border:2px solid var(--brand);border-radius:14px;box-shadow:0 0 0 4px color-mix(in srgb,var(--brand) 12%,transparent)}
      .interview-tour-panel{position:absolute;pointer-events:auto;left:0;top:0;width:min(390px,calc(100vw - 32px));max-height:calc(100dvh - 32px);display:flex;flex-direction:column;border-radius:16px;background:var(--surface);color:var(--foreground);padding:20px;box-shadow:0 18px 54px rgb(29 22 47 / 18%);opacity:0;will-change:transform,opacity;transition:transform 900ms cubic-bezier(.77,0,.175,1)}
      .interview-tour-panel[aria-hidden="true"]{pointer-events:none}
      .interview-tour-panel h2{outline:none}
      .interview-tour-copy{overflow-y:auto;min-height:0;max-height:calc(48dvh - 142px);overscroll-behavior:contain}
      .interview-tour-pointer{position:absolute;width:16px;height:16px;background:var(--surface);border-radius:3px;pointer-events:none}
      .interview-tour-pointer.from-top{top:-7px;transform:translateX(-50%) rotate(45deg)}
      .interview-tour-pointer.from-bottom{bottom:-7px;transform:translateX(-50%) rotate(45deg)}
      .interview-tour-pointer.from-left{left:-7px;transform:translateY(-50%) rotate(45deg)}
      .interview-tour-pointer.from-right{right:-7px;transform:translateY(-50%) rotate(45deg)}
      .interview-tour-route-progress{position:fixed;left:50%;top:16px;z-index:91;width:min(260px,calc(100vw - 32px));transform:translateX(-50%);overflow:hidden;border:1px solid color-mix(in srgb,var(--brand) 18%,var(--border));border-radius:999px;background:var(--surface);padding:9px 14px 11px;color:var(--muted);font-size:12px;font-weight:650;text-align:center;box-shadow:0 10px 30px rgb(29 22 47 / 12%)}
      .interview-tour-route-progress i{position:absolute;left:0;bottom:0;height:2px;width:45%;background:var(--brand);animation:interview-tour-travel 1.1s cubic-bezier(.77,0,.175,1) infinite}
      @keyframes interview-tour-travel{0%{transform:translateX(-110%)}100%{transform:translateX(330%)}}
      @media(min-width:640px){.interview-tour-panel{padding:24px}.interview-tour-copy{max-height:calc(65dvh - 166px)}}
      @media(prefers-reduced-motion:reduce){.interview-tour-shade,.interview-tour-ring,.interview-tour-tab-ring,.interview-tour-panel{transition:none}.interview-tour-route-progress i{animation:none;left:0;width:100%}}
    `}</style>
  </>

  return mounted ? createPortal(overlay, document.body) : null
}
