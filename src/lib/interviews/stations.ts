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
  /** Stable theme number from the EMeducate panel question bank. */
  panelThemeNumber?: number
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
    id: 'panel-motivation', panelThemeNumber: 1,
    format: 'panel',
    title: 'Motivation for medicine',
    category: 'Motivation · reflection',
    preparation: 'Prepare to discuss what has confirmed that medicine is the right path for you, and what you have learnt about the work itself.',
    questions: ['What has confirmed that medicine is the right path for you?', 'What have you learnt about the realities of working in medicine?', 'How has your understanding of medical practice shaped the way you are preparing for medicine?', 'What experience has changed your view of a doctor’s responsibilities?', 'What attracts you to medicine, and what do you expect to find most challenging?'],
  },
  {
    id: 'panel-service', panelThemeNumber: 2,
    format: 'panel',
    title: 'Service and community',
    category: 'Community · values',
    preparation: 'Think of a community, service or work experience that changed how you understand other people’s needs.',
    questions: ['Tell us about an experience that changed your perspective.', 'Think of a community, service or work experience. What did you notice about the needs of the people involved?', 'What have you learnt through community, service or work experience that you would carry into medicine?', 'Tell us about a contribution you made that was valuable even though it was not highly visible or recognised.', 'How has serving others changed the way you approach unfamiliar situations?'],
  },
  {
    id: 'panel-resilience', panelThemeNumber: 3,
    format: 'panel',
    title: 'Setback and growth',
    category: 'Resilience · self-awareness',
    preparation: 'Choose a meaningful setback or challenge. Focus on how you responded and what changed after it—not just the outcome.',
    questions: ['Tell us about a setback that mattered to you.', 'Think of a meaningful setback you experienced. How did you respond in the moment?', 'Looking back on a meaningful setback you experienced, what would you now do differently?', 'Tell us about a time you needed support after a setback. What did you learn about asking for help?', 'How has a failure or disappointment changed the way you work?'],
  },
  {
    id: 'panel-teamwork', panelThemeNumber: 4, format: 'panel', title: 'Teamwork and responsibility', category: 'Teamwork · judgement',
    preparation: 'Consider how you contribute to a team, respond to disagreement and take responsibility for your decisions.',
    questions: ['Tell us about a time you helped a team work through a disagreement.', 'How do you recognise when you need to ask for help?', 'What does taking responsibility mean to you when a team makes a mistake?', 'Tell us about a time you helped a team perform under pressure.', 'What role do you naturally take in a team, and how have you adapted that role when needed?'],
  },
  {
    id: 'panel-patient-centred-care', panelThemeNumber: 5, format: 'panel', title: 'Patient-centred care', category: 'Empathy · care',
    preparation: 'Reflect on how healthcare can respect each patient’s priorities, preferences and circumstances.',
    questions: ['What does patient-centred care mean to you?', 'Tell us about a time you adapted your approach to meet another person’s needs.', 'How should a clinician respond when a patient’s priorities differ from the clinician’s expectations?', 'What can make a patient feel genuinely heard?', 'How would you balance a patient’s preferences with your professional responsibilities?'],
  },
  {
    id: 'panel-communication-listening', panelThemeNumber: 6, format: 'panel', title: 'Communication and active listening', category: 'Communication · empathy',
    preparation: 'Consider how clear, respectful communication supports trust and shared understanding.',
    questions: ['What does active listening involve?', 'Tell us about a time a conversation did not go as planned. What did you learn?', 'How would you explain a complex idea to someone with no background knowledge?', 'How can you tell whether another person has understood what you said?', 'What communication skill are you still working to improve?'],
  },
  {
    id: 'panel-ethics-judgement', panelThemeNumber: 7, format: 'panel', title: 'Ethics and professional judgement', category: 'Ethics · judgement',
    preparation: 'Prepare to discuss how you would reason through competing values and responsibilities.',
    questions: ['What makes a decision ethically difficult?', 'How would you approach a situation in which two reasonable people disagree about the right course of action?', 'What is the relationship between autonomy and professional responsibility?', 'Tell us about a time you had to make a difficult judgement with incomplete information.', 'How should personal values be managed in professional decision-making?'],
  },
  {
    id: 'panel-integrity', panelThemeNumber: 8, format: 'panel', title: 'Integrity and honesty', category: 'Integrity · professionalism',
    preparation: 'Reflect on how honesty, trustworthiness and transparency shape professional relationships.',
    questions: ['What does integrity mean to you?', 'Tell us about a time you admitted that you were wrong.', 'When might honesty need to be delivered with particular care?', 'How would you respond if you noticed a peer acting dishonestly?', 'Why is transparency important in healthcare?'],
  },
  {
    id: 'panel-self-awareness-values', panelThemeNumber: 9, format: 'panel', title: 'Self-awareness and personal values', category: 'Self-awareness · reflection',
    preparation: 'Think about the experiences, assumptions and values that shape how you work with others.',
    questions: ['What personal quality are you most proud of, and how has it helped you?', 'What is a limitation or blind spot you are working to address?', 'How have your values changed as you have gained experience?', 'Tell us about a time you became aware of an assumption you were making.', 'How do you make sure your self-perception is accurate?'],
  },
  {
    id: 'panel-feedback', panelThemeNumber: 10, format: 'panel', title: 'Receiving and acting on feedback', category: 'Reflection · growth',
    preparation: 'Consider how feedback can be received thoughtfully and translated into changed behaviour.',
    questions: ['Tell us about feedback that was difficult to hear but useful.', 'How do you decide whether feedback should change your approach?', 'What makes feedback constructive?', 'How would you respond if you disagreed with feedback from a supervisor?', 'What evidence would show that you had acted on feedback?'],
  },
  {
    id: 'panel-leadership-initiative', panelThemeNumber: 11, format: 'panel', title: 'Leadership and initiative', category: 'Leadership · responsibility',
    preparation: 'Reflect on leadership as influence, service and responsibility—not simply authority or status.',
    questions: ['What does effective leadership look like to you?', 'Tell us about a time you took initiative without being asked.', 'How would you lead a group when you were not the most knowledgeable person in it?', 'What is the difference between being popular and being an effective leader?', 'Tell us about a time your leadership approach did not work.'],
  },
  {
    id: 'panel-adaptability-change', panelThemeNumber: 12, format: 'panel', title: 'Adaptability and managing change', category: 'Adaptability · resilience',
    preparation: 'Prepare to discuss how you respond when plans, expectations or circumstances change.',
    questions: ['Tell us about a time you had to adapt quickly.', 'How do you respond when a plan you have invested in is changed?', 'What helps people adjust to change in a team?', 'How would you approach learning an unfamiliar task under time pressure?', 'When is adapting to change appropriate, and when should someone challenge the change?'],
  },
  {
    id: 'panel-conflict-resolution', panelThemeNumber: 13, format: 'panel', title: 'Conflict resolution', category: 'Communication · teamwork',
    preparation: 'Think about how disagreement can be handled respectfully while still addressing the underlying issue.',
    questions: ['What is the difference between healthy disagreement and destructive conflict?', 'Tell us about a time you helped resolve a conflict.', 'How would you respond if someone became defensive during a difficult conversation?', 'When should a conflict be escalated to someone else?', 'What have you learnt about your own conflict style?'],
  },
  {
    id: 'panel-accountability-professionalism', panelThemeNumber: 14, format: 'panel', title: 'Accountability and professionalism', category: 'Professionalism · responsibility',
    preparation: 'Reflect on the standards, behaviours and follow-through expected in a professional environment.',
    questions: ['What does professionalism mean beyond being polite and punctual?', 'Tell us about a time you had to follow through on an inconvenient responsibility.', 'How should someone respond when they cannot meet a commitment?', 'What is the relationship between accountability and trust?', 'How would you respond if a team member repeatedly failed to meet agreed standards?'],
  },
  {
    id: 'panel-cultural-safety', panelThemeNumber: 15, format: 'panel', title: 'Cultural safety and humility', category: 'Culture · equity',
    preparation: 'Consider how healthcare professionals can recognise power, culture and their own limitations.',
    questions: ['What does cultural safety mean in healthcare?', 'How is cultural humility different from simply learning about other cultures?', 'Tell us about a time you learnt from someone whose experience differed from your own.', 'How can a healthcare professional recognise that a patient does not feel culturally safe?', 'What should you do when you realise that you have caused offence or made an assumption?'],
  },
  {
    id: 'panel-aboriginal-torres-strait-islander-health', panelThemeNumber: 16, format: 'panel', title: 'Aboriginal and Torres Strait Islander health', category: 'Cultural safety · equity',
    preparation: 'Prepare to discuss health inequity, self-determination, cultural safety and respectful engagement with Aboriginal and Torres Strait Islander peoples.',
    questions: ['Why is cultural safety important for Aboriginal and Torres Strait Islander patients?', 'What factors contribute to health inequities experienced by Aboriginal and Torres Strait Islander peoples?', 'What does respect for self-determination mean in healthcare?', 'How can healthcare services build trust with Aboriginal and Torres Strait Islander communities?', 'What would you do to keep learning without placing the burden of education on Aboriginal and Torres Strait Islander patients or colleagues?'],
  },
  {
    id: 'panel-diversity-inclusion', panelThemeNumber: 17, format: 'panel', title: 'Diversity, inclusion and belonging', category: 'Inclusion · teamwork',
    preparation: 'Reflect on how inclusive environments support people with different identities, backgrounds and perspectives.',
    questions: ['What does inclusion look like in practice?', 'Tell us about a time you helped someone feel included.', 'Why can equal treatment sometimes produce unequal outcomes?', 'How would you respond if you heard a colleague make a stereotyped comment?', 'What are the benefits and challenges of diversity within a healthcare team?'],
  },
  {
    id: 'panel-health-equity-access', panelThemeNumber: 18, format: 'panel', title: 'Health equity and access to care', category: 'Equity · advocacy',
    preparation: 'Consider why people may experience healthcare differently and how professionals can reduce avoidable barriers.',
    questions: ['What is the difference between equality and equity in healthcare?', 'What barriers can prevent someone from accessing care?', 'How should limited healthcare resources be allocated fairly?', 'Tell us about a time you noticed an unfair barrier affecting another person.', 'What responsibility do healthcare professionals have to advocate for equitable access?'],
  },
  {
    id: 'panel-rural-remote-health', panelThemeNumber: 19, format: 'panel', title: 'Rural, remote and underserved communities', category: 'Community · equity',
    preparation: 'Prepare to discuss the strengths, challenges and healthcare needs of rural and remote communities without relying on stereotypes.',
    questions: ['What are some challenges associated with delivering healthcare in rural or remote areas?', 'What strengths can rural and remote communities bring to healthcare?', 'How might continuity of care be supported when specialist services are distant?', 'What should an applicant learn before claiming an interest in rural medicine?', 'How can healthcare professionals avoid making assumptions about rural or remote patients?'],
  },
  {
    id: 'panel-social-determinants', panelThemeNumber: 20, format: 'panel', title: 'Social determinants of health', category: 'Public health · equity',
    preparation: 'Think about how housing, education, income, connection and environment shape health outcomes.',
    questions: ['What are the social determinants of health?', 'How can housing affect a person’s health?', 'Why might providing medical advice alone fail to improve someone’s health?', 'Tell us about a time a person’s circumstances changed how you understood their behaviour.', 'What role can doctors play in addressing social determinants of health?'],
  },
  {
    id: 'panel-public-health-prevention', panelThemeNumber: 21, format: 'panel', title: 'Public health and prevention', category: 'Public health · responsibility',
    preparation: 'Reflect on how healthcare can prevent illness and improve the health of populations as well as individuals.',
    questions: ['Why is prevention important in healthcare?', 'How should public-health messages balance individual choice and community wellbeing?', 'What makes a health campaign effective?', 'Tell us about a public-health issue you think deserves more attention.', 'How should health professionals respond when evidence changes?'],
  },
  {
    id: 'panel-health-system', panelThemeNumber: 22, format: 'panel', title: 'Health-system pressures and priorities', category: 'Health systems · judgement',
    preparation: 'Prepare to discuss how health systems make decisions under pressure while maintaining safety, quality and fairness.',
    questions: ['What pressures are currently likely to affect healthcare systems?', 'How should a health system balance access, quality and cost?', 'What does a sustainable healthcare system look like?', 'How can healthcare services reduce waste without compromising patient care?', 'What should decision-makers consider when setting health priorities?'],
  },
  {
    id: 'panel-evidence-critical-thinking', panelThemeNumber: 23, format: 'panel', title: 'Evidence-based medicine and critical thinking', category: 'Evidence · judgement',
    preparation: 'Think about how evidence, uncertainty and clinical judgement should work together.',
    questions: ['What does evidence-based medicine mean to you?', 'How would you assess whether a health claim is trustworthy?', 'Why can a single study be insufficient to change practice?', 'How should uncertainty be communicated to patients?', 'Tell us about a time you changed your view after evaluating new evidence.'],
  },
  {
    id: 'panel-research-curiosity', panelThemeNumber: 24, format: 'panel', title: 'Research and curiosity', category: 'Learning · evidence',
    preparation: 'Reflect on how curiosity, questioning and research contribute to better healthcare.',
    questions: ['What makes a good research question?', 'Why is research important to medicine?', 'Tell us about something you investigated because you wanted to understand it better.', 'What ethical issues should researchers consider?', 'How should research findings be communicated to the public?'],
  },
  {
    id: 'panel-technology-ai', panelThemeNumber: 25, format: 'panel', title: 'Technology and artificial intelligence', category: 'Technology · ethics',
    preparation: 'Consider how new technologies can improve healthcare while creating risks that require oversight.',
    questions: ['What opportunities could artificial intelligence create in healthcare?', 'What risks might arise when AI is used in clinical decision-making?', 'How should patients be informed when technology contributes to their care?', 'What safeguards should be required before introducing a new healthcare technology?', 'Tell us about a time technology improved a process but created an unexpected problem.'],
  },
  {
    id: 'panel-privacy-confidentiality', panelThemeNumber: 26, format: 'panel', title: 'Privacy, confidentiality and trust', category: 'Confidentiality · professionalism',
    preparation: 'Prepare to discuss why privacy matters and how confidentiality should be handled responsibly.',
    questions: ['Why is confidentiality important in healthcare?', 'Are there circumstances in which confidentiality may need to be limited?', 'How can digital records create new privacy risks?', 'Tell us about a time someone trusted you with sensitive information.', 'How would you respond if a friend asked you about a patient you knew?'],
  },
  {
    id: 'panel-patient-advocacy', panelThemeNumber: 27, format: 'panel', title: 'Patient advocacy', category: 'Advocacy · care',
    preparation: 'Reflect on how professionals can support a patient’s voice, rights and access to appropriate care.',
    questions: ['What does patient advocacy mean to you?', 'When might a patient need an advocate within the healthcare system?', 'How can a clinician support a patient who feels unable to speak up?', 'Tell us about a time you stood up for someone else.', 'How should advocacy be balanced with respecting a patient’s autonomy?'],
  },
  {
    id: 'panel-team-communication', panelThemeNumber: 28, format: 'panel', title: 'Team communication and collaboration', category: 'Teamwork · safety',
    preparation: 'Consider how teams share information, coordinate work and create an environment where concerns can be raised.',
    questions: ['Why is communication important for patient safety?', 'What information should be shared when handing over responsibility?', 'How can a team make it easier for junior members to speak up?', 'Tell us about a time a team communication problem affected an outcome.', 'How would you respond if two team members had different understandings of an agreed plan?'],
  },
  {
    id: 'panel-work-life-sustainable-practice', panelThemeNumber: 29, format: 'panel', title: 'Work–life balance and sustainable practice', category: 'Wellbeing · professionalism',
    preparation: 'Reflect on how clinicians can care for themselves while meeting responsibilities to patients and colleagues.',
    questions: ['Why is sustainable practice important in medicine?', 'How do you recognise when your wellbeing is beginning to affect your performance?', 'What would you do if you were struggling to meet your responsibilities?', 'How can teams support one another’s wellbeing?', 'How should a doctor balance personal limits with a commitment to patient care?'],
  },
  {
    id: 'panel-learning-from-failure', panelThemeNumber: 30, format: 'panel', title: 'Learning from failure', category: 'Reflection · growth',
    preparation: 'Choose an example of failure or disappointment and focus on the insight and changed behaviour that followed.',
    questions: ['What is the most useful failure you have experienced?', 'How do you distinguish between an excuse and an explanation for a poor outcome?', 'What should happen after an error has been identified?', 'Tell us about a time you changed a system or habit after making a mistake.', 'How can a team create a culture where people learn from errors?'],
  },
  {
    id: 'panel-motivation-service', panelThemeNumber: 31, format: 'panel', title: 'Motivation for service', category: 'Service · values',
    preparation: 'Think about why service matters to you and how you would contribute without assuming you know what others need.',
    questions: ['What motivates you to serve other people?', 'How is service different from simply helping?', 'Tell us about a time your idea of service was challenged.', 'How would you measure whether a service was actually useful to its intended community?', 'What responsibilities come with serving people who are more vulnerable than you?'],
  },
  {
    id: 'panel-community-engagement', panelThemeNumber: 32, format: 'panel', title: 'Community engagement and responsibility', category: 'Community · service',
    preparation: 'Reflect on how lasting community work is built through listening, partnership and shared responsibility.',
    questions: ['What does meaningful community engagement involve?', 'How can organisations avoid imposing solutions on a community?', 'Tell us about a time you worked with people outside your usual social or professional group.', 'What makes a community partnership sustainable?', 'How should the success of a community program be evaluated?'],
  },
]

export function getInterviewStation(format: InterviewFormat, id: string | undefined): InterviewStation | null {
  return INTERVIEW_STATIONS.find((station) => station.format === format && station.id === id)
    ?? INTERVIEW_STATIONS.find((station) => station.format === format)
    ?? null
}
