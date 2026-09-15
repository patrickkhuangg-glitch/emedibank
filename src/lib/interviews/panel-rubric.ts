export const PANEL_RUBRIC_VERSION='emeducate-panel-v1.1' as const
export const PANEL_FEEDBACK_VERSION='whole-panel-feedback-v1' as const
export const WHOLE_PANEL_DOMAINS={
  "communication_relevance": {
    "label": "Communication, Relevance & Organisation",
    "anchors": {
      "1": "Available answers largely fail to convey a usable response to the questions, through fundamental irrelevance or unintelligible organisation.",
      "2": "Some relevant meaning is present, but major disorganisation or repeated failure to answer leaves the panel without essential information.",
      "3": "Main points are discernible, but material omissions, ambiguity or tangents weaken task fulfilment.",
      "4": "Generally answers the questions understandably, with basic structure; priorities or explanations remain uneven.",
      "5": "Answers directly enough to be clear, uses relevant detail and organises explanations so the panel can follow the account.",
      "6": "Sustains clear, economical explanations across the available complexity, selecting detail well and repairing unclear wording when needed.",
      "7": "Communicates exceptionally precisely and purposefully across the interview's tasks, making complex points easy to follow without sacrificing substance."
    },
    "boundaries": "An answer can be direct without stating its conclusion in the first sentence. Do not score accent, written polish or inferred vocal confidence.\n\nRelevant examples and explanations can strengthen communication, but do not reward a visible formula when it adds irrelevant material. A concise answer may be strong when it fully performs the task.\n\nAssess the pattern across the continuous conversation, including topic changes and questions from different panellists. Do not convert a general impression of rapport, charisma or familiarity into a communication score."
  },
  "motivation_medicine": {
    "label": "Motivation & Understanding of Medicine",
    "anchors": {
      "1": "Does not meaningfully answer the motivation task, or relies on a fundamental misconception about medical work that defeats the explanation.",
      "2": "Gives broad attraction or aspiration with little understanding of the work, training or responsibilities involved.",
      "3": "Offers relevant reasons but the explanation remains materially generic, idealised or poorly connected to medicine.",
      "4": "Gives plausible reasons and a basic realistic account of medical work or training, with limited personal development.",
      "5": "Connects specific interests, experiences or considered learning to relevant medical responsibilities, acknowledging meaningful demands.",
      "6": "Explains how understanding developed, engages with a relevant tension or limitation and gives a considered account of why the work remains attractive.",
      "7": "Integrates well-supported motivation, realistic understanding and thoughtful uncertainty into a particularly clear account that holds up under relevant exploration."
    },
    "boundaries": "Do not demand clinical placements, lifelong certainty, a chosen specialty, sacrifice narratives or rejection of every other profession. Reading, conversations, caring and non-clinical work can inform understanding."
  },
  "intellectual_curiosity": {
    "label": "Intellectual Curiosity & Learning Approach",
    "anchors": {
      "1": "Does not meaningfully engage with the elicited idea, problem or learning task, or gives a response whose central reasoning cannot be followed.",
      "2": "Shows minimal engagement beyond assertion or recall, with major gaps in how they approach the problem or learning need.",
      "3": "Identifies a relevant idea or strategy but gives limited reasoning, exploration or adaptation.",
      "4": "Explains a workable approach to the idea, problem or learning task, with basic supporting reasoning.",
      "5": "Explores relevant reasoning, seeks or uses information and explains how their learning approach fits the task.",
      "6": "Engages thoughtfully with complexity or uncertainty, compares plausible approaches and adapts how they would learn or solve the problem.",
      "7": "Integrates evidence, curiosity and an adaptable learning process with exceptional clarity, testing assumptions and identifying how understanding could develop further."
    },
    "boundaries": "This is not a proxy for grades, intelligence, vocabulary or prior access to enrichment. Enthusiasm for an interesting topic is supportive only when the answer also shows relevant engagement. Do not double-count the same reasoning in this domain and Reasoning & Professional Judgement unless it performs distinct intellectual and professional functions.\n\nIn a source-based presentation, this domain may capture how the candidate selects, connects and questions ideas from the supplied material. It does not reward recall volume or prior knowledge that the task did not require."
  },
  "personal_evidence": {
    "label": "Personal Evidence & Ownership",
    "anchors": {
      "1": "Provides no usable example when explicitly asked, or gives an account from which no relevant own action can be established.",
      "2": "Names experiences or achievements but gives little detail about their own role or what happened.",
      "3": "Identifies a relevant experience and some action, but a material gap in responsibility, sequence or outcome limits what it demonstrates.",
      "4": "Describes a concrete situation and own contribution with a relevant result or current status; detail is adequate but limited.",
      "5": "Gives specific actions, clear boundaries of responsibility and a supported account of outcomes, distinguishing others' contributions where relevant.",
      "6": "Explains consequential choices within the example and qualifies attribution or outcomes appropriately; details remain coherent under available follow-ups.",
      "7": "Provides exceptionally precise and relevant evidence of contribution, decisions and limits, with an account that supports rather than overstates the claimed competency."
    },
    "boundaries": "Specificity is not proof that a personal story is true. A negative or unfinished outcome does not itself lower this score. Reusing an example can be effective when it answers a different question with relevant new detail."
  },
  "reflection_learning": {
    "label": "Insight, Reflection & Learning",
    "anchors": {
      "1": "Offers no meaningful reflection despite an explicit, observable opportunity, or wholly rejects examining their role in the stated difficulty.",
      "2": "Describes events or a generic lesson with almost no examination of own contribution or assumptions.",
      "3": "Identifies a lesson or limitation but leaves its significance or implications for behaviour unclear.",
      "4": "Identifies own contribution and relevant learning, with a basic acknowledgement of what could improve.",
      "5": "Connects an action or assumption to its consequences and explains a specific change in behaviour.",
      "6": "Examines a plausible alternative interpretation or limitation, explaining how learning would be applied and checked.",
      "7": "Integrates precise self-examination, uncertainty and transferable learning, with a credible way to revise the approach as experience develops."
    },
    "boundaries": "Past implementation is not required when learning is recent. Do not equate self-criticism, emotional disclosure or a dramatic failure with deeper insight.\n\nThe questions “what happened?”, “why does it matter?” and “what follows?” are useful assessor tests, not wording the candidate must use. A detailed event without meaning or future implication does not by itself establish strong reflection."
  },
  "reasoning_judgement": {
    "label": "Reasoning & Professional Judgement",
    "anchors": {
      "1": "Fails to engage with the central reasoning task or explicitly endorses action fundamentally inconsistent with a central duty in the scenario.",
      "2": "Identifies part of the issue but leaves major reasoning gaps or proposes poorly justified action outside the relevant role.",
      "3": "Gives a partly relevant position but misses a material alternative, assumption, responsibility or practical consequence.",
      "4": "Reaches a broadly defensible position with basic supporting reasons and awareness of relevant limits.",
      "5": "Weighs the main considerations and explains a proportionate decision or next step within role.",
      "6": "Justifies priorities under uncertainty and gives a feasible plan, including appropriate consultation or contingencies where relevant.",
      "7": "Integrates the decisive evidence, competing considerations and role limits with exceptional precision, explaining the chosen action and relevant conditions for revision."
    },
    "boundaries": "For non-ethical reasoning questions, assess the relevant evidence and logic without inventing an ethical duty. Recognition of role limits, candid acknowledgement of uncertainty or mistakes, and an appropriate next step can support professional judgement. Do not infer general honesty from demeanour or accept self-description as proof of integrity. A clear conditional plan can be strong. Do not reward “both sides” mechanically or impose a preferred moral conclusion."
  },
  "responsiveness_consistency": {
    "label": "Responsiveness, Adaptability & Consistency",
    "anchors": {
      "1": "Fails to engage with substantive follow-ups or maintains a fundamental incompatibility after a clear opportunity to address it.",
      "2": "Gives minimal or largely unrelated responses to clarification or challenge; major gaps between claims remain unexplained.",
      "3": "Responds partly to follow-ups but repeats prepared content, overlooks material new information or leaves a significant relevant inconsistency unresolved.",
      "4": "Answers follow-ups and gives a broadly coherent account, though elaboration or justification of a change remains limited.",
      "5": "Uses follow-ups to add relevant detail, clarifies scope and explains revisions or maintains a defensible position with reasons.",
      "6": "Integrates material new information, repairs an earlier weakness and sustains a coherent account across the relevant exchanges.",
      "7": "Handles demanding exploration with exceptional precision: differentiates changed premises from genuine contradictions, explains adaptations and remains responsive without merely agreeing."
    },
    "boundaries": "Assess responses and coherence, not guessed composure. If there are no follow-ups, comparable claims or other relevant opportunities, leave this domain unscored or non-applicable as appropriate. Do not require a mistake to enable a high score.\n\nQuestions from different panellists remain part of the same evidence stream. Credit relevant references to earlier discussion and adaptation to a new probe; do not expect the candidate to restart or repeat a complete prepared answer for each interviewer."
  },
  "empathy": {
    "label": "Empathy & Interpersonal Understanding",
    "anchors": {
      "1": "Explicitly dismisses or demeans the person's central concern, defeating the interpersonal task.",
      "2": "Gives advice or reassurance with little recognition of the person's stated perspective.",
      "3": "Acknowledges a concern superficially but overlooks its material implications for the response.",
      "4": "Recognises the person's perspective and offers broadly respectful, though general, support.",
      "5": "Explores the specific concern and connects a respectful action or proposed approach to it.",
      "6": "Checks understanding and adjusts support to the person's priorities or relevant new information.",
      "7": "Integrates the person's perspective and the task's competing needs into exceptionally specific, respectful and responsive support."
    },
    "boundaries": "A hypothetical question allows a proposed approach; enacted role-play requires actual interaction. Do not infer warmth from prose or require the other person to agree or stop being distressed."
  },
  "teamwork": {
    "label": "Teamwork & Collaboration",
    "anchors": {
      "1": "Provides no meaningful engagement with the collaboration task, or explicitly undermines essential participation or shared responsibility.",
      "2": "Describes membership or authority with little evidence of useful coordination or collaboration.",
      "3": "Shows a contribution but leaves a material issue in listening, role allocation or conflict handling unresolved.",
      "4": "Describes a clear role and basic cooperation in pursuit of a shared task.",
      "5": "Explains specific coordination, inclusion and shared problem-solving, identifying both own and others' contributions.",
      "6": "Handles disagreement or changing constraints constructively, adapting roles and checking shared progress.",
      "7": "Integrates participation, accountability and task progress exceptionally well through the available complexity, with proportionate and well-justified adaptation."
    },
    "boundaries": "Leadership need not mean a title or taking charge. Sharing credit and seeking assistance may show good collaboration. Team success alone does not establish the candidate's contribution."
  },
  "resilience": {
    "label": "Resilience & Sustainable Practice",
    "anchors": {
      "1": "Does not engage with the coping task or explicitly rejects material limits and support while endorsing a fundamentally unsustainable approach.",
      "2": "Relies mainly on endurance or reassurance without a workable response to the stated pressure.",
      "3": "Names a strategy but leaves a material issue in feasibility, recognising limits or seeking support unexplained.",
      "4": "Identifies realistic coping and support options with basic awareness of limits.",
      "5": "Connects particular pressures or warning signs to feasible action and appropriate support.",
      "6": "Explains how to monitor whether coping is sufficient, adjust demands or support and learn from the setback.",
      "7": "Integrates limits, support, contextual pressures and responsibilities into an exceptionally clear and adaptable approach to sustainable performance."
    },
    "boundaries": "Help-seeking, a health condition, a privacy boundary or an imperfect recovery is not proof of low resilience. Do not assess this domain from how the candidate appears to handle the interview."
  },
  "community_cultural_respect": {
    "label": "Community Responsibility & Cultural Respect",
    "anchors": {
      "1": "Explicitly endorses demeaning assumptions or exclusion central to the task, or does not engage with the stated community issue.",
      "2": "Relies on generic benevolence or group assumptions with little attention to needs, preferences or participation.",
      "3": "Identifies a relevant need but overlooks a material barrier, assumption or affected person's perspective.",
      "4": "Recognises relevant needs and proposes a broadly respectful, feasible approach with basic participation.",
      "5": "Connects specific barriers or strengths to an approach shaped by the people affected, checking assumptions where relevant.",
      "6": "Weighs structural constraints, power or access and explains meaningful partnership with a way to assess usefulness.",
      "7": "Integrates community priorities, strengths, equitable participation and practical limits into an exceptionally well-justified approach with credible accountability."
    },
    "boundaries": "Interpret the anchor through the exact question. Rural access, Aboriginal and Torres Strait Islander health, advocacy and cultural respect are not interchangeable topics or a universal checklist. Do not infer lived experience or beliefs from identity."
  },
  "programme_alignment": {
    "label": "Programme Understanding & Informed Alignment",
    "anchors": {
      "1": "Does not engage with the programme question or relies on a verified fundamental misunderstanding that defeats the explanation.",
      "2": "Names the institution or broad reputation without a meaningful account of the relevant course or mission.",
      "3": "Gives some relevant information but makes a weak connection to their learning needs, interests or the question asked.",
      "4": "Identifies a relevant accurate feature and a plausible reason it matters to them.",
      "5": "Connects specific, accurate features to considered interests or learning needs, with a realistic explanation of the connection.",
      "6": "Explores a meaningful implication, trade-off or challenge of the programme and explains how they would engage with it.",
      "7": "Gives an exceptionally informed, coherent account of the programme's relevant opportunities and demands, connecting them to thoughtful interests and acknowledging uncertainty without overpromising."
    },
    "boundaries": "Use current official sources for material factual corrections. Do not score flattery, trivia, presumed social fit or a promise of lifelong service. Honest uncertainty about a future specialty or location is compatible with strong alignment.\n\nWhen institutional values are elicited, stronger evidence explains their practical meaning and connects them to considered interests, actions or learning needs. Repeating a value statement or asserting that the candidate “shares the values” is not enough for a high score.\n\nWhen an assessed closing question is available, a researched and genuinely relevant question may support this domain if it connects to the programme's learning, opportunities or demands. A question answerable by basic public information does not demonstrate informed alignment merely because it names the institution."
  }
} as const
export type PanelDomainKey=keyof typeof WHOLE_PANEL_DOMAINS
export const PANEL_BANDS=['Very poor','Weak','Below expected','Satisfactory','Good','Strong','Outstanding'] as const
