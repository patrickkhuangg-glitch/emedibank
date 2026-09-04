export type InterviewFormat = 'mmi' | 'panel'

export type ExaminerFeedbackGuide = {
  strongResponse: Array<{ title: string; description: string }>
  commonWeaknesses: string[]
}

export type InterviewStation = {
  id: string
  format: InterviewFormat
  title: string
  category: string
  preparation: string
  questions: string[]
  examinerFeedback?: ExaminerFeedbackGuide
}

export const INTERVIEW_STATIONS: InterviewStation[] = [
  {
    id: 'mmi-confidentiality-patient-safety',
    format: 'mmi',
    title: 'Confidentiality and patient safety',
    category: 'Ethics · patient safety',
    preparation: 'You are a medical student on placement. During a break, your friend Sam tells you they have recently been diagnosed with a sexually transmitted infection. Sam is embarrassed and asks you not to tell anyone. Sam then says they do not plan to tell a recent sexual partner because they are worried about being judged and believe the partner is “probably fine”. Consider how you would respond.',
    questions: ['What are the main ethical and practical issues in this scenario?', 'How would you respond to Sam in a supportive and non-judgemental way?', 'How would you balance Sam’s confidentiality with concern for the sexual partner’s wellbeing?', 'Tell us about a time you had to manage sensitive information, maintain someone’s trust, or navigate a difficult conversation. What did you learn?'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Empathy', description: 'Acknowledge Sam’s embarrassment and avoid judgement or blame.' },
        { title: 'Confidentiality', description: 'Respect Sam’s privacy as the starting point.' },
        { title: 'Safety', description: 'Recognise the partner may be at risk and should have access to testing and treatment.' },
        { title: 'Practical support', description: 'Encourage Sam to speak with a GP or sexual-health service, including supported or anonymous partner-notification options.' },
        { title: 'Boundaries', description: 'Recognise that, as a student and friend, you should not diagnose, give detailed medical or legal advice, or contact the partner yourself.' },
        { title: 'Reflection', description: 'Use a specific personal example and clearly explain what you learned.' },
      ],
      commonWeaknesses: ['Treating confidentiality as absolute.', 'Immediately breaching privacy or contacting the partner directly.', 'Being moralistic, alarmist, or dismissive.', 'Ignoring stigma and Sam’s emotional concerns.', 'Giving vague answers without a safe next step.'],
    },
  },
  {
    id: 'panel-motivation',
    format: 'panel',
    title: 'Motivation for medicine',
    category: 'Motivation · reflection',
    preparation: 'Prepare to discuss what has confirmed that medicine is the right path for you, and what you have learnt about the work itself.',
    questions: ['What has confirmed that medicine is the right path for you?', 'What have you learnt about the realities of the profession?', 'How has that shaped the way you are preparing now?'],
  },
  {
    id: 'panel-service',
    format: 'panel',
    title: 'Service and community',
    category: 'Community · values',
    preparation: 'Think of a community, service or work experience that changed how you understand other people’s needs.',
    questions: ['Tell us about an experience that changed your perspective.', 'What did you notice about the needs of the people involved?', 'How would you carry that learning into medicine?'],
  },
  {
    id: 'panel-resilience',
    format: 'panel',
    title: 'Setback and growth',
    category: 'Resilience · self-awareness',
    preparation: 'Choose a meaningful setback or challenge. Focus on how you responded and what changed after it—not just the outcome.',
    questions: ['Tell us about a setback that mattered to you.', 'How did you respond in the moment?', 'What would you now do differently?'],
  },
]

export function getInterviewStation(format: InterviewFormat, id: string | undefined): InterviewStation | null {
  return INTERVIEW_STATIONS.find((station) => station.format === format && station.id === id)
    ?? INTERVIEW_STATIONS.find((station) => station.format === format)
    ?? null
}
