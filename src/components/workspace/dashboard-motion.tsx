'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** Native scrolling and server-rendered content remain usable without motion. */
export function DashboardMotion({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = root.current
    if (!element) return
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        element.querySelectorAll<HTMLElement>('[data-progress-reveal]').forEach(card => {
          gsap.from(card, { y: 14, opacity: .7, duration: .65, ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 96%', once: true } })
        })
        element.querySelectorAll<HTMLElement>('[data-progress-fill]').forEach(bar => {
          gsap.from(bar, { scaleX: 0, transformOrigin: 'left center', duration: .85, ease: 'power3.out',
            scrollTrigger: { trigger: bar, start: 'top 96%', once: true } })
        })
      }, element)
      return () => context.revert()
    })
    media.add('(prefers-reduced-motion: no-preference) and (min-width: 900px) and (pointer: fine)', () => {
      const context = gsap.context(() => {
        element.querySelectorAll<HTMLElement>('[data-progress-parallax]').forEach(layer => {
          gsap.fromTo(layer, { y: -16 }, { y: 20, ease: 'none', scrollTrigger: {
            trigger: layer.parentElement, start: 'top bottom', end: 'bottom top', scrub: .9,
          } })
        })
      }, element)
      return () => context.revert()
    })
    let frame = 0
    let disposed = false
    const refresh = () => {
      if (disposed) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => ScrollTrigger.refresh())
    }
    const observer = new ResizeObserver(refresh)
    observer.observe(element)
    document.fonts.ready.then(refresh)
    return () => { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); media.revert() }
  }, [])
  return <div ref={root} className={className}>{children}</div>
}
