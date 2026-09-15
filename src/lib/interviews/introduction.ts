import type { CytoMood } from '@/lib/mascot/mood'

export const INTRO_VERSION = 4
export const INTRO_STATUSES = ['started', 'skipped', 'completed'] as const
export type IntroStatus = typeof INTRO_STATUSES[number]

export const INTRO_STEPS = [
  {
    id: 'daily-station',
    path: '/interviews',
    tabPath: '/interviews',
    target: 'dashboard-daily',
    section: 'Dashboard',
    title: 'Daily Station',
    body: 'This station is chosen from your previous practice and the competencies that need the most useful attention. Start here when you want Studocyte to choose the next step for you.',
    tip: 'Complete the answer, review the transcript, then retry one targeted improvement.',
    mood: 'focused' as CytoMood,
  },
  {
    id: 'rewards',
    path: '/interviews',
    tabPath: '/interviews',
    target: 'dashboard-rewards',
    section: 'Dashboard',
    title: 'Practice progress',
    body: 'Practice levels grow from completed learning steps, not interview scores. This is also where you can see earned evidence badges, XP and Focus Tokens.',
    tip: 'Use these as signs of consistent work—not as an admission prediction.',
    mood: 'levelup' as CytoMood,
  },
  {
    id: 'feedback-quest',
    path: '/interviews',
    tabPath: '/interviews',
    target: 'dashboard-quest',
    section: 'Dashboard',
    title: 'Feedback Quest',
    body: 'Your Feedback Quest turns earlier feedback into one specific behaviour to practise next. You can use the suggested quest or choose another focus.',
    tip: 'One observable change is easier to practise than a long list of advice.',
    mood: 'thinking' as CytoMood,
  },
  {
    id: 'study-streak',
    path: '/interviews',
    tabPath: '/interviews',
    target: 'dashboard-streak',
    section: 'Dashboard',
    title: 'Study Streak',
    body: 'This shows whether you have practised today, how long remains before the daily streak expires and your progress toward five active practice days this week.',
    tip: 'One completed response is enough to count as an active day.',
    mood: 'streak' as CytoMood,
  },
  {
    id: 'mastery',
    path: '/interviews',
    tabPath: '/interviews',
    target: 'dashboard-mastery',
    section: 'Dashboard',
    title: 'Competency Mastery',
    body: 'Competency Mastery combines repeated, recent practice evidence. Open a competency to see why it is at that level and the exact action recommended for your next answer.',
    tip: 'The “Practise next” line is the useful part—take that instruction into your next station.',
    mood: 'studying' as CytoMood,
  },
  {
    id: 'practice-selection',
    path: '/interviews/practice',
    tabPath: '/interviews/practice',
    target: 'practice-selection',
    section: 'Practice',
    title: 'Practice library',
    body: 'Switch between MMI and panel practice, then choose a station by its visible theme. The full prompt remains protected while you decide.',
    tip: 'Use this page when you want to target a particular theme or competency.',
    mood: 'focused' as CytoMood,
  },
  {
    id: 'practice-preview',
    path: '/interviews/practice',
    tabPath: '/interviews/practice',
    target: 'practice-preview',
    section: 'Practice',
    title: 'Prompt controls',
    body: 'Reveal the prompt if you want to think without a timer, or choose Start unseen to meet it under realistic conditions. Nothing is spoiled before you decide.',
    tip: 'Preparation is never recorded. You can rehearse freely or save a microphone response.',
    mood: 'thinking' as CytoMood,
  },
  {
    id: 'live-connect',
    path: '/interviews/live-practice',
    tabPath: '/interviews/live-practice',
    target: 'live-connect',
    section: 'Live Practice',
    title: 'Create or join',
    body: 'Create a private room when you are hosting, or join a partner with their six-character code. Live Practice keeps the candidate and examiner in the same timed station.',
    tip: 'If your partner sent a code, choose Join with a code. Otherwise create the room and share your invite.',
    mood: 'happy' as CytoMood,
  },
  {
    id: 'live-station',
    path: '/interviews/live-practice',
    tabPath: '/interviews/live-practice',
    target: 'live-station',
    section: 'Live Practice',
    title: 'Choose a station',
    body: 'Choose MMI or panel format, then select by the visible station theme. The candidate prompt and private examiner guidance remain hidden until the correct phase begins.',
    tip: 'Pick a theme together before sharing the room code so neither person needs to see the full prompt.',
    mood: 'focused' as CytoMood,
  },
  {
    id: 'live-room',
    path: '/interviews/live-practice',
    tabPath: '/interviews/live-practice',
    target: 'live-room',
    section: 'Live Practice',
    title: 'Room setup',
    body: 'Choose whether to record, then create the private room. Both people check camera, microphone, roles and consent before the shared timer can begin.',
    tip: 'Recording needs active consent from both people, and the candidate controls the saved recording.',
    mood: 'thinking' as CytoMood,
  },
  {
    id: 'mock-selection',
    path: '/interviews/mock-interviews',
    tabPath: '/interviews/mock-interviews',
    target: 'mock-selection',
    section: 'Mock Interviews',
    title: 'Mock interview options',
    body: 'Pick MMI or panel format, then choose one station or a complete timed interview. The time commitment and station theme are shown before you continue.',
    tip: 'Use a full mock when pacing and composure—not question choice—are the main skills.',
    mood: 'focused' as CytoMood,
  },
  {
    id: 'mock-start',
    path: '/interviews/mock-interviews',
    tabPath: '/interviews/mock-interviews',
    target: 'mock-start',
    section: 'Mock Interviews',
    title: 'Session summary',
    body: 'This summary confirms the selected format, duration and marking cost. Continue from here to test your setup before the timer begins.',
    tip: 'The scenario stays hidden until the timed session starts.',
    mood: 'thinking' as CytoMood,
  },
  {
    id: 'recordings',
    path: '/interviews/mock-interviews/review',
    tabPath: '/interviews/mock-interviews',
    target: 'recording-library',
    section: 'Recordings & feedback',
    title: 'Recordings and feedback',
    body: 'Open a completed response here to watch or listen back, read the transcript and review feedback. This is where an answer becomes the next practice decision.',
    tip: 'Choose one change from the feedback and retry a related question while it is fresh.',
    mood: 'happy' as CytoMood,
  },
  {
    id: 'story-bank',
    path: '/interviews/stories',
    tabPath: '/interviews/stories',
    target: 'story-bank',
    section: 'Stories',
    title: 'Story bank',
    body: 'Choose a prompt, save the situation and your actions, then reflect on what changed. Finished and unfinished stories remain private to your account.',
    tip: 'A specific, honest example is more useful than a polished generic answer.',
    mood: 'revision' as CytoMood,
  },
] as const

export function hasSeenIntroduction(value: unknown) {
  return value === 'skipped' || value === 'completed'
}

export function introductionAllowed(path: string) {
  return INTRO_STEPS.some(step => step.path === path)
}

export function readIntroductionStep(value: string | null): number | null {
  try {
    const parsed = JSON.parse(value ?? 'null')
    return parsed?.version === INTRO_VERSION && Number.isInteger(parsed.step) && parsed.step >= 0 && parsed.step < INTRO_STEPS.length ? parsed.step : null
  } catch {
    return null
  }
}
