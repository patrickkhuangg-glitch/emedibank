'use client'
// Best-effort tactile tap. Real vibration only where the platform supports it
// (mostly Android); a silent no-op elsewhere (iOS Safari) and under reduced-motion.
export function haptic(ms = 10) {
  if (typeof window === 'undefined') return
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    navigator.vibrate?.(ms)
  } catch {
    /* unsupported */
  }
}
