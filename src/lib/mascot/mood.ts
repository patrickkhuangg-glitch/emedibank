// Cyto's mood, chosen from how a learner is actually going: overall accuracy
// (performance) and their daily streak (consistency). Kept in one place so the
// mascot, its caption and any future surfaces all agree.

export type CytoMood = 'sad' | 'worried' | 'focused' | 'sleepy' | 'happy' | 'thriving' | 'celebrate'

export function cytoMood(input: {
  accuracy: number | null
  dailyStreak: number
  hasData: boolean
}): CytoMood {
  const { accuracy, dailyStreak, hasData } = input
  if (!hasData) return 'happy'          // welcoming default for a brand-new learner
  if (dailyStreak === 0) return 'sleepy' // streak lapsed — the nudge to come back
  const a = accuracy ?? 55
  if (a >= 85 && dailyStreak >= 7) return 'thriving'
  if (a >= 70) return 'happy'
  if (a >= 52) return 'focused'
  if (a >= 38) return 'worried'
  return 'sad'
}

export const CYTO_CAPTION: Record<CytoMood, string> = {
  sad: 'Let’s get a couple of wins back on the board.',
  worried: 'Accuracy’s dipping — slow down and review.',
  focused: 'In the zone. Keep the reps coming.',
  sleepy: 'Cyto’s dozed off — practise to wake it up.',
  happy: 'Looking good — nice and steady.',
  thriving: 'Cyto’s thriving. Keep it lit! 👑',
  celebrate: 'Level up! 🎉',
}
