'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import styles from './cinematic-page.module.css'
import { StoryPreloader } from './story-preloader'

gsap.registerPlugin(ScrollTrigger)

/** Motion enhances readable HTML, with bounded introductions and native touch scrolling. */
export function CinematicPage({ children, className, revealSelector = '[data-home-reveal]', story = 'home' }: {
  children: ReactNode
  className: string
  revealSelector?: string
  story?: 'home' | 'interview'
}) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const page = root.current
    if (!page) return
    let disposed = false
    let settled = false
    const seen = new WeakSet<HTMLElement>()
    let refreshFrame = 0
    const media = gsap.matchMedia()
    const refresh = () => {
      if (disposed || refreshFrame) return
      refreshFrame = requestAnimationFrame(() => { refreshFrame = 0; ScrollTrigger.refresh() })
    }
    // Direct anchors and restored positions should not replay the opening scene.
    if (location.hash || window.scrollY > 80) page.dataset.motionQuiet = 'true'
    media.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 1024px) and (pointer: fine)' }, context => {
      if (!context.conditions?.motion || settled) return
      let lenis: Lenis | undefined
      const tick = (time: number) => lenis?.raf(time * 1000)
      if (context.conditions?.desktop) {
        lenis = new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1, anchors: true, allowNestedScroll: true })
        lenis.on('scroll', ScrollTrigger.update)
        gsap.ticker.add(tick)
      }
      const animations = gsap.context(() => {
        // Group siblings into one deliberate entrance, rather than a ripple per line.
        const groups = new Map<Element, HTMLElement[]>()
        page.querySelectorAll<HTMLElement>(revealSelector).forEach(element => {
          if (element.matches('[data-stack-card]') || element.querySelector('[data-story-word]') || seen.has(element) || element.getBoundingClientRect().top < innerHeight) return
          const parent = element.parentElement ?? element
          groups.set(parent, [...(groups.get(parent) ?? []), element])
        })
        groups.forEach(targets => {
          const tween = gsap.fromTo(targets, { y: 32, opacity: 0, filter: 'blur(4px)' }, {
            y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.95, stagger: 0.08,
            ease: 'power3.out', paused: true, immediateRender: false,
            onComplete: () => { gsap.set(targets, { clearProps: 'transform,opacity,filter' }) },
          })
          ScrollTrigger.create({ trigger: targets[0], start: 'top 92%', once: true, onEnter: () => { targets.forEach(target => seen.add(target)); tween.play() } })
        })
        page.querySelectorAll<HTMLElement>('[data-scroll-phrase]').forEach(phrase => {
          gsap.fromTo(phrase.querySelectorAll('[data-story-word]'), { color: '#a399b7' }, {
            color: '#6540ba', stagger: 0.25, ease: 'none', scrollTrigger: {
              trigger: phrase, start: 'top 82%', end: 'bottom 42%', scrub: 0.8,
            },
          })
        })
        if (context.conditions?.desktop) {
          page.querySelectorAll<HTMLElement>('[data-cinematic-parallax]').forEach(element => {
            const travel = Number(element.dataset.cinematicParallax) || 52
            gsap.fromTo(element, { y: travel * 0.55 }, { y: -travel, ease: 'none', scrollTrigger: {
              trigger: element.closest('section'), start: 'top bottom', end: 'bottom top', scrub: 1,
              invalidateOnRefresh: true,
            } })
          })
          page.querySelectorAll<HTMLElement>('[data-story-stack]').forEach(stack => {
            const cards = Array.from(stack.querySelectorAll<HTMLElement>('[data-stack-card]'))
            cards.forEach((card, index) => {
              if (!cards[index + 1]) return
              gsap.to(card, { scale: 0.94, y: -12, ease: 'none', scrollTrigger: {
                trigger: cards[index + 1], start: 'top 78%', end: 'top 24%', scrub: 1,
              } })
            })
          })
          page.querySelectorAll<HTMLElement>('[data-footer-reveal]').forEach(footer => {
            gsap.fromTo(footer, { y: 52, opacity: 0.65 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: {
              trigger: footer.closest('section'), start: 'top bottom', end: 'top 55%', scrub: 1,
            } })
          })
        }
      }, page)
      const stopSmooth = () => { gsap.ticker.remove(tick); lenis?.destroy(); lenis = undefined }
      const settle = () => {
        page.dataset.motionQuiet = 'true'
        settled = true
        animations.revert()
        stopSmooth()
      }
      const onKey = (event: KeyboardEvent) => {
        if (['Escape', 'Tab', 'Home', 'End', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) settle()
      }
      const onFocus = (event: FocusEvent) => { if (event.target instanceof Element && event.target.matches(':focus-visible')) settle() }
      const onVisibility = () => { if (document.hidden) lenis?.stop(); else { lenis?.start(); refresh() } }
      window.addEventListener('keydown', onKey)
      page.addEventListener('focusin', onFocus)
      document.addEventListener('visibilitychange', onVisibility)
      return () => {
        animations.revert()
        stopSmooth()
        window.removeEventListener('keydown', onKey)
        page.removeEventListener('focusin', onFocus)
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }, page)
    let lastWidth = 0, lastHeight = 0
    const resize = new ResizeObserver(entries => {
      const box = entries[0].contentRect
      if (box.width === lastWidth && box.height === lastHeight) return
      lastWidth = box.width; lastHeight = box.height; refresh()
    })
    resize.observe(page)
    document.fonts.ready.then(refresh)
    page.addEventListener('load', refresh, true)
    return () => {
      disposed = true
      cancelAnimationFrame(refreshFrame)
      resize.disconnect()
      page.removeEventListener('load', refresh, true)
      media.revert()
    }
  }, [revealSelector])
  return <div ref={root} className={`${styles.root} ${className}`} data-cinematic-story={story}>
    <StoryPreloader story={story} onSkip={() => { if (root.current) root.current.dataset.introSkipped = 'true' }} />
    {children}
  </div>
}

export function CinematicHeading({ first, second, id }: { first: string; second: string; id?: string }) {
  return <h1 id={id} className={styles.headline} aria-label={`${first} ${second}`}>
    <span className={styles.line} aria-hidden="true"><span className={styles.words}>{first}</span></span>
    <span className={`${styles.line} ${styles.accent}`} aria-hidden="true"><span className={styles.words}>{second}</span></span>
  </h1>
}

export function ScrollPhrase({ children, className = '' }: { children: string; className?: string }) {
  return <h2 className={`${styles.scrollPhrase} ${className}`} data-scroll-phrase aria-label={children}>
    {children.split(' ').map((word, index) => <span data-story-word aria-hidden="true" key={index}>{word}{' '}</span>)}
  </h2>
}
