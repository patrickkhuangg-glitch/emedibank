/*
 * The Studocyte mark — one wavy-membrane cell silhouette in two registers:
 *   • playful — the mascot with eyes + smile (marketing, dashboard, celebrations)
 *   • clean   — faceless membrane + nucleus, single-colour via currentColor
 *               (exam / focus mode, favicon, print)
 *
 * The clean variant inherits the current text colour, so it drops into any ground.
 * The account-wide interface_mode preference (Phase C) selects which one renders.
 */
export type MarkVariant = 'playful' | 'clean'

export function StudocyteMark({
  variant = 'playful',
  size = 28,
  className = '',
  title,
}: {
  variant?: MarkVariant
  size?: number
  className?: string
  title?: string
}) {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const }

  if (variant === 'clean') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className} {...a11y}>
        <path
          d="M50 6 C69 6 79 17 83 33 C87 49 93 58 88 71 C83 86 68 94 50 94 C32 94 17 86 12 71 C7 58 13 49 17 33 C21 17 31 6 50 6 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
        />
        <circle cx="56" cy="52" r="13" fill="none" stroke="currentColor" strokeWidth="4" />
        <circle cx="59" cy="55" r="4" fill="currentColor" />
        <circle cx="38" cy="42" r="3.2" fill="currentColor" opacity="0.7" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} {...a11y}>
      <defs>
        <radialGradient id="smBody" cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#ff9184" /><stop offset="55%" stopColor="#f0483b" /><stop offset="100%" stopColor="#d61f27" />
        </radialGradient>
      </defs>
      <path d="M36 12 q-3 -8 3 -10" stroke="#b3231f" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M64 12 q3 -8 -3 -10" stroke="#b3231f" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M50 8 C70 8 80 19 84 35 C88 51 94 60 89 73 C84 88 68 96 50 96 C32 96 16 88 11 73 C6 60 12 51 16 35 C20 19 30 8 50 8 Z" fill="url(#smBody)" stroke="#b3231f" strokeWidth="3" />
      <ellipse cx="27" cy="62" rx="7" ry="4.6" fill="#ffd2c0" opacity="0.85" />
      <ellipse cx="73" cy="62" rx="7" ry="4.6" fill="#ffd2c0" opacity="0.85" />
      <circle cx="37" cy="50" r="11" fill="#fff" /><circle cx="63" cy="50" r="11" fill="#fff" />
      <circle cx="38.5" cy="52" r="5.5" fill="#1d1836" /><circle cx="64.5" cy="52" r="5.5" fill="#1d1836" />
      <circle cx="41" cy="49" r="2.2" fill="#fff" /><circle cx="67" cy="49" r="2.2" fill="#fff" />
      <path d="M40 70 q10 9 20 0" stroke="#8a1c1c" strokeWidth="3.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}
