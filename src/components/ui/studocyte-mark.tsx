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
      <path
        d="M50 6 C69 6 79 17 83 33 C87 49 93 58 88 71 C83 86 68 94 50 94 C32 94 17 86 12 71 C7 58 13 49 17 33 C21 17 31 6 50 6 Z"
        fill="var(--mint)"
        stroke="var(--mint-deep)"
        strokeWidth="4"
      />
      <circle cx="39" cy="46" r="8.5" fill="#fff" />
      <circle cx="63" cy="46" r="8.5" fill="#fff" />
      <circle cx="41" cy="48" r="4" fill="var(--foreground)" />
      <circle cx="65" cy="48" r="4" fill="var(--foreground)" />
      <path d="M40 63 Q50 71 61 63" stroke="var(--foreground)" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  )
}
