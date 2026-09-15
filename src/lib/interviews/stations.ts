import 'server-only'
import { ROLEPLAY_STATIONS } from './roleplay-stations'
import { REVIEWED_MMI_STATIONS_2026_09 } from './mmi-bank-2026-09'
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
  responseMode?: 'roleplay_reflection'
  /** Server-only actor brief, never included in student payloads. */
  rolePlayerInstructions?: string
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
    id: 'mmi-using-an-interpreter', format: 'mmi', title: 'Using an interpreter', category: 'Communication · confidentiality',
    preparation: 'You are a medical student observing a consultation. A patient has limited English proficiency and their adult daughter offers to interpret. The doctor agrees, even though the consultation involves a new cancer diagnosis. The patient seems quiet and looks uncomfortable when the daughter answers questions on their behalf.',
    questions: ['What concerns arise in this situation?', 'How should the healthcare team proceed?', 'What are the benefits of using a professional interpreter?', 'Tell us about a time you adapted your communication for someone with different needs from your own.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Consent and confidentiality', description: 'Recognise that informed consent and privacy may be compromised when a family member interprets sensitive information.' },
        { title: 'Patient preference', description: 'Ask the patient privately about their preference and arrange an accredited interpreter where appropriate.' },
        { title: 'Practical safeguards', description: 'Acknowledge that family members may filter information or feel distressed, and pause safely while support is arranged.' },
      ],
      commonWeaknesses: ['Assuming a family member is always an adequate substitute for a professional interpreter.', 'Ignoring the patient’s discomfort or preference.', 'Treating language access as an inconvenience rather than part of safe care.'],
    },
  },
  {
    id: 'mmi-health-misinformation', format: 'mmi', title: 'Health misinformation', category: 'Public health · communication',
    preparation: 'At a local community event, a parent tells you they have decided not to vaccinate their child after watching several social-media videos. They say doctors “do not listen” and are only repeating what pharmaceutical companies tell them.',
    questions: ['How would you respond?', 'Why is simply giving the parent more facts unlikely to be enough?', 'How should health professionals communicate about misinformation?', 'Tell us about a time you changed your mind after receiving new information.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Curiosity and respect', description: 'Explore the parent’s concerns and sources without ridicule, confrontation, or assumptions about their intelligence.' },
        { title: 'Trust and values', description: 'Recognise that relationships, trust, values, and prior experiences influence health decisions as much as facts.' },
        { title: 'Clear next step', description: 'Offer accessible evidence and encourage discussion with a trusted clinician who can answer questions safely.' },
      ],
      commonWeaknesses: ['Dismissing the parent as irrational.', 'Launching straight into a lecture or fact dump.', 'Failing to address the underlying trust concern.'],
    },
  },
  {
    id: 'mmi-fatigued-colleague', format: 'mmi', title: 'A fatigued colleague', category: 'Patient safety · professionalism',
    preparation: 'You are a medical student on a late shift. A junior doctor tells you they have worked several long shifts in a row and appear exhausted. You later see them nearly prescribe the wrong dose of medication, but they correct themselves before submitting the order. They ask you not to mention it because they are worried about getting into trouble.',
    questions: ['What are the key issues here?', 'What would you do in the moment?', 'How should healthcare organisations respond to fatigue and error risk?', 'Tell us about a time you noticed someone struggling and decided whether or how to intervene.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Immediate safety', description: 'Put patient safety first and make sure the order is correct before care proceeds.' },
        { title: 'Supportive escalation', description: 'Respond to the doctor’s fatigue supportively while involving an appropriate senior team member.' },
        { title: 'Systems thinking', description: 'Recognise that workload, rostering, supervision, and safe systems matter alongside individual accountability.' },
      ],
      commonWeaknesses: ['Promising secrecy.', 'Trying to manage the situation alone as a student.', 'Treating fatigue as an individual weakness rather than a system risk.'],
    },
  },
  {
    id: 'mmi-disability-and-access', format: 'mmi', title: 'Disability and access', category: 'Equity · accessibility',
    preparation: 'A patient who uses a wheelchair arrives for an appointment to find that the clinic’s accessible entrance is locked. Staff suggest the patient reschedule because they are busy and cannot assist. The patient says this has happened before and that attending healthcare appointments is “always a battle”.',
    questions: ['What issues does this scenario raise?', 'How would you respond to the patient?', 'What responsibilities do healthcare services have regarding accessibility?', 'Tell us about a time you noticed that a system or environment excluded someone.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Equitable access', description: 'Recognise access barriers as a healthcare-quality and rights issue, not an inconvenience or an act of charity.' },
        { title: 'Immediate response', description: 'Communicate respectfully and work with the patient to find a safe solution now.' },
        { title: 'Service improvement', description: 'Include people with disability in designing accessible services and address repeated failures.' },
      ],
      commonWeaknesses: ['Telling the patient simply to reschedule.', 'Framing assistance as optional charity.', 'Ignoring the impact of repeated barriers on trust and health outcomes.'],
    },
  },
  {
    id: 'mmi-conflict-of-interest', format: 'mmi', title: 'Conflict of interest', category: 'Integrity · professionalism',
    preparation: 'A pharmaceutical representative offers your clinical supervisor free tickets to a sporting event. The representative says they would also like to briefly discuss a new medication. Your supervisor accepts the tickets and later recommends the medication during a teaching session without mentioning the relationship.',
    questions: ['Why might this be a concern?', 'What effect can conflicts of interest have on patient care and public trust?', 'How should doctors manage potential conflicts of interest?', 'Tell us about a time you had to recognise or manage a conflict between personal benefit and responsibility.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Transparency', description: 'Recognise that a conflict can affect, or appear to affect, clinical judgement and should be disclosed and managed.' },
        { title: 'Patient interests', description: 'Keep prescribing evidence-based and focused on patients rather than personal benefit.' },
        { title: 'Balanced judgement', description: 'Distinguish between every interaction being unethical and conflicts requiring appropriate safeguards.' },
      ],
      commonWeaknesses: ['Focusing only on whether the medication works.', 'Ignoring the appearance of influence.', 'Assuming disclosure alone removes every risk.'],
    },
  },
  {
    id: 'mmi-young-person-seeking-help', format: 'mmi', title: 'A young person seeking help', category: 'Safeguarding · confidentiality',
    preparation: 'A 15-year-old patient tells a GP that they do not feel safe at home and have been sleeping at friends’ houses. They ask the GP not to tell their parents because they fear being punished. You are observing the consultation as a medical student.',
    questions: ['What are the priorities in this consultation?', 'How should confidentiality be explained to the young person?', 'What should the healthcare team do next?', 'Tell us about a time you had to balance someone’s wish for privacy with concern for their wellbeing.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Safety first', description: 'Attend promptly to the young person’s immediate safety, wellbeing, and risk of harm.' },
        { title: 'Clear confidentiality limits', description: 'Explain that privacy is respected but information may need to be shared when serious harm is a concern.' },
        { title: 'Supportive escalation', description: 'Listen without judgement and involve senior clinicians and safeguarding services appropriately.' },
      ],
      commonWeaknesses: ['Promising absolute secrecy.', 'Disclosing information without explaining why.', 'Ignoring the young person’s maturity, wishes, or fear of punishment.'],
    },
  },
  {
    id: 'mmi-telehealth-privacy', format: 'mmi', title: 'Telehealth privacy', category: 'Confidentiality · autonomy',
    preparation: 'You are observing a telehealth consultation with a university student who is discussing anxiety and sleep difficulties. Their parent remains in the room and answers several questions for them. The student says little, but later sends a message asking whether future appointments can be private.',
    questions: ['What concerns do you have?', 'How could the clinician support the student’s privacy while maintaining a respectful relationship with the parent?', 'What are some limitations of telehealth consultations?', 'Tell us about a time you noticed that someone was not being given space to speak for themselves.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Private opportunity', description: 'Recognise that privacy cannot be assumed and create a respectful opportunity for the student to speak alone.' },
        { title: 'Autonomy and relationships', description: 'Respect the student’s autonomy while acknowledging that the parent may be a source of support.' },
        { title: 'Telehealth limits', description: 'Consider safety, confidentiality, technology, and communication barriers before relying on remote care.' },
      ],
      commonWeaknesses: ['Assuming the parent’s presence means the student is comfortable.', 'Removing the parent abruptly without explanation.', 'Ignoring the student’s later request for private appointments.'],
    },
  },
  {
    id: 'mmi-homelessness-and-discharge', format: 'mmi', title: 'Homelessness and discharge planning', category: 'Equity · continuity of care',
    preparation: 'A patient is medically ready to leave hospital after treatment for pneumonia. During discharge planning, they reveal they have been sleeping in their car and cannot afford the prescribed medication. A staff member says, “There is nothing more we can do—their medical issue has been treated.”',
    questions: ['What concerns arise from this response?', 'What should good discharge planning involve?', 'How do social circumstances affect health outcomes?', 'Tell us about a time you saw a practical barrier prevent someone from achieving an important goal.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Safe discharge', description: 'Recognise that safe discharge includes housing, medication access, transport, support, and follow-up—not only the immediate illness.' },
        { title: 'Non-stigmatising care', description: 'Use respectful language and avoid treating homelessness as a personal failure.' },
        { title: 'Team-based plan', description: 'Involve social work, pharmacy, community services, and the wider care team to reduce foreseeable risk.' },
      ],
      commonWeaknesses: ['Treating discharge as complete when the pneumonia improves.', 'Blaming the patient for unaffordable care.', 'Failing to seek practical support.'],
    },
  },
  {
    id: 'mmi-artificial-intelligence-in-healthcare', format: 'mmi', title: 'Artificial intelligence in healthcare', category: 'Technology · fairness',
    preparation: 'A hospital introduces an artificial-intelligence tool to help prioritise patients for outpatient appointments. A patient is concerned that an algorithm may make decisions about their care and asks, “How do I know the system will treat me fairly?”',
    questions: ['How would you respond to the patient?', 'What are potential benefits and risks of using AI in healthcare?', 'What safeguards should be in place?', 'Tell us about a time you used technology to make a decision. What limitations did you notice?'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Openness', description: 'Explain what the tool does and does not do in clear language, without overstating certainty.' },
        { title: 'Fairness and privacy', description: 'Recognise risks of bias, privacy breaches, unequal access, and inappropriate data use.' },
        { title: 'Human accountability', description: 'Emphasise human oversight, transparent evaluation, and a way to question or review decisions.' },
      ],
      commonWeaknesses: ['Assuming AI is automatically objective or better.', 'Rejecting technology without considering potential benefits.', 'Failing to explain safeguards to the patient.'],
    },
  },
  {
    id: 'mmi-witnessing-disrespectful-behaviour', format: 'mmi', title: 'Witnessing disrespectful behaviour', category: 'Professionalism · patient dignity',
    preparation: 'During placement, you overhear a senior doctor joking about a patient’s body size with another staff member. The patient cannot hear the conversation. Several team members laugh, while one nurse looks uncomfortable. You feel uneasy but worry that speaking up may affect your placement.',
    questions: ['What concerns does this situation raise?', 'What could you do as a medical student?', 'Why does respectful language matter even when patients are not present?', 'Tell us about a time you had to decide whether to speak up about behaviour you felt was inappropriate.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Dignity and culture', description: 'Recognise that disrespectful language reinforces bias and damages team culture even when the patient does not hear it.' },
        { title: 'Proportionate action', description: 'Consider a safe, respectful way to speak up or seek support from a supervisor.' },
        { title: 'Power awareness', description: 'Acknowledge the student’s vulnerability while maintaining professionalism and patient-centred standards.' },
      ],
      commonWeaknesses: ['Dismissing the comment because the patient was absent.', 'Confronting a senior clinician aggressively without considering safety.', 'Failing to seek support when the power imbalance makes direct action unsafe.'],
    },
  },
  {
    id: 'mmi-connection-to-community', format: 'mmi', title: 'Connection to community', category: 'Community · service',
    preparation: 'Our university serves a rich and diverse community, including people who have historically been underserved by healthcare. These questions explore your connection to community.',
    questions: ['What does “community” mean to you?', 'Tell us how you have demonstrated a meaningful connection to your own community. If you are a rural applicant, you may wish to discuss your connection to your rural community.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Thoughtful definition', description: 'Explain that community may involve place, identity, shared values, relationships, or common purpose.' },
        { title: 'Specific example', description: 'Describe a genuine experience with a clear role, actions, and contribution.' },
        { title: 'Reciprocity and insight', description: 'Show what you learned from the community, connect the experience to empathy, service, teamwork, or future medical practice, and avoid a rescuer narrative.' },
        { title: 'Authenticity', description: 'Speak genuinely about your own community; rural applicants may describe lived connection, contribution, and understanding of rural needs.' },
      ],
      commonWeaknesses: ['Giving a generic definition with no personal example.', 'Describing community involvement as a résumé item without reflection.', 'Taking a rescuer approach rather than recognising community strengths and shared learning.', 'Making broad assumptions about rural or underserved communities.'],
    },
  },
  {
    id: 'mmi-community-funding-priorities', format: 'mmi', title: 'Community funding priorities', category: 'Community · prioritisation',
    preparation: 'Your local council has funding for only one new community program. One proposal is for an after-school youth centre in an area with limited activities for teenagers. The other is for a digital-skills program for older residents who feel isolated and struggle to access services online. Both groups have strong support, but funding only one means the other will not proceed this year.',
    questions: ['How would you approach this decision?', 'What information would you want before deciding?', 'How can decision-makers make limited funding decisions fairly?', 'Tell us about a time you had to balance competing needs or priorities.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Fair process', description: 'Recognise that both groups have legitimate needs and explain a fair process rather than choosing based on personal identification.' },
        { title: 'Evidence and consultation', description: 'Consider need, likely impact, alternative services, community consultation, and long-term benefit.' },
        { title: 'Communication', description: 'Explain the decision clearly and consider how to support the unsuccessful group in future.' },
      ],
      commonWeaknesses: ['Treating one group’s needs as automatically more important.', 'Giving a conclusion without explaining how the decision would be made fairly.'],
    },
  },
  {
    id: 'mmi-selecting-team-captain', format: 'mmi', title: 'Selecting a team captain', category: 'Leadership · teamwork',
    preparation: 'You are on the committee of a community sports club. Two people have applied to be team captain. One is the strongest player and has been at the club for years, but can be dismissive of less experienced players. The other is less skilled but is reliable, encouraging, and widely trusted by newer members. Several people argue that the captain should simply be the best player.',
    questions: ['What qualities should a team captain have?', 'How would you make the selection process fair?', 'How would you explain the outcome to the unsuccessful applicant?', 'Tell us about a time you worked with, or were led by, someone who influenced a group positively or negatively.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Whole-person leadership', description: 'Recognise that leadership involves communication, inclusion, reliability, accountability, role modelling, and more than technical ability.' },
        { title: 'Transparent criteria', description: 'Use clear, role-relevant criteria and a consistent process rather than popularity or personal preference.' },
        { title: 'Respectful outcome', description: 'Communicate the decision honestly and respectfully to both applicants.' },
      ],
      commonWeaknesses: ['Equating leadership solely with performance.', 'Criticising either applicant personally instead of focusing on role requirements.'],
    },
  },
  {
    id: 'mmi-safety-at-a-party', format: 'mmi', title: 'Safety at a party', category: 'Safety · judgement',
    preparation: 'At a friend’s party, you notice someone preparing to drive home after drinking. They insist that they are fine to drive and become annoyed when others question them. Their friends are reluctant to intervene because they do not want to “make a scene”.',
    questions: ['What would you do?', 'How would you speak to the person without escalating the situation?', 'What other options could help keep everyone safe?', 'Tell us about a time you had to intervene, or wished you had intervened, when you were concerned about someone’s safety.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Immediate safety', description: 'Prioritise preventing an impaired person from driving while staying calm and respectful.' },
        { title: 'De-escalation', description: 'Avoid shaming or confrontation and involve trusted friends or others who can help.' },
        { title: 'Practical alternatives', description: 'Suggest a taxi, rideshare, public transport, staying overnight, or further help if the risk remains serious.' },
      ],
      commonWeaknesses: ['Allowing social discomfort to prevent action.', 'Responding aggressively without considering a safer way to intervene.'],
    },
  },
  {
    id: 'mmi-sharing-misinformation-online', format: 'mmi', title: 'Sharing misinformation online', category: 'Integrity · communication',
    preparation: 'A video begins circulating in your community group chat claiming that a local teacher has behaved inappropriately towards students. The video has been heavily edited and provides no reliable source. Several people begin sharing it widely and posting angry comments. A friend tells you that sharing it is important because “people deserve to know”.',
    questions: ['What concerns does this situation raise?', 'What would you do before sharing or commenting on the video?', 'What responsibility do individuals have when communicating online?', 'Tell us about a time you had to reconsider information you initially believed.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Pause and verify', description: 'Check the source, context, evidence, and necessity of sharing before amplifying an unverified claim.' },
        { title: 'Potential harm', description: 'Recognise possible harm to individuals, students, due process, and public trust from rapid and lasting online spread.' },
        { title: 'Responsible reporting', description: 'Distinguish reporting genuine concerns through appropriate channels from spreading unverified allegations.' },
      ],
      commonWeaknesses: ['Treating virality as evidence of truth.', 'Suggesting that concerns should never be reported rather than separating reporting from online amplification.'],
    },
  },
  {
    id: 'mmi-witnessing-public-transport-harassment', format: 'mmi', title: 'Witnessing harassment on public transport', category: 'Safety · bystander action',
    preparation: 'On a train, you see a passenger repeatedly make unwanted comments towards another passenger. The targeted person looks uncomfortable but does not respond. Other people nearby notice but remain silent. You are unsure whether directly confronting the person would make the situation worse.',
    questions: ['What options do you have as a bystander?', 'How would you prioritise the safety and wishes of the targeted person?', 'What makes bystander intervention difficult?', 'Tell us about a time you saw behaviour that made someone else uncomfortable. How did you respond?'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Safety over heroics', description: 'Focus on reducing risk rather than assuming direct confrontation is always best.' },
        { title: 'Multiple options', description: 'Consider checking in, creating a distraction, moving closer, seeking staff support, or recording details when appropriate.' },
        { title: 'Agency and reflection', description: 'Keep the targeted person’s wishes central and reflect on power, uncertainty, and passive bystanding.' },
      ],
      commonWeaknesses: ['Assuming direct confrontation is always the best response.', 'Focusing on the bystander’s comfort rather than the targeted person’s safety.'],
    },
  },
  {
    id: 'mmi-photographing-volunteers', format: 'mmi', title: 'Photographing volunteers', category: 'Dignity · consent',
    preparation: 'You volunteer with a community organisation that provides food and clothing to people experiencing hardship. The organisation wants to post photographs of volunteers and visitors on social media to encourage donations. A coordinator says, “The more emotional the photos are, the more money we will raise.”',
    questions: ['What ethical issues should the organisation consider?', 'How could it seek consent respectfully?', 'How can organisations tell powerful stories without exploiting people?', 'Tell us about a time you had to consider how your actions might affect another person’s dignity or privacy.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Dignity and consent', description: 'Respect privacy and seek genuinely informed, freely given consent rather than relying on a signature alone.' },
        { title: 'Power imbalance', description: 'Recognise that people receiving support may not feel free to decline a request from the organisation.' },
        { title: 'Respectful alternatives', description: 'Consider volunteer stories, anonymised accounts, or images that do not identify people.' },
      ],
      commonWeaknesses: ['Treating consent as a simple formality.', 'Assuming a good cause automatically justifies intrusive images.'],
    },
  },
  {
    id: 'mmi-ai-in-group-assignment', format: 'mmi', title: 'Using AI in a group assignment', category: 'Integrity · technology',
    preparation: 'You are completing a group assignment. One member uses an AI tool to write most of their section but does not disclose this to the group or acknowledge it in the assignment. They argue that everyone uses these tools and that the final work is still accurate.',
    questions: ['What issues arise in this situation?', 'How would you raise the issue with the group member?', 'How should people use AI responsibly in education or work?', 'Tell us about a time you had to choose between an easier option and doing something with integrity.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Academic integrity', description: 'Recognise authorship, transparency, accountability, and the relevant institutional rules.' },
        { title: 'Balanced technology use', description: 'Acknowledge that AI can assist learning while not replacing accountable work or agreed disclosure.' },
        { title: 'Respectful resolution', description: 'Raise the issue with the group member before escalating where appropriate, while protecting fairness for all.' },
      ],
      commonWeaknesses: ['Treating AI as automatically cheating or automatically harmless.', 'Focusing only on whether the final answer was correct.'],
    },
  },
  {
    id: 'mmi-favouritism-at-work', format: 'mmi', title: 'Favouritism at work', category: 'Fairness · professionalism',
    preparation: 'You work part-time in a café. The manager consistently gives desirable weekend shifts to their friends, while other staff receive fewer hours and less notice of roster changes. Several colleagues are frustrated but feel that speaking up may risk their employment.',
    questions: ['What impact might this have on the workplace?', 'How could you raise the issue constructively?', 'What would a fair rostering process look like?', 'Tell us about a time you experienced or observed unfairness in a group or workplace.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Workplace impact', description: 'Recognise effects on morale, trust, retention, and teamwork.' },
        { title: 'Proportionate action', description: 'Gather facts, raise concerns respectfully, and use appropriate workplace channels without assuming motives.' },
        { title: 'Practical fairness', description: 'Suggest transparent criteria, advance notice, and a clear process for requesting shifts while considering retaliation risk.' },
      ],
      commonWeaknesses: ['Assuming the manager’s motives without evidence.', 'Recommending public confrontation as the first response.'],
    },
  },
  {
    id: 'mmi-controversial-speaker', format: 'mmi', title: 'A controversial speaker', category: 'Values · respectful disagreement',
    preparation: 'A university society invites a speaker whose views on immigration have generated strong criticism. Some students believe the event should proceed in the interests of free expression. Others say the speaker’s views may make students from migrant backgrounds feel unsafe or unwelcome. A protest is planned outside the event.',
    questions: ['What values are in tension in this scenario?', 'How could the university respond fairly?', 'What would a respectful discussion about controversial views look like?', 'Tell us about a time you had to engage with a viewpoint that challenged your own beliefs.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Nuanced values', description: 'Recognise both freedom of expression and the need for a safe, respectful learning environment without treating either as absolute.' },
        { title: 'Fair safeguards', description: 'Consider clear event rules, security, respectful protest, and opportunities for response or dialogue.' },
        { title: 'Open engagement', description: 'Listen without endorsing harmful behaviour and consider the impact of speech on people directly affected by it.' },
      ],
      commonWeaknesses: ['Equating disagreement with personal attack.', 'Ignoring the impact of speech on people directly affected by it.'],
    },
  },
  {
    id: 'mmi-neighbourhood-cctv', format: 'mmi', title: 'Neighbourhood CCTV', category: 'Privacy · safety',
    preparation: 'Your neighbour installs security cameras after several cars are damaged on the street. One camera also records part of your front yard and your living-room window. When you raise the issue, the neighbour says that security matters more than privacy and refuses to adjust the camera angle.',
    questions: ['What are the competing concerns in this situation?', 'How would you approach the conversation with your neighbour?', 'When can security measures become unreasonable or intrusive?', 'Tell us about a time you had to balance your own needs with another person’s rights or preferences.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Competing rights', description: 'Recognise that both safety and privacy are legitimate concerns.' },
        { title: 'Constructive compromise', description: 'Start with a calm conversation focused on adjustment, proportionate surveillance, and practical compromise.' },
        { title: 'Proportionate escalation', description: 'Seek formal advice or mediation if informal discussion fails, rather than escalating immediately.' },
      ],
      commonWeaknesses: ['Dismissing either privacy or safety as unimportant.', 'Escalating immediately without trying constructive resolution.'],
    },
  },
  {
    id: 'mmi-housing-versus-green-space', format: 'mmi', title: 'Housing versus green space', category: 'Community · competing needs',
    preparation: 'Your local council proposes building affordable housing on a large area of public green space. Supporters argue that housing insecurity is an urgent problem. Opponents say the park is one of the few free places where children, older people, and families can gather. The council asks residents for feedback.',
    questions: ['How would you approach this issue?', 'What voices should be included in the consultation process?', 'What information would help the council make a responsible decision?', 'Tell us about a time you had to consider a decision’s impact on people with different needs from your own.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Competing wellbeing needs', description: 'Recognise that housing and green space both support community wellbeing.' },
        { title: 'Inclusive consultation', description: 'Include people directly affected by housing insecurity and treat consultation as meaningful rather than tokenistic.' },
        { title: 'Evidence and alternatives', description: 'Consider alternatives, evidence, long-term consequences, and the possibility that difficult trade-offs remain.' },
      ],
      commonWeaknesses: ['Treating consultation as a token exercise.', 'Choosing a side without considering alternatives or evidence.'],
    },
  },
  {
    id: 'mmi-misrepresenting-charity-beneficiary', format: 'mmi', title: 'Misrepresenting a charity beneficiary', category: 'Integrity · dignity',
    preparation: 'A local charity shares a social-media post about a person it has supported. The story is emotional and has attracted many donations, but you later learn that several details were exaggerated and the person was not shown the final post before it was published. The charity argues that the post has helped many others by bringing in funds.',
    questions: ['What concerns does this raise?', 'How should the charity respond once it becomes aware of the problem?', 'Can a positive outcome justify misleading communication?', 'Tell us about a time you had to decide whether a result was worth the way it was achieved.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Honesty and consent', description: 'Recognise the importance of accuracy, consent, dignity, trust, and the person’s control over their story.' },
        { title: 'Practical remedy', description: 'Review the post, apologise where appropriate, correct the record, and improve consent processes.' },
        { title: 'No outcome-based excuse', description: 'Understand that charitable aims do not justify misrepresentation or treating someone’s experience as charity property.' },
      ],
      commonWeaknesses: ['Focusing only on donation totals.', 'Treating the person’s experience as charity property.'],
    },
  },
  {
    id: 'mmi-exam-answer-group-chat', format: 'mmi', title: 'An exam answer in a group chat', category: 'Academic integrity · courage',
    preparation: 'The night before an exam, someone posts what appears to be a photograph of an exam question in your course group chat. Several students begin discussing the answer. You are unsure whether the question is genuine, but you suspect it may have been obtained improperly.',
    questions: ['What would you do?', 'Why does academic integrity matter beyond simply following rules?', 'How could you address the situation without unfairly accusing someone?', 'Tell us about a time you faced pressure to go along with something you believed was wrong.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Do not use or spread it', description: 'Commit not to use potentially compromised material and avoid spreading it further.' },
        { title: 'Measured reporting', description: 'Preserve relevant information and report through appropriate channels without publicly accusing an individual without evidence.' },
        { title: 'Fairness and courage', description: 'Recognise the effect on other students and qualifications, and act despite peer pressure.' },
      ],
      commonWeaknesses: ['Justifying use because others may use it.', 'Publicly accusing someone without evidence.'],
    },
  },
  {
    id: 'mmi-shoplifting-accusation', format: 'mmi', title: 'A shoplifting accusation', category: 'Fairness · bystander action',
    preparation: 'You are in a shop when a staff member stops a young person near the exit and loudly accuses them of stealing. The young person denies it and looks frightened. You have not seen what happened, but you notice that other customers begin filming and making assumptions about them.',
    questions: ['What concerns do you have about this situation?', 'What could you do as a bystander?', 'Why is it important not to make assumptions in public situations?', 'Tell us about a time you realised that your first impression of someone or something was incomplete.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Dignity and fairness', description: 'Recognise the risks of bias, public humiliation, and acting without knowing the facts.' },
        { title: 'Proportionate bystander role', description: 'Avoid amplifying the situation, discourage filming where safe, and seek staff or security support if needed.' },
        { title: 'Reflective judgement', description: 'Understand how stereotypes and assumptions can affect behaviour and public treatment.' },
      ],
      commonWeaknesses: ['Assuming guilt or innocence without evidence.', 'Turning the situation into public entertainment by filming or sharing it.'],
    },
  },
  {
    id: 'mmi-discrimination-customer-service', format: 'mmi', title: 'Discrimination in customer service', category: 'Inclusion · professionalism',
    preparation: 'At your casual job, a manager says that certain customers “prefer” staff from particular cultural backgrounds and begins allocating staff accordingly. A colleague who is affected laughs it off in front of the manager but later tells you they feel humiliated and do not know what to do.',
    questions: ['What issues are raised by the manager’s behaviour?', 'How could you support your colleague?', 'What should a respectful workplace do to prevent discrimination?', 'Tell us about a time you helped create a more inclusive environment.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Recognise discrimination', description: 'Understand that customer preference does not justify discriminatory treatment of staff.' },
        { title: 'Support without taking over', description: 'Support the colleague while respecting their choices, privacy, and readiness to act.' },
        { title: 'Organisational responsibility', description: 'Consider policies, reporting pathways, leadership responsibility, and the need for action beyond saying discrimination is wrong.' },
      ],
      commonWeaknesses: ['Minimising the issue because the colleague initially laughed.', 'Assuming the colleague must make a formal complaint before support is possible.'],
    },
  },
  {
    id: 'mmi-rural-practice-professional-boundaries', format: 'mmi', title: 'Rural practice and professional boundaries', category: 'Rural health · professionalism',
    preparation: 'You are a medical student on placement in a small rural town. At a local football match, a well-known community member approaches the town’s GP and begins asking about a rash they have developed. Several of the person’s friends and family are nearby. The GP also volunteers at the football club and knows the person socially. The GP looks uncomfortable but does not want to appear unfriendly or inaccessible. The community member says that getting an appointment is difficult and asks for “just a quick opinion”.',
    questions: ['What challenges arise for doctors practising in small communities?', 'How should the GP respond in this situation?', 'Why are professional boundaries important, even where relationships overlap?', 'Tell us about a time you had to balance being helpful with maintaining an appropriate boundary.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Rural context', description: 'Recognise that rural clinicians often have overlapping personal, professional, and community roles.' },
        { title: 'Privacy and boundaries', description: 'Protect privacy in public while responding warmly and arranging an appropriate consultation.' },
        { title: 'Mutual protection', description: 'Explain that clear boundaries protect both the patient and clinician without treating them as cold or unnecessary.' },
      ],
      commonWeaknesses: ['Treating boundaries as cold or unnecessary in rural communities.', 'Offering a public clinical opinion without considering privacy or continuity of care.'],
    },
  },
  {
    id: 'mmi-rural-research-community-partnership', format: 'mmi', title: 'Rural research and community partnership', category: 'Rural health · community',
    preparation: 'A university research team proposes a study on chronic illness in a rural town. The researchers plan to collect interviews and health data over six months, then return to the city to analyse and publish the findings. Local residents are concerned that previous researchers have collected information, published papers, and never returned with results or practical benefits for the town. A local community group asks whether residents can help shape the research questions and decide how the findings are shared. One researcher argues that this will slow down the project.',
    questions: ['What concerns do the residents raise?', 'How could the research team work respectfully with the community?', 'Why is community partnership particularly important in rural health research?', 'Tell us about a time you worked with a group rather than simply doing something for them.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Trust and reciprocity', description: 'Recognise local knowledge, transparency, trust, and the need for benefits that matter locally.' },
        { title: 'Genuine partnership', description: 'Support community involvement from planning through to interpreting and sharing outcomes.' },
        { title: 'Respectful research', description: 'Treat rural residents as partners rather than simply sources of data, even when partnership takes time.' },
      ],
      commonWeaknesses: ['Assuming consultation is only needed after the research design is complete.', 'Treating publication as sufficient benefit to the community.'],
    },
  },
  {
    id: 'mmi-scope-of-practice', format: 'mmi', title: 'Working within scope of practice', category: 'Patient safety · professionalism',
    preparation: 'During placement, a registrar asks you to take blood from a patient because the ward is busy. You have watched the procedure several times and practised on a simulation arm, but you have never performed it on a patient. The registrar says, “You will learn eventually—just have a go. I do not have time to supervise closely.” The patient appears anxious and asks whether you have done this procedure before. You worry that declining may make you seem unhelpful or incapable.',
    questions: ['What would you do?', 'How would you respond honestly to the patient?', 'Why is working within scope of practice important?', 'Tell us about a time you had to acknowledge a limitation or ask for help.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Safety and consent', description: 'Put patient safety first and be honest about your experience before any procedure occurs.' },
        { title: 'Supervised learning', description: 'Decline to proceed without appropriate supervision while showing willingness to learn safely.' },
        { title: 'Professional courage', description: 'Seek support despite hierarchy or time pressure rather than accepting work beyond your competence.' },
      ],
      commonWeaknesses: ['Agreeing simply to avoid disappointing a supervisor.', 'Hiding limited experience from the patient.'],
    },
  },
  {
    id: 'mmi-consent-for-student-learning', format: 'mmi', title: 'Consent for student learning', category: 'Consent · patient dignity',
    preparation: 'You are on a surgical placement. Before an operation, a patient agrees to surgery but is not told that medical students may be present. After the patient is under anaesthetic, another student suggests that this is a useful opportunity for students to practise an intimate examination because the patient “will not know and it helps us learn”. You are uncomfortable and are unsure whether the patient gave permission for this specific examination. The theatre team is busy, and nobody else appears to question the suggestion.',
    questions: ['What are the key ethical issues?', 'What should happen before students are involved in intimate examinations?', 'What would you do as a student in this situation?', 'Tell us about a time you spoke up, or wished you had spoken up, when something did not feel right.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Specific consent', description: 'Recognise that consent for surgery is not blanket consent for student learning or an intimate examination.' },
        { title: 'Dignity and autonomy', description: 'Respect the patient’s dignity and pause to seek clarification from an appropriate supervisor.' },
        { title: 'Speak up', description: 'Understand that educational value does not override consent, even when the patient is unconscious.' },
      ],
      commonWeaknesses: ['Assuming an unconscious patient cannot be harmed because they are unaware at the time.', 'Remaining silent because the theatre team is busy.'],
    },
  },
  {
    id: 'mmi-genetic-information-family-members', format: 'mmi', title: 'Genetic information and family members', category: 'Confidentiality · genetics',
    preparation: 'A patient receives a genetic test result showing a hereditary condition that may also affect close relatives. The patient is distressed and says they do not want to tell their siblings because they fear causing anxiety and damaging family relationships. One sibling is planning to have children and may benefit from knowing about the result. The patient asks the genetic counsellor to keep the information completely private. The counsellor wants to respect the patient’s wishes but is concerned about the possible implications for relatives.',
    questions: ['What issues need to be balanced here?', 'How could the counsellor support the patient?', 'Why can genetic information be different from other health information?', 'Tell us about a time you had to consider how a decision might affect people beyond those immediately involved.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Privacy and family implications', description: 'Respect the patient’s privacy and distress while recognising that genetic information may affect relatives.' },
        { title: 'Supportive communication', description: 'Explore concerns, offer counselling, and encourage supported family communication rather than immediately contacting relatives.' },
        { title: 'Specialist complexity', description: 'Recognise that complex legal and ethical questions require specialist guidance and careful process.' },
      ],
      commonWeaknesses: ['Assuming relatives should be contacted immediately.', 'Ignoring the patient’s emotional response or need for support.'],
    },
  },
  {
    id: 'mmi-payment-clinical-trial', format: 'mmi', title: 'Payment for clinical-trial participation', category: 'Research ethics · consent',
    preparation: 'A research team is recruiting participants for a clinical trial. The study requires several visits, blood tests, and regular questionnaires. Participants are offered a payment that is much higher than reimbursement for travel costs. A staff member says that the payment is necessary because recruitment has been slow. One potential participant is experiencing severe financial stress and says they would join mainly because they need the money, although they are unsure they understand all the risks and commitments involved.',
    questions: ['What ethical concerns arise?', 'How can researchers ensure consent is genuinely informed and voluntary?', 'Is it ever appropriate to compensate research participants?', 'Tell us about a time you noticed that someone’s circumstances affected how freely they could make a decision.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Undue influence', description: 'Distinguish fair reimbursement from payment that could pressure someone in financial hardship to accept risks.' },
        { title: 'Voluntary consent', description: 'Emphasise clear information, time to decide, and freedom to decline without penalty.' },
        { title: 'Respect and safeguards', description: 'Respect people in financial hardship without assuming they cannot consent, while recognising research ethics protections against exploitation.' },
      ],
      commonWeaknesses: ['Claiming any payment makes consent invalid.', 'Ignoring the participant’s uncertainty about risks and commitments.'],
    },
  },
  {
    id: 'mmi-voluntary-assisted-dying-family-disagreement', format: 'mmi', title: 'Voluntary assisted dying and family disagreement', category: 'Autonomy · end-of-life care',
    preparation: 'A patient with an advanced, progressive illness asks their doctor about voluntary assisted dying. The patient says they have considered the decision carefully and want information about their options. Their adult child strongly disagrees and asks the doctor not to discuss it, arguing that the patient is depressed and that the family should decide together. The patient asks to speak to the doctor alone. You are observing the consultation as a medical student.',
    questions: ['What are the key issues in this consultation?', 'How should the doctor respond to the patient and family member?', 'What would your role be as a medical student?', 'Tell us about a time you had to respect someone’s values or choices even when others disagreed.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Autonomy and capacity', description: 'Respect patient privacy and autonomy while ensuring careful assessment of decision-making capacity.' },
        { title: 'Family support', description: 'Acknowledge the family’s distress without allowing them to override the patient’s wishes.' },
        { title: 'Careful process', description: 'Recognise that legal requirements vary and specialist guidance is needed; as a student, observe, support, and escalate appropriately.' },
      ],
      commonWeaknesses: ['Turning the station into a debate about personal beliefs.', 'Allowing family preference to replace patient-centred assessment.'],
    },
  },
  {
    id: 'mmi-discriminatory-request-patient', format: 'mmi', title: 'A discriminatory request from a patient', category: 'Equity · professionalism',
    preparation: 'During placement, a patient tells a nurse that they do not want to be cared for by a doctor from a particular ethnic background. The patient says they “would feel more comfortable with someone local”. The doctor concerned is clinically competent and available. The nurse looks uncomfortable and asks you to wait outside while the team decides what to do. Other patients are waiting, and changing clinicians may delay care. The team wants to manage the situation without escalating conflict or undermining staff dignity.',
    questions: ['What concerns does this situation raise?', 'How should the healthcare team respond?', 'How can staff be supported when they experience discrimination?', 'Tell us about a time you observed exclusion or prejudice. How did you respond?'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Staff dignity', description: 'Recognise that discriminatory preferences should not be normalised and that staff deserve safety and professional respect.' },
        { title: 'Calm boundaries', description: 'Distinguish reasonable clinical needs from prejudice and respond clearly without unnecessary escalation.' },
        { title: 'Organisational support', description: 'Use workplace policies and senior support where needed while continuing to provide safe care.' },
      ],
      commonWeaknesses: ['Prioritising patient preference without considering discrimination against staff.', 'Responding in a way that escalates conflict unnecessarily.'],
    },
  },
  {
    id: 'mmi-therapy-dogs-infection-control', format: 'mmi', title: 'Therapy dogs and infection control', category: 'Patient wellbeing · safety',
    preparation: 'A children’s hospital is considering allowing certified therapy dogs onto one ward. Families say that visits from animals may reduce fear and make long admissions less isolating. However, some children on the ward have weakened immune systems, and infection-control staff are concerned about allergies, hygiene, and potential transmission of illness. A parent whose child has been in hospital for months says that refusing the program would be “heartless”. Another parent says they would be afraid to bring their child onto the ward if dogs were present.',
    questions: ['How would you approach this decision?', 'What information would you need?', 'How can the hospital respect different families’ concerns?', 'Tell us about a time you had to weigh emotional benefits against practical risks.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Both forms of wellbeing', description: 'Recognise that emotional wellbeing and physical safety both matter.' },
        { title: 'Evidence and safeguards', description: 'Seek infection-control guidance, evidence, allergy information, patient choice, and practical safeguards.' },
        { title: 'Balanced implementation', description: 'Consider controlled visits, separate spaces, or other designs that respect families on both sides.' },
      ],
      commonWeaknesses: ['Presenting compassion and safety as mutually exclusive.', 'Dismissing either parent’s concerns without seeking workable safeguards.'],
    },
  },
  {
    id: 'mmi-frequent-emergency-department-presenter', format: 'mmi', title: 'A frequent emergency-department presenter', category: 'Empathy · clinical judgement',
    preparation: 'You are observing in an emergency department when a patient arrives for the fourth time that month with abdominal pain. A staff member says, “They are always here—nothing is ever wrong.” The patient overhears this and becomes upset, saying they feel nobody takes them seriously. You do not know the patient’s history. The department is busy, and staff are under pressure. A senior doctor says the patient should be assessed quickly but asks the team to avoid making assumptions based on previous visits.',
    questions: ['What concerns arise from the staff member’s comment?', 'How should the team approach this patient’s care?', 'Why can repeated presentations occur?', 'Tell us about a time you realised that a label or first impression was unfair.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Avoid bias', description: 'Recognise stigma and diagnostic bias, and support a respectful fresh assessment using prior information appropriately.' },
        { title: 'Complex needs', description: 'Understand that repeated presentations may reflect medical, social, psychological, or access-related needs.' },
        { title: 'Compassionate systems thinking', description: 'Show empathy for the patient while acknowledging pressure on staff without excusing dismissive language.' },
      ],
      commonWeaknesses: ['Assuming the patient is definitely unwell or definitely exaggerating.', 'Allowing previous presentations to replace current assessment.'],
    },
  },
  {
    id: 'mmi-unexpected-costs-private-care', format: 'mmi', title: 'Unexpected costs in private care', category: 'Consent · equity',
    preparation: 'A patient attends a private specialist clinic after being told that their health insurance would cover “most” of the appointment and procedure costs. After treatment, they receive several unexpected bills, including a gap fee and charges from other providers involved in their care. The patient says that if the likely cost had been clear, they would have chosen a different option or delayed treatment. The clinic manager says the information was technically available in paperwork, but accepts that it was not explained clearly.',
    questions: ['What are the ethical issues here?', 'What does informed financial consent involve?', 'How should the clinic respond to the patient’s complaint?', 'Tell us about a time unclear information affected someone’s ability to make a decision.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Meaningful choice', description: 'Recognise that financial information can affect a patient’s ability to make a genuine choice.' },
        { title: 'Clear communication', description: 'Support timely, understandable discussion of likely out-of-pocket costs, including other providers involved.' },
        { title: 'Patient-centred remedy', description: 'Respond to the complaint with review, acknowledgement, and apology where appropriate; paperwork alone is not enough.' },
      ],
      commonWeaknesses: ['Saying paperwork alone ensures informed consent.', 'Focusing on technical disclosure rather than whether the patient understood the likely costs.'],
    },
  },
  {
    id: 'mmi-personal-health-data-wearable', format: 'mmi', title: 'Personal health data from a wearable device', category: 'Technology · privacy',
    preparation: 'A hospital offers patients a wearable device that tracks heart rate, sleep, and activity after discharge. The program may help clinicians identify early deterioration and reduce readmissions. However, patients are concerned about who can access the data, how long it is stored, whether it could be shared with technology companies, and whether people without smartphones will miss out. A clinician says that patients should accept the program because it could improve care. A patient replies, “I want help, but I also want control over my own information.”',
    questions: ['What are the potential benefits and concerns?', 'What should patients be told before joining the program?', 'How can the hospital avoid increasing inequity?', 'Tell us about a time you considered the trade-off between convenience and privacy.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Privacy and consent', description: 'Explain what data is collected, who can use it, how long it is kept, and how patients can opt out.' },
        { title: 'Equitable access', description: 'Recognise that digital health should not exclude people without smartphones, connectivity, or technical confidence.' },
        { title: 'Balanced view', description: 'Consider potential clinical benefit without treating technology as automatically good or rejecting it outright.' },
      ],
      commonWeaknesses: ['Focusing only on the technology’s benefits.', 'Assuming consent is meaningful without explaining data use and alternatives.'],
    },
  },
  {
    id: 'mmi-smoking-surgery-stigma', format: 'mmi', title: 'Smoking, surgery, and stigma', category: 'Health equity · communication',
    preparation: 'A surgeon tells a patient who smokes that they will not proceed with a non-urgent operation unless the patient stops smoking for several weeks beforehand. The surgeon explains that smoking increases surgical risk. The patient feels judged and says they have tried to quit several times but found it extremely difficult. They worry that being denied surgery is unfair and that they are being blamed for their health. The clinic has limited time, and the surgeon is considering simply cancelling the procedure.',
    questions: ['What issues should the surgeon consider?', 'How can risk be discussed without stigmatising the patient?', 'What support should be offered?', 'Tell us about a time you had to encourage change without making someone feel judged.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Risk and compassion', description: 'Recognise the need to reduce avoidable risk while treating dependence compassionately.' },
        { title: 'Non-judgemental care', description: 'Explain risks and any delay clearly without reducing the patient to a behaviour or assuming quitting is simple.' },
        { title: 'Practical support', description: 'Offer cessation programs, follow-up, and a plan rather than simply cancelling or dismissing the procedure.' },
      ],
      commonWeaknesses: ['Presenting smoking as a simple choice.', 'Using risk to justify dismissive or stigmatising treatment.'],
    },
  },
  {
    id: 'mmi-recording-a-consultation', format: 'mmi', title: 'Recording a consultation', category: 'Privacy · shared decision-making',
    preparation: 'During a consultation, a patient asks whether they can record the conversation on their phone because they find it difficult to remember complex information. The clinician feels uncomfortable and worries that a recording could later be shared online without context. The patient says they have previously left appointments confused and want to replay the discussion with a family member. You are observing as a medical student. The clinician asks the team what a fair approach would be.',
    questions: ['What are the potential benefits and concerns of recording consultations?', 'How could the clinician respond respectfully?', 'What alternatives might help the patient retain information?', 'Tell us about a time you adapted information to make it easier for another person to understand or remember.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Both perspectives', description: 'Recognise the patient’s need for understanding alongside clinician privacy and consent concerns.' },
        { title: 'Collaborative approach', description: 'Avoid an automatic refusal and discuss an approved recording process or agreed boundaries.' },
        { title: 'Accessible alternatives', description: 'Offer written summaries, teach-back, or follow-up discussions so the patient can participate meaningfully.' },
      ],
      commonWeaknesses: ['Framing the request as inherently suspicious.', 'Ignoring practical alternatives that improve understanding.'],
    },
  },
  {
    id: 'mmi-sustainability-hospital-practice', format: 'mmi', title: 'Sustainability in hospital practice', category: 'Sustainability · patient safety',
    preparation: 'A hospital is reviewing its use of single-use equipment and packaging. Staff want to reduce waste and carbon emissions, but some worry that reusable alternatives may be less convenient, require additional cleaning, or create infection-control risks. Others argue that healthcare has a responsibility to reduce its environmental impact because climate change also affects health. The hospital board asks a working group to recommend changes that are safe, practical, and acceptable to staff and patients.',
    questions: ['What factors should guide the hospital’s decision?', 'How can environmental sustainability be balanced with patient safety?', 'Who should be involved in planning the change?', 'Tell us about a time you had to consider the long-term impact of a routine decision.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Health and sustainability', description: 'Recognise that environmental sustainability is relevant to health and healthcare.' },
        { title: 'Evidence and safety', description: 'Prioritise evidence, safety testing, infection-control advice, and practical implementation.' },
        { title: 'System-wide change', description: 'Involve staff, patients, infection-control experts, and supply teams, recognising that meaningful change may be gradual.' },
      ],
      commonWeaknesses: ['Assuming environmental measures are automatically safe.', 'Assuming sustainability is automatically impractical or less important than convenience.'],
    },
  },
  {
    id: 'mmi-cultural-design', format: 'mmi', title: 'Using a cultural design', category: 'Cultural respect · integrity',
    preparation: 'A local clothing brand wants to use a design inspired by artwork from an Aboriginal artist in its new collection. The marketing team says the design would help promote Australian culture and attract customers. However, they have not contacted the artist or the relevant community, and one staff member points out that the design may have cultural significance beyond its visual appeal. The brand owner responds that inspiration is normal in fashion and that asking permission would make the project slower and more expensive.',
    questions: ['What concerns arise in this situation?', 'How should the brand proceed?', 'Why is consultation more than a legal or marketing exercise?', 'Tell us about a time you learned that an idea or tradition had meaning beyond what you first understood.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Cultural ownership', description: 'Recognise permission, attribution, cultural ownership, and fair benefit-sharing.' },
        { title: 'Meaningful consultation', description: 'Understand that culturally significant material may not be available for commercial use simply because it is visible publicly.' },
        { title: 'Humility', description: 'Support pausing the project and learning from the relevant artist and community before proceeding.' },
      ],
      commonWeaknesses: ['Treating cultural material as freely available because it is publicly visible.', 'Reducing consultation to a legal or marketing formality.'],
    },
  },
  {
    id: 'mmi-community-garden-fee', format: 'mmi', title: 'A community garden membership fee', category: 'Equity · community',
    preparation: 'A community garden introduces a yearly membership fee to cover tools, water, and maintenance. The committee believes the fee is modest and necessary. However, several residents say they cannot afford it and that the garden was one of the few places where they could access fresh food, meet neighbours, and involve their children in outdoor activities. Some committee members argue that anyone who cannot pay should simply volunteer more hours. Others worry that this may still exclude people with disability, caring responsibilities, or insecure work.',
    questions: ['What should the committee consider?', 'How could the garden remain financially sustainable and inclusive?', 'Why might “volunteer more hours” not be a fair solution for everyone?', 'Tell us about a time you noticed that a rule affected people differently.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Equity', description: 'Recognise that equal rules do not always produce equitable outcomes.' },
        { title: 'Practical inclusion', description: 'Consider concessions, waivers, sponsorship, flexible contributions, or alternative funding.' },
        { title: 'Different capacities', description: 'Respect different financial circumstances, time pressures, disability, and caring responsibilities.' },
      ],
      commonWeaknesses: ['Assuming inability to contribute money or time reflects lack of commitment.', 'Treating one contribution model as fair for everyone.'],
    },
  },
  {
    id: 'mmi-falsifying-invoice', format: 'mmi', title: 'Falsifying an invoice', category: 'Integrity · workplace',
    preparation: 'At your casual job, your supervisor asks you to change the date on an invoice so the business can claim the expense in the current financial year. They say the service was genuinely provided and that changing the date is “just fixing paperwork”. You are uncomfortable because the date would no longer reflect when the work occurred. Your supervisor tells you that everyone does this and hints that being cooperative could lead to more shifts. You rely on the income and worry about the consequences of refusing.',
    questions: ['What would you do?', 'What makes this situation difficult?', 'How could you raise your concern constructively?', 'Tell us about a time you experienced pressure to compromise your values.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Honest records', description: 'Recognise that changing a date dishonestly can create legal, financial, and trust consequences.' },
        { title: 'Constructive response', description: 'Raise the concern calmly and factually rather than accusing the supervisor.' },
        { title: 'Appropriate escalation', description: 'Seek advice or use a reporting pathway if pressure continues, while recognising the power imbalance faced by casual workers.' },
      ],
      commonWeaknesses: ['Minimising dishonesty because it is described as administrative.', 'Ignoring the employment pressure on the worker.'],
    },
  },
  {
    id: 'mmi-scholarship-conflict-interest', format: 'mmi', title: 'A scholarship conflict of interest', category: 'Fairness · governance',
    preparation: 'You sit on a student committee that awards a scholarship for community leadership. One applicant is the sibling of your close friend. You believe they are genuinely impressive and may deserve the scholarship, but you have spent time with their family and worry that other committee members may question your impartiality. The application rules do not explicitly say what to do in this situation. The committee meeting is tomorrow, and the chair asks whether anyone has any conflicts that should be declared.',
    questions: ['What would you do?', 'Why does perceived conflict matter as well as actual conflict?', 'How can committees make decisions transparently?', 'Tell us about a time you had to manage a situation where others might question your impartiality.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Prompt disclosure', description: 'Declare the relationship early, even if you believe you can remain objective.' },
        { title: 'Fair process', description: 'Recognise that the applicant may still be strong, but the process must remain impartial and credible.' },
        { title: 'Transparency', description: 'Consider stepping out of discussion or voting and support clear criteria and documented decisions.' },
      ],
      commonWeaknesses: ['Staying silent because of confidence in personal objectivity.', 'Treating perceived conflict as irrelevant to public trust.'],
    },
  },
  {
    id: 'mmi-accommodation-school-trip', format: 'mmi', title: 'Accommodation on a school trip', category: 'Inclusion · safeguarding',
    preparation: 'You are helping organise a school camp. A non-binary student asks for accommodation that allows them to feel safe and respected. Some parents object, saying that sleeping arrangements should be based strictly on sex assigned at birth. Other students are confused and have asked the organisers for guidance. The school wants to protect every student’s dignity while maintaining safety, privacy, and a workable plan for the trip. The student involved has asked not to be singled out in front of their classmates.',
    questions: ['What principles should guide the school’s decision?', 'How could the organisers involve the student respectfully?', 'How should concerns from parents and other students be handled?', 'Tell us about a time you helped make a group environment more inclusive.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Privacy and safety', description: 'Respect the student’s identity, dignity, privacy, and safety.' },
        { title: 'Student involvement', description: 'Involve the student in planning rather than imposing arrangements or singling them out.' },
        { title: 'Practical inclusion', description: 'Consider private spaces, rooming options, clear communication, and a calm response to concerns without validating discrimination.' },
      ],
      commonWeaknesses: ['Discussing the student publicly.', 'Treating inclusion as incompatible with safety.'],
    },
  },
  {
    id: 'mmi-difficult-neighbour-dispute', format: 'mmi', title: 'A difficult neighbour dispute', category: 'Conflict · empathy',
    preparation: 'Your neighbour regularly plays loud music late at night. When you raise the issue, they explain that they work night shifts and use music to stay awake while caring for a young child during the day. You work early mornings and have begun losing sleep. Other neighbours are becoming frustrated and want to make a formal complaint immediately. The neighbour says they feel judged and unsupported. You want a solution that respects everyone’s need for rest and avoids escalating conflict within the street.',
    questions: ['How would you approach the situation?', 'What information would help find a workable compromise?', 'When might formal mediation or a complaint be appropriate?', 'Tell us about a time you resolved, or tried to resolve, a conflict with someone whose needs differed from yours.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Legitimate needs', description: 'Recognise that both households have genuine needs without excusing ongoing unreasonable impact.' },
        { title: 'Listening and compromise', description: 'Listen before assuming bad intent and explore quiet hours, headphones, or other practical options.' },
        { title: 'Proportionate escalation', description: 'Use mediation or a formal complaint if respectful informal attempts fail.' },
      ],
      commonWeaknesses: ['Assuming empathy means accepting ongoing unreasonable behaviour.', 'Escalating immediately without trying constructive resolution.'],
    },
  },
  {
    id: 'mmi-renaming-public-monument', format: 'mmi', title: 'Renaming a public monument', category: 'History · community',
    preparation: 'Your local council is considering removing the name of a public monument that honours a historical figure associated with harmful policies towards First Nations people. Some residents say changing the name would acknowledge historical harm and make public spaces more welcoming. Others argue that removing the name erases history and that the monument should remain unchanged. The council plans to hold a public consultation. Some local First Nations representatives have said they are tired of being asked to repeatedly explain why the issue is painful.',
    questions: ['What should the council consider?', 'How can consultation be respectful and meaningful?', 'Is preserving history the same as preserving every public honour?', 'Tell us about a time you had to reconsider something you previously accepted as normal.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Historical honesty', description: 'Recognise historical harm, public symbolism, and the importance of diverse community perspectives.' },
        { title: 'Respectful consultation', description: 'Respect First Nations voices without placing the entire burden of education on them.' },
        { title: 'Considered options', description: 'Explore renaming, reinterpretation, education, or other options rather than assuming history requires preserving every public honour.' },
      ],
      commonWeaknesses: ['Treating the issue as only a debate about tradition.', 'Expecting First Nations people to repeatedly justify their experience of harm.'],
    },
  },
  {
    id: 'mmi-performance-enhancing-drugs', format: 'mmi', title: 'Performance-enhancing drugs in sport', category: 'Fairness · integrity',
    preparation: 'A talented athlete on your local team tells you they have been using a banned performance-enhancing substance. They say they feel pressured because other competitors are improving quickly and sponsorship opportunities may depend on results. They ask you not to tell anyone, arguing that the substance has not harmed anyone else and that they will stop after the season. The athlete is a close friend and has worked hard for years. You know that disclosure could have serious consequences for their career.',
    questions: ['What issues arise in this situation?', 'How would you respond to your friend?', 'Why does fairness matter in sport?', 'Tell us about a time you had to support someone while also challenging a decision they made.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Safety and integrity', description: 'Recognise fairness, health risks, pressure, rules, and public trust.' },
        { title: 'Supportive challenge', description: 'Respond with empathy while clearly refusing to condone harmful or dishonest conduct.' },
        { title: 'Appropriate support', description: 'Explore the pressures involved and encourage the athlete to seek qualified support and follow fair processes.' },
      ],
      commonWeaknesses: ['Treating loyalty as a reason to ignore misconduct.', 'Focusing only on punishment without understanding the pressures involved.'],
    },
  },
  {
    id: 'mmi-museum-artefact', format: 'mmi', title: 'A museum artefact', category: 'Cultural heritage · ethics',
    preparation: 'A regional museum displays an artefact that was collected from another country during the colonial era. A representative from the artefact’s community of origin asks for it to be returned, arguing that it was taken without meaningful consent and has spiritual significance. Some local residents oppose repatriation because the artefact attracts visitors and has been part of the museum collection for decades. The museum board says it wants to act ethically but is concerned about the financial and cultural impact of losing a major exhibit.',
    questions: ['What should the museum consider?', 'How could it engage respectfully with the community of origin?', 'Why might legal ownership not settle the ethical question?', 'Tell us about a time you had to consider whether something was technically allowed but still ethically questionable.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Context and power', description: 'Recognise cultural significance, historical context, and the power imbalance involved in colonial collection.' },
        { title: 'Genuine partnership', description: 'Support respectful dialogue with the community of origin rather than focusing only on visitor numbers or legal possession.' },
        { title: 'Flexible outcomes', description: 'Consider repatriation, shared stewardship, long-term loans, or other arrangements shaped with the community.' },
      ],
      commonWeaknesses: ['Focusing only on financial value or legal ownership.', 'Treating decades in a museum as proof that the original collection was ethical.'],
    },
  },
  {
    id: 'mmi-greenwashing-work', format: 'mmi', title: 'Greenwashing at work', category: 'Integrity · sustainability',
    preparation: 'You work for a company that is launching an advertising campaign describing its products as “environmentally responsible”. You discover that the company has improved one small part of its packaging but has made no meaningful change to the environmental impact of its manufacturing or transport. Your manager says the campaign is technically accurate because the wording is carefully chosen. You worry that customers will reasonably interpret the campaign as a much broader environmental claim. Raising concerns could affect your relationship with the manager and your opportunities at work.',
    questions: ['What concerns do you have?', 'How would you raise the issue?', 'Why does honest communication matter to consumers?', 'Tell us about a time you had to question an action that was technically permitted but misleading.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Honest communication', description: 'Recognise the difference between selective truth and a fair, understandable environmental claim.' },
        { title: 'Constructive challenge', description: 'Explain the risk, suggest clearer wording, and seek advice or escalation if needed.' },
        { title: 'Trust', description: 'Understand the effects on consumer choice, organisational reputation, and public confidence.' },
      ],
      commonWeaknesses: ['Accepting misleading communication because it may not be explicitly illegal.', 'Raising the concern in an accusatory or unprofessional way.'],
    },
  },
  {
    id: 'mmi-tokenistic-youth-consultation', format: 'mmi', title: 'Tokenistic youth consultation', category: 'Community · participation',
    preparation: 'A local council forms a youth advisory panel to help plan a new recreation precinct. Young people attend meetings, share ideas, and spend time reviewing proposals. Months later, the council announces a final plan that does not reflect any of the panel’s main recommendations. When members ask why, they are thanked for their contribution but are not given an explanation. Some panel members feel they were included only so the council could claim it had consulted young people.',
    questions: ['What makes consultation meaningful rather than tokenistic?', 'How should the council respond to the panel members?', 'Why is feedback important even when recommendations cannot be adopted?', 'Tell us about a time you felt listened to, or not listened to, in a group decision.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Influence and transparency', description: 'Recognise that meaningful participation requires influence, clear expectations, and feedback.' },
        { title: 'Explain decisions', description: 'Support documenting reasons, showing how input shaped the outcome, and explaining why recommendations were not adopted.' },
        { title: 'Respect youth knowledge', description: 'Treat young people as contributors with relevant lived knowledge rather than as a symbolic audience.' },
      ],
      commonWeaknesses: ['Assuming attendance at a meeting alone makes a process inclusive.', 'Defending the council without acknowledging the lack of explanation.'],
    },
  },
  {
    id: 'mmi-street-vendors-cultural-festival', format: 'mmi', title: 'Street vendors at a cultural festival', category: 'Equity · community',
    preparation: 'A community festival has become popular and now attracts large crowds. Established local businesses want the organisers to limit street-vendor permits because they believe temporary stalls take away their customers. Newer vendors, including several migrants and young entrepreneurs, say festivals are one of the few affordable ways to test a business idea and build a customer base. The organising committee must decide how permits will be allocated next year. It wants the festival to remain financially viable while reflecting the diversity of the community.',
    questions: ['What factors should guide the committee’s decision?', 'How could permit allocation be fair and transparent?', 'How can the festival support both established businesses and emerging vendors?', 'Tell us about a time you had to consider how a decision might affect people with less power or fewer opportunities.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Competing interests', description: 'Recognise economic interests, community diversity, and unequal access to opportunity.' },
        { title: 'Transparent criteria', description: 'Support clear permit criteria rather than informal preference or arbitrary exclusion.' },
        { title: 'Practical options', description: 'Consider capped permits, rotating stalls, reduced-fee places, or different vendor zones.' },
      ],
      commonWeaknesses: ['Framing the issue as a simple choice between protecting established businesses and supporting inclusion.', 'Ignoring the barriers faced by emerging vendors.'],
    },
  },
  {
    id: 'mmi-loyalty-app-customer-data', format: 'mmi', title: 'A loyalty app and customer data', category: 'Privacy · fairness',
    preparation: 'A local business introduces a loyalty app offering discounts in exchange for customers’ names, purchase histories, locations, and email addresses. The terms and conditions say data may be shared with “selected partners”, but the wording is long and difficult to understand. The owner says customers can choose not to sign up, so there is no privacy issue. A staff member points out that customers who do not use the app will pay more than those who do, and many may not realise how their information could be used.',
    questions: ['What are the ethical concerns?', 'What would informed and fair consent look like?', 'Is opting out meaningful if it comes with a financial disadvantage?', 'Tell us about a time you considered what you were giving up in exchange for convenience or a benefit.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Privacy and power', description: 'Recognise privacy, transparency, financial disadvantage, and the power imbalance between the business and customers.' },
        { title: 'Meaningful consent', description: 'Support plain-language explanations, genuine opt-out options, and data minimisation.' },
        { title: 'Balanced judgement', description: 'Consider benefits of loyalty programs without assuming that collecting all available data is justified.' },
      ],
      commonWeaknesses: ['Saying customers are solely responsible for reading every term.', 'Treating lengthy terms and conditions as proof of informed consent.'],
    },
  },
  {
    id: 'mmi-mutual-aid-proof-of-need', format: 'mmi', title: 'Mutual aid and proof of need', category: 'Dignity · fairness',
    preparation: 'A neighbourhood mutual-aid group provides small emergency grants to residents for food, transport, or utility bills. Demand has increased, and some volunteers want applicants to provide detailed proof of hardship before receiving support. They argue this will prevent misuse of limited funds. Other volunteers worry that requiring documents will shame people, delay urgent help, and exclude those with unstable housing or limited access to paperwork. The group has limited money and wants a process that is fair, respectful, and sustainable.',
    questions: ['How should the group approach this issue?', 'What are the benefits and risks of requiring proof?', 'How could the group balance trust with accountability?', 'Tell us about a time you had to design or follow a process that needed to be both fair and compassionate.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Dignity and accountability', description: 'Recognise that preventing misuse and treating applicants with dignity can both matter.' },
        { title: 'Proportionate checks', description: 'Consider lighter or different checks for urgent needs and more review for larger or repeated requests.' },
        { title: 'Respectful process', description: 'Avoid language and procedures that treat people in hardship as inherently suspicious.' },
      ],
      commonWeaknesses: ['Assuming unrestricted trust or strict evidence requirements are the only options.', 'Ignoring how paperwork requirements can exclude people.'],
    },
  },
  {
    id: 'mmi-dividing-family-inheritance', format: 'mmi', title: 'Dividing a family inheritance', category: 'Fairness · relationships',
    preparation: 'After a grandparent dies, three adult grandchildren inherit a modest sum of money. The will divides it equally. However, one grandchild had provided most of the unpaid care during the grandparent’s final years, often missing work and paying some costs themselves. Another grandchild argues that the will should be followed exactly because changing the distribution will create resentment. The family asks you to help facilitate a discussion. Everyone agrees that the caregiver made significant sacrifices, but they disagree about whether care should be recognised financially.',
    questions: ['What values are in tension here?', 'How would you facilitate a respectful conversation?', 'Is equal treatment always the same as fair treatment?', 'Tell us about a time you had to consider fairness in a situation where people contributed in different ways.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Competing values', description: 'Recognise both the importance of respecting the will and the significance of unpaid care and sacrifice.' },
        { title: 'Non-directive facilitation', description: 'Help family members express concerns and explore options without imposing a solution.' },
        { title: 'Sensitivity', description: 'Understand that equality and equity may lead to different outcomes and that grief and relationships matter.' },
      ],
      commonWeaknesses: ['Declaring one outcome objectively correct without acknowledging the family’s values.', 'Treating unpaid care as irrelevant because it was not formally contracted.'],
    },
  },
  {
    id: 'mmi-aboriginal-cardiac-rehabilitation', format: 'mmi', title: 'Aboriginal and Torres Strait Islander health: cardiac rehabilitation', category: 'Cultural safety · co-design',
    preparation: 'A regional hospital notices that Aboriginal and Torres Strait Islander patients are less likely than other patients to attend its cardiac-rehabilitation program after leaving hospital. Hospital executives propose a new outreach program, including standard information booklets and fixed weekly appointments at the hospital. The local Aboriginal Community Controlled Health Organisation says it was not involved in planning. Its staff explain that transport, family and cultural responsibilities, previous experiences of racism, and the program’s inflexible format may all affect attendance. A hospital executive replies that the data is already clear and that further consultation will delay a program patients need now.',
    questions: ['What concerns arise in this situation?', 'How should the hospital develop the program?', 'What does culturally safe care mean in this context?', 'Tell us about a time you learned that a solution needed to be shaped by the people it was intended to support.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Avoid assumptions', description: 'Recognise that lower attendance should not be simplistically attributed to patient behaviour.' },
        { title: 'Genuine co-design', description: 'Respect Aboriginal and Torres Strait Islander leadership, local knowledge, and community-controlled health expertise.' },
        { title: 'Flexible care', description: 'Consider transport, family and cultural responsibilities, racism, trust, flexibility, and continuity of care.' },
      ],
      commonWeaknesses: ['Proposing a program for the community rather than with the community.', 'Assuming all Aboriginal and Torres Strait Islander communities have the same needs.'],
    },
  },
  {
    id: 'mmi-abortion-conscientious-objection', format: 'mmi', title: 'Abortion and conscientious objection', category: 'Autonomy · professional duties',
    preparation: 'A patient visits a rural general practice requesting information about abortion. They explain that they have limited privacy at home, cannot easily travel, and are worried about delay. The GP has a personal conscientious objection to abortion and feels unable to directly provide the service. The receptionist suggests that the patient book another appointment in several weeks, when a different clinician may be available. The patient becomes upset and says they need clear information now, not judgement. You are observing as a medical student.',
    questions: ['What are the key issues in this consultation?', 'How can the GP respect their own beliefs while still caring appropriately for the patient?', 'Why is timely, non-judgemental information important?', 'Tell us about a time you had to support someone’s right to make a decision that differed from your own beliefs.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Patient-centred care', description: 'Respect the patient’s autonomy, privacy, dignity, and need for timely care.' },
        { title: 'No abandonment', description: 'Recognise that personal beliefs should not result in judgement, unnecessary delay, or abandonment.' },
        { title: 'Practical pathway', description: 'Support accurate information and an appropriate referral or local pathway, seeking reliable guidance where legal or service requirements vary.' },
      ],
      commonWeaknesses: ['Turning the station into a debate about abortion rather than professional care.', 'Accepting delay as the only response to conscientious objection.'],
    },
  },
  {
    id: 'mmi-gender-affirming-care-adolescent', format: 'mmi', title: 'Gender-affirming care for an adolescent', category: 'Identity · confidentiality',
    preparation: 'A 16-year-old patient attends a clinic asking for support regarding gender dysphoria. They say that being misgendered at school and home has affected their mood and confidence. One parent is supportive, while the other says the patient is “too young to know” and refuses to discuss gender-affirming care. During the consultation, a staff member repeatedly uses the patient’s former name despite being corrected. The patient asks to speak privately with the clinician and says they are worried that information will be shared at home without their involvement.',
    questions: ['What are the priorities in this consultation?', 'How should the healthcare team communicate with the patient and family?', 'What would appropriate care look like for a student observing this consultation?', 'Tell us about a time you helped someone feel respected or included when others had not.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Respect and dignity', description: 'Use the patient’s name and pronouns and respect their identity, privacy, and wellbeing.' },
        { title: 'Listen directly', description: 'Ensure the young person is heard rather than spoken about or dismissed because of family disagreement.' },
        { title: 'Careful support', description: 'Take a calm, non-political approach focused on appropriate assessment, support, referral, confidentiality, capacity, and safety with senior guidance.' },
      ],
      commonWeaknesses: ['Allowing family disagreement to silence the young person.', 'Treating respectful communication as a political statement rather than part of safe care.'],
    },
  },
  {
    id: 'mmi-supervised-injecting-facility', format: 'mmi', title: 'A supervised injecting facility', category: 'Harm minimisation · public health',
    preparation: 'A state government is considering a supervised injecting facility in an area with a high number of overdose deaths. Supporters argue that the service could prevent deaths, connect people to treatment, and reduce public injecting. Opponents, including nearby business owners and some parents, worry that the service will make the area less safe and attract more drug use. A public consultation is planned. People with lived experience of drug use say they often feel excluded from discussions about services that directly affect them.',
    questions: ['What perspectives should be considered?', 'How should the government make a decision about the proposed service?', 'What does a harm-minimisation approach involve?', 'Tell us about a time you had to consider a response that reduced harm even when it did not solve the whole problem.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Multiple perspectives', description: 'Recognise that overdose prevention, stigma, public safety, and community concerns can coexist.' },
        { title: 'Evidence and lived experience', description: 'Use evidence and local data while including people with lived experience in the consultation.' },
        { title: 'Reduce preventable harm', description: 'Understand that harm minimisation reduces risk and connects people with support without endorsing drug use.' },
      ],
      commonWeaknesses: ['Reducing the issue to punishment or unrestricted tolerance.', 'Excluding people with lived experience from decisions about services they use.'],
    },
  },
  {
    id: 'mmi-substance-use-pregnancy', format: 'mmi', title: 'Substance use during pregnancy', category: 'Stigma · safeguarding',
    preparation: 'A maternity service proposes routine toxicology testing for all pregnant patients at their first appointment. Supporters argue that it could identify substance use early and allow staff to offer support. Critics worry that testing without clear consent may discourage people from seeking antenatal care, particularly if they fear judgement, discrimination, or involvement from child-protection services. A midwife says that some patients have previously withheld information because they felt blamed rather than supported. The hospital wants a policy that protects both pregnant people and babies.',
    questions: ['What are the ethical concerns with this proposal?', 'How can healthcare workers discuss substance use safely and respectfully?', 'What should a supportive response include?', 'Tell us about a time you saw judgement or stigma make it harder for someone to seek help.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Consent and trust', description: 'Recognise informed consent, privacy, stigma, trust, and unintended consequences of testing.' },
        { title: 'Non-punitive care', description: 'Use non-judgemental, trauma-informed communication and focus on voluntary disclosure and practical support.' },
        { title: 'Proportionate safeguarding', description: 'Consider appropriate safeguarding while recognising that universal policies can affect groups differently and may drive people away from care.' },
      ],
      commonWeaknesses: ['Treating testing as automatically beneficial.', 'Ignoring the possibility that fear of consequences may reduce engagement with antenatal care.'],
    },
  },
  {
    id: 'mmi-embryo-testing-disability', format: 'mmi', title: 'Embryo testing and disability', category: 'Reproductive ethics · disability',
    preparation: 'A couple undergoing IVF learns that some embryos carry a genetic variant associated with a disability. They ask the fertility clinic to transfer only embryos without the variant. A clinician says this is a reproductive choice for the parents. Another staff member says the conversation should include the perspectives of people living with disability, who may feel that such decisions imply their lives are less valuable. The couple feels judged and says they simply want to reduce uncertainty for their future child. They ask for clear information without being pressured towards a particular decision.',
    questions: ['What ethical issues should the clinic consider?', 'How can clinicians provide balanced, non-directive counselling?', 'Why might disability perspectives be important in this discussion?', 'Tell us about a time you had to make space for perspectives that challenged your initial assumptions.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Autonomy and disability rights', description: 'Respect reproductive autonomy while recognising disability rights and the social meaning of selection decisions.' },
        { title: 'Non-directive counselling', description: 'Provide accurate, balanced information without pressuring the couple towards a particular decision.' },
        { title: 'Avoid assumptions', description: 'Do not infer quality of life from a diagnosis alone and acknowledge the personal and ethical complexity.' },
      ],
      commonWeaknesses: ['Presenting parental choice or disability advocacy as the only relevant consideration.', 'Making assumptions about the value or quality of a life with disability.'],
    },
  },
  {
    id: 'mmi-vaccination-healthcare-workers', format: 'mmi', title: 'Vaccination requirements for healthcare workers', category: 'Public health · autonomy',
    preparation: 'After a preventable infectious-disease outbreak, a hospital proposes that staff working with highly vulnerable patients must meet vaccination requirements or be redeployed where possible. Some staff support the policy, arguing they have a duty to protect patients. Others object on personal, religious, or medical grounds and say the policy unfairly restricts their employment. The hospital wants a policy that is safe, evidence-based, and respectful. Staff representatives request consultation before the policy is introduced.',
    questions: ['What values are in tension here?', 'What should a fair policy consider?', 'How should the hospital communicate with staff who disagree?', 'Tell us about a time you had to balance individual preference with responsibility to a wider group.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Balance and proportionality', description: 'Recognise patient safety, staff autonomy, proportionality, equity, and the responsibilities of roles involving vulnerable people.' },
        { title: 'Fair implementation', description: 'Support evidence-based policy, clear communication, consultation, and reasonable accommodation where appropriate.' },
        { title: 'Respectful disagreement', description: 'Engage with concerns rather than dismissing them, while keeping patient safety central.' },
      ],
      commonWeaknesses: ['Treating individual autonomy or patient safety as absolute without considering balance and implementation.', 'Assuming disagreement means staff concerns can be ignored.'],
    },
  },
  {
    id: 'mmi-healthcare-for-people-in-prison', format: 'mmi', title: 'Healthcare for people in prison', category: 'Equity · advocacy',
    preparation: 'A person in remand custody develops persistent symptoms that may require specialist assessment. Their appointment is delayed several times because transport and security arrangements are difficult to organise. The person says that staff speak about them only as a prisoner, not as a patient, and that they are worried their condition is worsening. A correctional officer says security must come first and that medical appointments cannot always be prioritised. The healthcare team is concerned about the delay but has limited control over prison logistics.',
    questions: ['What concerns arise in this scenario?', 'What responsibilities do healthcare professionals have?', 'How could the healthcare team advocate appropriately?', 'Tell us about a time you saw a person reduced to a label rather than treated as an individual.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Dignity and equity', description: 'Recognise that people in custody retain dignity and healthcare needs.' },
        { title: 'Coordinate safely', description: 'Respect security considerations without allowing them to erase clinical responsibility or timely assessment.' },
        { title: 'Advocacy', description: 'Support documentation, escalation, coordination, and appropriate advocacy with relevant services.' },
      ],
      commonWeaknesses: ['Implying that imprisonment makes a person less deserving of timely healthcare.', 'Treating security and healthcare as impossible to coordinate.'],
    },
  },
  {
    id: 'mmi-donor-conception-identity-information', format: 'mmi', title: 'Donor conception and access to identity information', category: 'Identity · confidentiality',
    preparation: 'A young adult conceived through donor conception contacts a fertility clinic seeking information about their donor. Their parents had been told at the time that the donation was anonymous. The donor also believed they would never be contacted. The young adult says they are not trying to disrupt anyone’s life but want to understand their biological history and sense of identity. The clinic is unsure what information can be released and how to support everyone involved. The donor has since started a family and is worried about the implications.',
    questions: ['What perspectives and needs should be considered?', 'Why can information about biological origins matter to donor-conceived people?', 'How should the clinic communicate with those involved?', 'Tell us about a time you had to consider how information can shape someone’s identity or relationships.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Multiple interests', description: 'Recognise the donor-conceived person’s interests, the donor’s expectations, and family relationships.' },
        { title: 'Sensitive communication', description: 'Communicate respectfully and without judgement while protecting sensitive information.' },
        { title: 'Specialist guidance', description: 'Acknowledge that laws and records policies vary and require careful, specialist guidance.' },
      ],
      commonWeaknesses: ['Treating donor information as belonging only to the donor or only to the parents.', 'Ignoring the identity and support needs of the donor-conceived person.'],
    },
  },
  {
    id: 'mmi-organ-donation-after-death', format: 'mmi', title: 'Organ donation after death', category: 'Consent · bereavement',
    preparation: 'A patient who has died was registered as an organ donor. Their family is distressed and says they do not want donation to proceed because they are unsure whether the patient fully understood the decision. One family member says the patient had often spoken positively about helping others, while another believes the family should make the final decision. The donation team needs to speak with the family compassionately while also respecting the patient’s recorded wishes. Tension is growing between family members, and the discussion is occurring soon after the death.',
    questions: ['What are the key ethical and communication issues?', 'How should the donation team approach the family?', 'Why is it important to discuss organ donation sensitively?', 'Tell us about a time you had to support people who were making decisions while distressed.'],
    examinerFeedback: {
      strongResponse: [
        { title: 'Respect and compassion', description: 'Respect the deceased person’s wishes while acknowledging family grief and the sensitivity of timing.' },
        { title: 'Unhurried communication', description: 'Use a compassionate approach that avoids pressure, explains the process clearly, and allows questions.' },
        { title: 'Careful process', description: 'Recognise that legal processes and practice requirements vary and that family members may need support.' },
      ],
      commonWeaknesses: ['Treating the discussion as a simple administrative task.', 'Pressuring the family or ignoring the emotional context of recent bereavement.'],
    },
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
    questions: ['Tell us about a setback that mattered to you.', 'Think of a meaningful setback you experienced. How did you respond in the moment?', 'Looking back on a meaningful setback you experienced, what would you now do differently?', 'Tell us about a time you needed support after a setback. What did you learn about asking for help?', 'How has a failure or disappointment changed the way you work?', 'Tell me about a time where you have coped with a high stress situation and how you got through it.'],
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
  ...REVIEWED_MMI_STATIONS_2026_09,
  ...ROLEPLAY_STATIONS,
]

export function getInterviewStation(format: InterviewFormat, id: string | undefined): InterviewStation | null {
  return INTERVIEW_STATIONS.find((station) => station.format === format && station.id === id)
    ?? INTERVIEW_STATIONS.find((station) => station.format === format)
    ?? null
}
