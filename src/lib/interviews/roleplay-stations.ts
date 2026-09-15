import 'server-only'
import type { InterviewStation } from './stations'

export const ROLEPLAY_STATIONS: InterviewStation[] = [
  {
    id: 'mmi-roleplay-rural-outreach', format: 'mmi', responseMode: 'roleplay_reflection',
    title: 'Rural medical outreach conversation', category: 'Rural health · realistic encouragement',
    preparation: 'You are a medical student volunteering at a careers event in a rural high school. Taylor, a senior student, asks to speak with you privately. They are interested in medicine but believe medical school is mainly for students from metropolitan private schools. Taylor is also worried about leaving family, paying for accommodation, and returning to a small town where everyone would know them as “the doctor”.\n\nYou do not know the details of every university program or scholarship and should not promise admission or financial support. Your role is to explore Taylor’s concerns, offer realistic encouragement, and help them identify reliable next steps while respecting that medicine may or may not be the right choice for them.',
    questions: ['Speak with Taylor about their concerns.', 'How well did you balance encouragement with honesty about the barriers Taylor raised? What assumptions about rural students or rural practice did you consciously avoid?'],
    rolePlayerInstructions: 'Begin with: “People like me do not really get into medicine, do they?” If the candidate gives a motivational speech without asking questions, remain doubtful. If they explore your interests and concerns, explain that you enjoy science and helping at a local aged-care service but have never met a medical student from your area. Respond positively to realistic suggestions such as speaking with admissions teams, rural pathway representatives, teachers, current students, or scholarship services.',
    examinerFeedback: {
      strongResponse: [
        { title: 'Exploration', description: 'Asks what attracts Taylor to medicine and which barriers matter most.' },
        { title: 'Realistic encouragement', description: 'Challenges limiting assumptions without pretending the pathway is easy or guaranteed.' },
        { title: 'Rural understanding', description: 'Recognises financial, family, relocation, belonging, and future professional-boundary concerns.' },
        { title: 'Practical support', description: 'Directs Taylor towards reliable information and appropriate people rather than inventing program details.' },
        { title: 'Reflection', description: 'Identifies both the value and risk of their own assumptions. Evaluates how their wording supported Taylor’s control of the decision, without claiming an outcome that was not observed.' },
      ],
      commonWeaknesses: ['Romanticising rural practice.', 'Speaking as though rural applicants are disadvantaged in identical ways.', 'Guaranteeing entry or support.', 'Pressuring Taylor to pursue medicine.'],
    },
  },
  {
    id: 'mmi-roleplay-borrowed-camera', format: 'mmi', responseMode: 'roleplay_reflection',
    title: 'Disclose damage to borrowed equipment', category: 'Integrity · accountability and repair',
    preparation: 'You borrowed an expensive camera from your friend Morgan for a weekend event. Although you followed the instructions provided, the camera fell when the strap came loose and the lens was damaged. You delayed telling Morgan because you hoped the damage might be minor, but a repair shop has confirmed that the lens will need professional repair.\n\nMorgan needs the camera for paid work next week. You cannot afford the full replacement cost immediately, but you are willing to contribute, contact your insurer if relevant, and help arrange an urgent repair or temporary replacement. Morgan is about to meet you and does not yet know what happened.',
    questions: ['Tell Morgan what happened and discuss the next steps.', 'How effectively did you take responsibility without becoming defensive or making commitments you could not keep? What effect did delaying the conversation have, and how would you handle that aspect differently?'],
    rolePlayerInstructions: 'Begin warmly, expecting the camera to be returned. When told about the damage, become upset and say: “Why did you wait to tell me when you know I need it for work?” If the candidate is honest, apologises, recognises the practical impact, and offers realistic options, engage in problem-solving. If they focus on the faulty strap or minimise the damage, remain frustrated.',
    examinerFeedback: {
      strongResponse: [
        { title: 'Honesty', description: 'Discloses the damage clearly without hiding important details.' },
        { title: 'Responsibility', description: 'Acknowledges both the damage and the delay, even if the strap contributed.' },
        { title: 'Impact awareness', description: 'Recognises the potential emotional impact on Morgan and the effect on paid work.' },
        { title: 'Repair', description: 'Offers realistic options, avoids promises they cannot meet, and invites Morgan to help decide next steps.' },
        { title: 'Reflection', description: 'Examines avoidance, accountability, and how earlier disclosure could have reduced practical harm.' },
      ],
      commonWeaknesses: ['Leading with excuses or minimising the loss.', 'Making the conversation about the candidate’s guilt.', 'Offering an unrealistic promise.', 'Expecting immediate forgiveness.'],
    },
  },
]
