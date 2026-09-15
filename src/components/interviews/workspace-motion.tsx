'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** Progressive motion for interview workspaces; native scrolling remains untouched. */
export function InterviewWorkspaceMotion({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = root.current
    if (!element) return

    let refreshFrame = 0
    let disposed = false
    const media = gsap.matchMedia()
    const refresh = () => {
      if (disposed || refreshFrame) return
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0
        ScrollTrigger.refresh()
      })
    }

    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        element.querySelectorAll<HTMLElement>('[data-interview-scroll-reveal]').forEach((item) => {
          gsap.fromTo(item, { y: 22, opacity: 0, filter: 'blur(5px)' }, {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: .86,
            ease: 'power3.out',
            immediateRender: false,
            scrollTrigger: { trigger: item, start: 'top 93%', once: true },
            onComplete: () => gsap.set(item, { clearProps: 'transform,opacity,filter' }),
          })
        })
      }, element)
      return () => context.revert()
    })

    media.add('(prefers-reduced-motion: no-preference) and (min-width: 900px) and (pointer: fine)', () => {
      const context = gsap.context(() => {
        element.querySelectorAll<HTMLElement>('[data-interview-parallax]').forEach((layer) => {
          const travel = Number(layer.dataset.interviewParallax) || 18
          gsap.fromTo(layer, { y: travel * .45 }, { y: -travel, ease: 'none', scrollTrigger: {
            trigger: layer.closest('[data-interview-parallax-section]') ?? layer.parentElement,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.05,
            invalidateOnRefresh: true,
          } })
        })
      }, element)
      return () => context.revert()
    })

    const observer = new ResizeObserver(refresh)
    observer.observe(element)
    document.fonts.ready.then(refresh)

    return () => {
      disposed = true
      cancelAnimationFrame(refreshFrame)
      observer.disconnect()
      media.revert()
    }
  }, [])

  return <div ref={root} className={className}>{children}</div>
}
