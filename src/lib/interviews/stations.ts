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
    id: 'mmi-team-disagreement', format: 'mmi', title: 'Working through disagreement', category: 'Teamwork · communication',
    preparation: 'You are organising a community event with other volunteers. Two team members disagree about how to spend the remaining budget. Each has begun dismissing the other’s ideas, and an important deadline is tomorrow. You have been asked to help the group move forward.',
    questions: ['How would you approach this disagreement?', 'How would you make sure quieter team members are heard?', 'What would you do if the group still could not agree?', 'Describe a time you changed your approach after listening to someone else.'],
  },
  {
    id: 'mmi-honest-feedback', format: 'mmi', title: 'Giving difficult feedback', category: 'Integrity · communication',
    preparation: 'A fellow student asks you to give feedback on a presentation they will deliver tomorrow. They are proud of their work, but you notice that a central claim is unsupported and could mislead the audience. They tell you they are already very anxious about presenting.',
    questions: ['How would you start this conversation?', 'How would you balance honesty with supporting your colleague?', 'What would you do if they refused to change the unsupported claim?', 'Tell us about feedback you found difficult to hear and how you responded.'],
  },
  {
    id: 'mmi-access-support', format: 'mmi', title: 'Access and practical support', category: 'Equity · problem solving',
    preparation: 'You volunteer at a community support service. A visitor has missed several appointments because public transport is unreliable and they cannot easily take time away from work. A colleague describes them as unmotivated. Consider how you would respond within your role as a volunteer.',
    questions: ['What information would you want before drawing conclusions?', 'How would you respond to your colleague’s comment?', 'What practical next steps could you explore with the visitor?', 'Describe an experience that changed your understanding of another person’s circumstances.'],
  },
  {
    id: 'mmi-resource-choice', format: 'mmi', title: 'Making a fair decision', category: 'Ethics · prioritisation',
    preparation: 'A student organisation has funding for one of two projects: extending a well-used mentoring programme or starting a new outreach project for students who currently receive little support. Both proposals are credible, but evidence about the likely impact of the new project is limited.',
    questions: ['How would you compare these proposals fairly?', 'Whose perspectives would you seek?', 'How would you explain the decision to the unsuccessful group?', 'How would you evaluate the decision after it was implemented?'],
  },
  {
    id: 'mmi-owning-error', format: 'mmi', title: 'Taking responsibility', category: 'Professionalism · reflection',
    preparation: 'While helping organise a volunteer roster, you realise you sent an outdated schedule. Several volunteers may arrive at the wrong time, leaving a service short of help. No one has noticed yet, and you are worried the coordinator will lose confidence in you.',
    questions: ['What would you do first?', 'How would you explain the error to the coordinator and affected volunteers?', 'What would you change to reduce the chance of recurrence?', 'Tell us about a mistake you learned from.'],
  },
  {
    id: 'mmi-listening-concern', format: 'mmi', title: 'Responding to a concern', category: 'Empathy · listening',
    preparation: 'At a community information session, an attendee says they feel excluded because the presenters use unfamiliar technical language. Another volunteer tells them that everything was explained in the handout. You are nearby and have an opportunity to respond.',
    questions: ['How would you respond to the attendee?', 'How would you check whether your explanation was useful?', 'How would you discuss this with the other volunteer?', 'Describe a time you adapted your communication to someone else’s needs.'],
  },
  {
    id: 'mmi-managing-pressure', format: 'mmi', title: 'Managing competing demands', category: 'Judgement · resilience',
    preparation: 'You have an important assessment approaching and have also committed to helping run a weekend community activity. A team member withdraws at short notice and asks you to take on their responsibilities. You are already struggling to manage your workload.',
    questions: ['How would you decide what you can realistically take on?', 'How would you communicate your limits to the team?', 'What support or alternatives could you explore?', 'How do you recognise when your usual coping strategies are no longer enough?'],
  },
  {
    id: 'panel-motivation',
    format: 'panel',
    title: 'Motivation for medicine',
    category: 'Motivation · reflection',
    preparation: 'Prepare to discuss what has confirmed that medicine is the right path for you, and what you have learnt about the work itself.',
    questions: ['What has confirmed that medicine is the right path for you?', 'What have you learnt about the realities of working in medicine?', 'How has your understanding of medical practice shaped the way you are preparing for medicine?'],
  },
  {
    id: 'panel-service',
    format: 'panel',
    title: 'Service and community',
    category: 'Community · values',
    preparation: 'Think of a community, service or work experience that changed how you understand other people’s needs.',
    questions: ['Tell us about an experience that changed your perspective.', 'Think of a community, service or work experience. What did you notice about the needs of the people involved?', 'What have you learnt through community, service or work experience that you would carry into medicine?'],
  },
  {
    id: 'panel-resilience',
    format: 'panel',
    title: 'Setback and growth',
    category: 'Resilience · self-awareness',
    preparation: 'Choose a meaningful setback or challenge. Focus on how you responded and what changed after it—not just the outcome.',
    questions: ['Tell us about a setback that mattered to you.', 'Think of a meaningful setback you experienced. How did you respond in the moment?', 'Looking back on a meaningful setback you experienced, what would you now do differently?'],
  },
  {
    id: 'panel-teamwork', format: 'panel', title: 'Teamwork and responsibility', category: 'Teamwork · judgement',
    preparation: 'Consider how you contribute to a team, respond to disagreement and take responsibility for your decisions.',
    questions: ['Tell us about a time you helped a team work through a disagreement.', 'How do you recognise when you need to ask for help?', 'What does taking responsibility mean to you when a team makes a mistake?'],
  },
]

export function getInterviewStation(format: InterviewFormat, id: string | undefined): InterviewStation | null {
  return INTERVIEW_STATIONS.find((station) => station.format === format && station.id === id)
    ?? INTERVIEW_STATIONS.find((station) => station.format === format)
    ?? null
}
