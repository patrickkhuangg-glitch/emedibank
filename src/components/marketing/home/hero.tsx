'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Container } from '@/components/container'
import { ProgressHero } from '@/components/progress-hero'
import styles from '@/app/(marketing)/home.module.css'

/** Native scrolling, with one short product story on roomy desktop screens.
 * The content and manual preview controls also work without the scroll effect. */
export function HomeHero({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null)
  const visual = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(2)

  useEffect(() => {
    const section = root.current
    const figure = visual.current
    if (!section || !figure) return
    gsap.registerPlugin(ScrollTrigger)
    const media = gsap.matchMedia()
    media.add('(min-width: 1024px) and (min-height: 800px) and (prefers-reduced-motion: no-preference)', () => {
      section.dataset.scrollStory = 'true'
      let lastScene = -1
      gsap.fromTo(figure, { rotateY: -5, rotateZ: 1.5, scale: 0.97, transformPerspective: 1400 }, {
        rotateY: 0, rotateZ: 0, scale: 1, ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top+=64', end: 'bottom bottom', scrub: 0.9,
          invalidateOnRefresh: true,
          onUpdate: ({ progress }) => {
            const scene = progress < 0.33 ? 0 : progress < 0.7 ? 1 : 2
            if (scene !== lastScene) { lastScene = scene; setActive([2, 1, 0][scene]) }
          },
        },
      })
      return () => { delete section.dataset.scrollStory }
    })
    return () => media.revert()
  }, [])

  return (
    <section ref={root} className={styles.heroStory} aria-labelledby="home-title">
      <div className={styles.heroSticky}>
        <div className={styles.heroScenery} aria-hidden="true"><span data-cinematic-parallax="80" className={styles.heroOrbit}/><span data-cinematic-parallax="-45" className={styles.heroDot}/></div>
        <Container className={styles.hero}>
          <div className={styles.copy}>{children}</div>
          <div className={styles.heroVisual} data-cinematic-enter="preview">
            <div ref={visual} className={styles.heroFigure}>
              <ProgressHero active={active} onSelect={setActive} />
            </div>
            <a href="#interface" className={styles.scrollHint}>Scroll to explore <span aria-hidden="true">↓</span></a>
          </div>
        </Container>
      </div>
    </section>
  )
}
