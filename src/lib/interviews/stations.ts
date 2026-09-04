export type InterviewFormat = 'mmi' | 'panel'

export type InterviewStation = {
  id: string
  format: InterviewFormat
  title: string
  category: string
  preparation: string
  questions: string[]
}

export const INTERVIEW_STATIONS: InterviewStation[] = [
  {
    id: 'mmi-patient-autonomy',
    format: 'mmi',
    title: 'Patient autonomy',
    category: 'Ethics · communication',
    preparation: 'A patient with capacity declines a treatment you believe would be beneficial. Think about how you would respond while respecting their autonomy and your role in the team.',
    questions: ['How would you begin this conversation?', 'What information would you make sure the patient understands?', 'When would you involve a more senior member of the team?'],
  },
  {
    id: 'mmi-team-conflict',
    format: 'mmi',
    title: 'Team disagreement',
    category: 'Teamwork · reflection',
    preparation: 'During a group task, a team member repeatedly dismisses quieter students and the work is starting to suffer. Consider how you would approach the situation.',
    questions: ['What would you do first?', 'How would you keep the conversation constructive?', 'What have you learnt from working in challenging teams?'],
  },
  {
    id: 'mmi-rural-access',
    format: 'mmi',
    title: 'Rural access',
    category: 'Equity · health systems',
    preparation: 'A rural community has long waits for specialist appointments and many residents struggle to travel for care. Consider the barriers patients may face.',
    questions: ['What are the likely impacts on patients and families?', 'What could improve access without assuming one solution fits everyone?', 'How can a future doctor contribute to more equitable care?'],
  },
  {
    id: 'mmi-confidentiality',
    format: 'mmi',
    title: 'Confidentiality and trust',
    category: 'Professionalism · ethics',
    preparation: 'A friend asks you about a patient they believe they saw at the hospital where you are on placement. Consider your responsibilities in responding.',
    questions: ['How would you respond to your friend?', 'Why does confidentiality matter beyond legal requirements?', 'What would you do if you were unsure about a boundary?'],
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

export function getInterviewStation(format: InterviewFormat, id: string | undefined) {
  return INTERVIEW_STATIONS.find((station) => station.format === format && station.id === id)
    ?? INTERVIEW_STATIONS.find((station) => station.format === format)
    ?? INTERVIEW_STATIONS[0]
}
