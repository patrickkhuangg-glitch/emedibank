/*
 * Cyto — the Studocyte study-cell mascot. One SVG whose face + accents toggle by
 * the `mood` prop (via `data-mood`), animated with pure CSS from globals.css
 * (`.cyto` rules, reduced-motion aware). Server-renderable: mood is computed from
 * the learner's stats and passed in; no client JS. See `@/lib/mascot/mood`.
 *
 * This is the expressive character (dashboard, celebrations) — the small logo
 * lockup still uses `StudocyteMark`.
 */
import type { CytoMood } from '@/lib/mascot/mood'

export function Cyto({
  mood = 'happy',
  size = 88,
  title,
  className = '',
}: {
  mood?: CytoMood
  size?: number
  title?: string
  className?: string
}) {
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const }
  return (
    <svg className={`cyto ${className}`} data-mood={mood} width={size} height={size} viewBox="0 0 100 118" {...a11y}>
      <defs>
        <radialGradient id="cyBody" cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#ff9184" /><stop offset="55%" stopColor="#f0483b" /><stop offset="100%" stopColor="#d61f27" />
        </radialGradient>
        <linearGradient id="cyFlame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ff4d4d" /><stop offset="100%" stopColor="#ffb03d" />
        </linearGradient>
        <linearGradient id="cyGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe38c" /><stop offset="100%" stopColor="#f5a623" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="110" rx="26" ry="5.5" fill="#7a1220" opacity=".16" />
      <g className="char">
        <g className="cilia">
          <path d="M36 12 q-3 -8 3 -10" stroke="#b3231f" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M64 12 q3 -8 -3 -10" stroke="#b3231f" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </g>
        <path
          d="M50 8 C70 8 80 19 84 35 C88 51 94 60 89 73 C84 88 68 96 50 96 C32 96 16 88 11 73 C6 60 12 51 16 35 C20 19 30 8 50 8 Z"
          fill="url(#cyBody)" stroke="#b3231f" strokeWidth="3"
        />
        <circle cx="62" cy="60" r="13" fill="#b3231f" opacity=".10" />
        <g className="fire"><path d="M20 84 c-6 -5 -3 -12 1 -15 c0 4 3 5 4 3 c2 -4 -1 -8 -3 -10 c9 3 13 12 9 19 c-2 4 -7 6 -11 3 Z" fill="url(#cyFlame)" /></g>
        <g className="cheeks"><ellipse cx="27" cy="62" rx="7" ry="4.6" fill="#ffd2c0" opacity=".8" /><ellipse cx="73" cy="62" rx="7" ry="4.6" fill="#ffd2c0" opacity=".8" /></g>

        <g className="eyes">
          <g className="eye-open" data-show>
            <circle cx="37" cy="50" r="11.5" fill="#fff" /><circle cx="63" cy="50" r="11.5" fill="#fff" />
            <circle cx="38.5" cy="52" r="6" fill="#1d1836" /><circle cx="64.5" cy="52" r="6" fill="#1d1836" />
            <circle cx="41" cy="49" r="2.4" fill="#fff" /><circle cx="67" cy="49" r="2.4" fill="#fff" />
          </g>
          <g className="eye-sad" data-show>
            <circle cx="37" cy="51" r="11.5" fill="#fff" /><circle cx="63" cy="51" r="11.5" fill="#fff" />
            <circle cx="37" cy="55" r="6" fill="#1d1836" /><circle cx="63" cy="55" r="6" fill="#1d1836" />
            <circle cx="39" cy="53" r="2" fill="#fff" /><circle cx="65" cy="53" r="2" fill="#fff" />
          </g>
          <g className="eye-sleepy" data-show>
            <path d="M27 50 q10 7 20 0" stroke="#1d1836" strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <path d="M53 50 q10 7 20 0" stroke="#1d1836" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          </g>
          <g className="eye-happy" data-show>
            <path d="M28 53 q9 -11 18 0" stroke="#1d1836" strokeWidth="3.6" fill="none" strokeLinecap="round" />
            <path d="M54 53 q9 -11 18 0" stroke="#1d1836" strokeWidth="3.6" fill="none" strokeLinecap="round" />
          </g>
          <g className="eye-star" data-show>
            <circle cx="37" cy="50" r="11.5" fill="#fff" /><circle cx="63" cy="50" r="11.5" fill="#fff" />
            <path transform="translate(37 50) scale(.6)" d="M0 -12 L3.3 -3.6 L12 -3 L5 3 L7.2 11.6 L0 6.5 L-7.2 11.6 L-5 3 L-12 -3 L-3.3 -3.6 Z" fill="#ffb020" />
            <path transform="translate(63 50) scale(.6)" d="M0 -12 L3.3 -3.6 L12 -3 L5 3 L7.2 11.6 L0 6.5 L-7.2 11.6 L-5 3 L-12 -3 L-3.3 -3.6 Z" fill="#ffb020" />
          </g>
        </g>

        <g className="brows">
          <path d="M28 36 q9 -3 16 2" stroke="#b3231f" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M72 36 q-9 -3 -16 2" stroke="#b3231f" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        <path className="m-smile" data-show d="M40 70 q10 9 20 0" stroke="#8a1c1c" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path className="m-neutral" data-show d="M44 72 q6 3 12 0" stroke="#8a1c1c" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path className="m-worried" data-show d="M43 73 q7 -4 14 0" stroke="#8a1c1c" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path className="m-frown" data-show d="M42 75 q8 -8 16 0" stroke="#8a1c1c" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path className="m-grin" data-show d="M35 67 Q50 85 65 67" stroke="#8a1c1c" strokeWidth="4" fill="none" strokeLinecap="round" />
        <g className="m-open" data-show>
          <ellipse cx="50" cy="74" rx="9" ry="8" fill="#6e1414" /><path d="M43 76 q7 6 14 0 Z" fill="#ff7a8f" />
        </g>

        <path className="sweat" d="M78 30 c-3 4 -5 7 -5 10 a5 5 0 0 0 10 0 c0 -3 -2 -6 -5 -10 Z" fill="#7fc4ff" />
        <path className="tear" d="M31 60 c-2.6 3.4 -4 6 -4 8.4 a4 4 0 0 0 8 0 c0 -2.4 -1.4 -5 -4 -8.4 Z" fill="#7fc4ff" />
        <g className="sparkles" fill="#ffb020">
          <path d="M84 24 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 Z" />
          <path d="M14 30 l1.2 3.4 3.4 1.2 -3.4 1.2 -1.2 3.4 -1.2 -3.4 -3.4 -1.2 3.4 -1.2 Z" />
          <path d="M80 62 l1 2.8 2.8 1 -2.8 1 -1 2.8 -1 -2.8 -2.8 -1 2.8 -1 Z" />
        </g>
        <g className="zzz" fill="#6a45c9" fontFamily="var(--font-display, sans-serif)" fontWeight="700">
          <text x="74" y="30" fontSize="11">z</text><text x="80" y="22" fontSize="9">z</text><text x="85" y="15" fontSize="7">z</text>
        </g>
        <g className="confetti">
          <rect x="24" y="18" width="5" height="5" rx="1" fill="#6a45c9" />
          <rect x="70" y="16" width="5" height="5" rx="1" fill="#ffb020" />
          <rect x="46" y="10" width="5" height="5" rx="1" fill="#1fae9c" />
          <rect x="34" y="14" width="4" height="4" rx="1" fill="#ff7a8f" />
          <rect x="60" y="12" width="4" height="4" rx="1" fill="#5b8bd0" />
        </g>
        <g className="crown">
          <path d="M35 20 L39 9 L44.5 15 L50 5.5 L55.5 15 L61 9 L65 20 Z" fill="url(#cyGold)" stroke="#d98c12" strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="34.5" y="18" width="31" height="6.2" rx="3" fill="url(#cyGold)" stroke="#d98c12" strokeWidth="1.6" />
          <circle cx="50" cy="5.5" r="2.1" fill="#fff" stroke="#d98c12" strokeWidth=".8" />
          <circle cx="39" cy="9" r="1.7" fill="#ff5a5f" /><circle cx="61" cy="9" r="1.7" fill="#ff5a5f" />
          <circle cx="43" cy="21.2" r="1.5" fill="#ff5a5f" /><circle cx="50" cy="21.2" r="1.5" fill="#fff" /><circle cx="57" cy="21.2" r="1.5" fill="#ff5a5f" />
        </g>
      </g>
    </svg>
  )
}
