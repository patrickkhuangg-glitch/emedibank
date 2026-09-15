'use client'

import { useState } from 'react'
import { Cyto } from '@/components/ui/cyto'
import styles from './cinematic-page.module.css'

/** CSS guarantees dismissal even if hydration or an asset fails. */
export function StoryPreloader({ story, onSkip }: { story: 'home' | 'interview'; onSkip: () => void }) {
  const [finished, setFinished] = useState(false)
  if (finished) return null
  return <div className={styles.preloader} data-story={story} aria-label="Page introduction"
    onAnimationEnd={event => {
      if (event.target === event.currentTarget && event.animationName.includes('loader-retire')) setFinished(true)
    }}>
    <div className={styles.loaderContent} aria-hidden="true">
      <span className={styles.loaderBrand}>Studocyte{story === 'interview' && <span> Interviews</span>}</span>
      {story === 'home' ? <><div className={styles.loaderCyto}><Cyto size={100} mood="focused" /></div><strong>Find your rhythm.</strong><p>Practice. Feedback. Progress.</p></> : <><span className={styles.loaderBreath}/><strong>Take a breath.</strong><p>Your next answer starts with you.</p></>}
      <span className={styles.loaderTrack}><span/></span>
    </div>
    <button className={styles.loaderSkip} onClick={() => { onSkip(); setFinished(true) }}>Skip introduction <span aria-hidden="true">↗</span></button>
  </div>
}
