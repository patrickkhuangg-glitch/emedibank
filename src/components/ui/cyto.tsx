/* Cyto: one server-renderable SVG; expression and props are selected by data-mood. */
import { useId } from 'react'
import type { CytoMood } from '@/lib/mascot/mood'

export function Cyto({ mood = 'happy', size = 88, title, className = '' }: {
  mood?: CytoMood
  size?: number
  title?: string
  className?: string
}) {
  const bodyId = `cyto-body-${useId().replace(/:/g, '')}`
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const }
  return (
    <svg className={`cyto ${className}`} data-mood={mood} width={size} height={size} viewBox="-10 -14 120 132" {...a11y}>
      <defs><radialGradient id={bodyId} cx="38%" cy="28%" r="78%"><stop offset="0%" stopColor="#ff8880" /><stop offset="72%" stopColor="#ff6f66" /><stop offset="100%" stopColor="#f25c53" /></radialGradient></defs>
      <ellipse className="cyto-shadow" cx="50" cy="102" rx="25" ry="4.5" fill="#311e35" opacity=".12" />
      <g className="char">
        <g className="cyto-antenna" fill="none" stroke="#0b9e9a" strokeLinecap="round" strokeWidth="4"><path d="M50 2V-7" /><path d="M50-5l-6-6M50-5l6-6" /></g>
        <ellipse className="cyto-foot cyto-foot-left" cx="38" cy="94" rx="8" ry="5" fill="#e94d3e" /><ellipse className="cyto-foot cyto-foot-right" cx="62" cy="94" rx="8" ry="5" fill="#e94d3e" />
        <circle cx="50" cy="48" r="42" fill={`url(#${bodyId})`} /><circle cx="50" cy="48" r="35.5" fill="none" stroke="#ffaaa4" strokeWidth="2.2" opacity=".72" />
        <path d="M17 66c-5 2-7 8-4 11 2 2 5 1 7-1" fill="#f25c53" /><circle cx="73" cy="25" r="9.5" fill="#ff8f88" opacity=".78" /><circle cx="76" cy="22" r="3.4" fill="#ffb0aa" opacity=".9" />
        <circle cx="29" cy="61" r="5.6" fill="#e95d55" opacity=".7" /><circle cx="71" cy="61" r="5.6" fill="#e95d55" opacity=".7" /><circle cx="35" cy="72" r="1.3" fill="#ffb0aa" />
        <g className="eyes">
          <g className="eye-open" data-show><ellipse cx="40" cy="48" rx="7.8" ry="10" fill="#fff" /><ellipse cx="60" cy="48" rx="7.8" ry="10" fill="#fff" /><circle cx="42" cy="50" r="4.5" fill="#17162c" /><circle cx="62" cy="50" r="4.5" fill="#17162c" /><circle cx="43.5" cy="47.5" r="1.6" fill="#fff" /><circle cx="63.5" cy="47.5" r="1.6" fill="#fff" /></g>
          <g className="eye-sleepy" data-show fill="none" stroke="#17162c" strokeLinecap="round" strokeWidth="3"><path d="M34 49q6 5 12 0M54 49q6 5 12 0" /></g>
          <g className="eye-happy" data-show fill="none" stroke="#17162c" strokeLinecap="round" strokeWidth="3"><path d="M34 51q6-7 12 0M54 51q6-7 12 0" /></g>
          <g className="eye-star" data-show fill="#17162c"><path d="M40 39l2.2 6.2 6.2 2.2-6.2 2.2L40 56l-2.2-6.4-6.2-2.2 6.2-2.2zM60 39l2.2 6.2 6.2 2.2-6.2 2.2L60 56l-2.2-6.4-6.2-2.2 6.2-2.2z" /></g>
        </g>
        <g className="brows" fill="none" stroke="#17162c" strokeLinecap="round" strokeWidth="2.8"><path d="M33 37l12-3M67 37l-12-3" /></g>
        <path className="m-smile" data-show d="M42 64q8 8 16 0" fill="none" stroke="#17162c" strokeLinecap="round" strokeWidth="3.4" /><path className="m-neutral" data-show d="M46 66h8" fill="none" stroke="#17162c" strokeLinecap="round" strokeWidth="3" /><path className="m-worried" data-show d="M43 68q7-6 14 0" fill="none" stroke="#17162c" strokeLinecap="round" strokeWidth="3" /><path className="m-frown" data-show d="M42 69q8-8 16 0" fill="none" stroke="#17162c" strokeLinecap="round" strokeWidth="3" />
        <g className="m-open" data-show><path d="M41 61q9 13 18 0z" fill="#17162c" /><path d="M45 68q5 3 10 0" fill="none" stroke="#ff9f98" strokeLinecap="round" strokeWidth="2" /></g>
        <g className="cyto-glasses" fill="none" stroke="#17223e" strokeWidth="2.2"><circle cx="39" cy="48" r="9" /><circle cx="61" cy="48" r="9" /><path d="M48 48h4M30 46l-5-2" /></g>
        <g className="cyto-book"><path d="M30 67q10-4 20 1v18q-10-5-20-1zM70 67q-10-4-20 1v18q10-5 20-1z" fill="#129b9b" /><path d="M50 68v18" stroke="#fff" strokeWidth="1.5" /></g>
        <g className="cyto-question"><circle cx="76" cy="34" r="8" fill="#fff" /><text x="76" y="38" fill="#6a45c9" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700" textAnchor="middle">?</text></g>
        <g className="cyto-correct"><circle cx="78" cy="32" r="8" fill="#18ae78" /><path d="M74 32l3 3 5-7" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" /></g>
        <g className="cyto-incorrect"><circle cx="78" cy="32" r="8" fill="#e74643" /><path d="M74 28l8 8M82 28l-8 8" stroke="#fff" strokeLinecap="round" strokeWidth="2.4" /></g>
        <path className="sweat" d="M75 40c-3 4-4 6-4 8a4 4 0 008 0c0-2-1-4-4-8z" fill="#36bfe5" />
        <g className="zzz" fill="#6a45c9" fontFamily="var(--font-display)" fontWeight="700"><text x="76" y="35" fontSize="9">z</text><text x="82" y="27" fontSize="7">z</text></g>
        <g className="sparkles" fill="#f5a623"><path d="M81 26l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z" /><path d="M18 39l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" /></g>
        <g className="confetti" fill="#6a45c9"><circle cx="27" cy="15" r="2" /><rect x="68" y="14" width="4" height="4" rx="1" fill="#0b9e9a" /><rect x="79" y="22" width="4" height="4" rx="1" fill="#f5a623" /></g>
        <g className="fire"><path d="M48-1c-3-5 1-10 4-12-1 5 4 6 4 1 5 4 6 11 1 15-3 3-7 3-10 0-1-1-1-3 1-4z" fill="#ff8b27" /><path d="M51 0c-1-3 1-5 3-7 0 3 2 4 3 5 1 3-4 5-6 2z" fill="#ffd34e" /></g>
        <g className="crown"><path d="M34 17l4-11 6 7 6-11 6 11 6-7 4 11z" fill="#f7b52c" stroke="#e5961d" strokeLinejoin="round" strokeWidth="1.5" /><rect x="34" y="16" width="32" height="6" rx="3" fill="#f7b52c" stroke="#e5961d" strokeWidth="1.5" /></g>
      </g>
    </svg>
  )
}
