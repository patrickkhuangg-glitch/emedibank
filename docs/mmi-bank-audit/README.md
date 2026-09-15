# MMI station bank audit and import

Reviewed 9 September 2026. **132 revised stations imported and published; 24 held for revision.** The MMI bank increases from 74 to 206 stations. Each new station has four questions, a scenario-specific preparation guide, and a primary theme plus a narrower topic.

## Editorial decision

The bank was useful source material but was not ready to import unchanged. All 156 scenario briefs, question sets and supplied guides were reviewed for clarity, role boundaries, discussion depth, repetition, accessibility and suitability for evidence-based marking. No applicant responses were supplied or scored. This is an editorial review, not a clinician’s validation, a psychometric study or evidence that the stations predict interview performance.

The source reused eight question templates and only six distinct versions of each general guide field. Several questions inserted the station title into an awkward sentence, and many personal-reflection questions expected a closely analogous clinical experience. Some technical cases needed knowledge or legal assumptions the brief did not supply.

Accepted stations now have a direct opening question, a tailored practical-response question, a follow-up exploring a consequence or competing principle, and an accessible reflection prompt. Students may draw on ordinary study, work, volunteering or relationship experiences. Each guide retains the original core considerations but adds specific practical advice and a scenario-specific weakness to watch for. Technical terms were explained where a short definition made the station accessible. Clinical and research briefs clarify the applicant’s role; they do not ask applicants to diagnose, prescribe or quote law.

Not every overlap is a duplicate: recurring ethical concepts are useful when the setting, constraint or decision differs. The held list removes the closest repeats and the scenarios needing substantive subject-matter revision.

## Categories for the additions

| Primary theme | Added stations |
| --- | ---: |
| Communication | 10 |
| Community | 5 |
| Confidentiality | 9 |
| Consent | 6 |
| Cultural respect | 3 |
| Dignity | 2 |
| Empathy | 5 |
| Equity | 16 |
| Fairness | 9 |
| Integrity | 4 |
| Leadership | 3 |
| Patient safety | 5 |
| Professionalism | 8 |
| Public health | 15 |
| Research ethics | 11 |
| Sustainability | 9 |
| Teamwork | 4 |
| Technology | 8 |

The primary theme appears in the practice catalogue labels and weekly summary. The secondary topic supplies a more specific label. Existing station categories are unchanged.

## Integration and safeguards

- New content is in `src/lib/interviews/mmi-bank-2026-09.ts`, imported by the existing server-only station bank. IDs use the source batch and original station number and must remain stable after future wording edits.
- Public metadata contains labels and question counts only. Scenarios, questions and guides stay out of that catalogue.
- Existing practice selection, eight-station full MMI mocks, timed question display, recording/transcription and marking paths use the expanded bank without new routes or database tables.
- The original 74 MMI stations, 32 panel themes and 161 panel questions remain byte-for-byte equivalent as structured data. Existing saved links and recordings retain their station IDs.
- The free trial remains the same fixed 15 MMI stations and one question per panel theme. None of these new stations is added to trial access.
- The advertised full-bank count is updated to 206. Full access remains subject to the existing entitlement checks.
- Preparation guides are illustrative. Justified alternatives remain valid. They are not a new scoring checklist and do not replace the versioned MMI rubric, evidence audit or human approval workflow.
- Published on 9 September 2026 after approval. No database migration, environment change or paid marking call was needed.

## Held stations

| Source # | Title | Reason / next edit |
| ---: | --- | --- |
| 11 | Dating a former patient | Requires a clinician-reviewed boundary scenario. A six-month interval does not establish that a relationship with a former patient is appropriate. |
| 20 | Language used in an operating theatre | Closely repeats the existing “Witnessing disrespectful behaviour” station, including comments about a patient who cannot hear the staff. |
| 25 | A request to exclude a student | Closely repeats the existing consent-for-student-learning station; the existing version already tests the student’s response to refusal. |
| 35 | Medicinal cannabis and driving | Needs the type of cannabis product and clearer context. Driving law, impairment and employer policy should not be conflated. |
| 47 | Banning energy drinks at a stadium | Limited additional complexity beyond the accepted sugary-drink sponsorship station (28). A distinct decision or constraint would strengthen it. |
| 53 | Placebo-controlled trial | The placebo-trial scenario needs information about available treatment, risk and safeguards before an applicant can assess the proposal fairly. |
| 56 | Gene-drive mosquitoes | The title describes a gene drive, but the brief only describes genetically modified mosquitoes. These are not interchangeable; explain the technology and its intended spread. |
| 66 | Stem-cell organoids | The brain-organoid scenario needs accessible definitions and a clearer, specialist-reviewed description of the ethical uncertainty. |
| 75 | Editing embryos to prevent disease | Heritable embryo editing needs clearer scientific and regulatory context, with hypothetical permission distinguished from current practice. |
| 81 | A neighbour’s lost drone | Overlaps the existing neighbourhood-CCTV station’s privacy, property and safety conflict. |
| 85 | Digital access to government services | Closely repeats the accepted clinic-portal accessibility problem (19). Add a distinct civic decision before using both. |
| 94 | Digital exclusion in a jury pool | Repeats digital-access barriers in 19 and 85 and relies on unclear jury-summons and fine rules. Supply a coherent hypothetical framework. |
| 98 | Crowdfunding a personal crisis | Duplicates the existing photographing-volunteers and misrepresenting-a-charity-beneficiary scenarios. |
| 102 | Community language classes | Closely repeats the existing community-funding-priorities station. |
| 107 | A community compost site | Overlaps the accepted food-waste implementation scenario (105) and existing neighbourhood-dispute material. |
| 109 | Naming rights for a public facility | The funding-versus-harm conflict is already covered more specifically by accepted sponsorship scenarios 28 and 51. |
| 113 | A beach-cleanup partnership | Overlaps existing greenwashing material and the accepted sponsorship cases. Specify a distinct decision before adding it. |
| 125 | Selecting a peer mediator | Closely repeats the existing selecting-a-team-captain station, with limited extra depth for an eight-minute response. |
| 127 | An apprenticeship opportunity | Closely repeats existing favouritism-at-work and scholarship-conflict-of-interest scenarios. |
| 131 | Volunteer burnout | Adds little beyond existing competing-demands and fatigued-colleague stations and the accepted volunteer-boundary scenario (52). |
| 138 | Returning a found item | Too thin for eight minutes as written. Returning found property needs a meaningful competing need or uncertainty to sustain four questions. |
| 143 | A student’s caregiving responsibilities | Closely repeats the accepted attendance, discipline and underlying-barriers scenario (128). |
| 148 | A community leader’s conflict | Repeats the existing scholarship-conflict-of-interest decision. |
| 151 | A landlord’s renovation notice | Needs clearer tenancy and notice assumptions without requiring local legal knowledge, plus a more distinct discussion task. |

## Accepted stations

All entries below were accepted **after editorial revision**, rather than copied unchanged. Source numbering refers to the supplied document. The machine-readable mapping and source checksum are in [import-manifest.json](import-manifest.json). The complete edited wording is in [reviewed-stations.md](reviewed-stations.md).

| Source # | Imported title | Category |
| ---: | --- | --- |
| 1 | Child assent before a procedure | Consent · children and assent |
| 2 | Sharing a serious diagnosis | Communication · difficult news |
| 3 | Copying a clinical note | Patient safety · documentation |
| 4 | A request for a work certificate | Integrity · certification |
| 5 | Gift from a grateful patient | Professionalism · gifts and boundaries |
| 6 | Personal information in a teaching session | Confidentiality · teaching material |
| 7 | Low health literacy | Communication · health literacy |
| 8 | Family-directed traditional healing | Cultural respect · traditional healing |
| 9 | Religious clothing and sterile practice | Equity · religious accommodation |
| 10 | A clinician’s chosen name | Professionalism · respect at work |
| 12 | Feedback about a supervisor | Professionalism · speaking up |
| 13 | Certificate for disability support | Equity · disability support |
| 14 | Family members answering for a patient | Communication · patient participation |
| 15 | Debriefing after a patient death | Empathy · professional wellbeing |
| 16 | Patient request for another clinician | Communication · complaints and continuity |
| 17 | Unpaid carer exhaustion | Empathy · carer wellbeing |
| 18 | Inaccurate medication list at discharge | Patient safety · discharge communication |
| 19 | An inaccessible appointment-booking system | Equity · digital access to care |
| 21 | Medication shortages and continuity | Patient safety · continuity of medicines |
| 22 | A clinician’s personal fundraiser | Professionalism · fundraising boundaries |
| 23 | Privacy in a shared hospital room | Confidentiality · privacy in hospital |
| 24 | Managing a patient complaint online | Confidentiality · public complaints |
| 26 | A missed follow-up result | Patient safety · missed results |
| 27 | Fluoridation referendum | Public health · evidence and trust |
| 28 | Sugary-drink sponsorship | Public health · sponsorship and equity |
| 29 | Vaping waste near schools | Public health · youth prevention |
| 30 | Heatwave response | Equity · emergency access |
| 31 | Wastewater surveillance | Public health · population privacy |
| 32 | Masks on public transport | Public health · proportionate restrictions |
| 33 | E-scooter injury prevention | Public health · transport safety |
| 34 | Safe disposal of needles | Public health · harm minimisation |
| 36 | Shared electronic health record | Confidentiality · shared health records |
| 37 | Global vaccine distribution | Public health · global equity |
| 38 | Cross-border telehealth | Equity · coordinated care |
| 39 | Remote dialysis during flooding | Patient safety · disaster continuity |
| 40 | School-lunch nutrition policy | Public health · nutrition and inclusion |
| 41 | Free period products | Equity · targeted student support |
| 42 | Food insecurity screening | Equity · screening and practical support |
| 43 | Sleep education for shift workers | Public health · work and wellbeing |
| 44 | Air quality near a freight corridor | Public health · environmental uncertainty |
| 45 | Public defibrillators | Public health · resource allocation |
| 46 | Water restrictions and dialysis | Communication · explaining public priorities |
| 48 | Public alerts after a chemical spill | Communication · emergency uncertainty |
| 49 | Accessibility of emergency warnings | Equity · accessible warnings |
| 50 | Free sunscreen in public spaces | Public health · accessible prevention |
| 51 | Gambling advertising and sport | Public health · gambling sponsorship |
| 52 | Community mental-health first aid | Professionalism · volunteer role boundaries |
| 54 | Withdrawing from a biobank | Research ethics · withdrawal |
| 55 | Animal research | Research ethics · animal welfare |
| 57 | A communication-implant trial | Research ethics · emerging treatments |
| 58 | Direct-to-consumer genetic testing | Communication · uncertain health information |
| 59 | Returning individual research results | Research ethics · return of results |
| 60 | Synthetic patient data | Technology · synthetic health data |
| 61 | Research in a low-income setting | Research ethics · fair partnerships |
| 62 | Paid patient partners | Research ethics · patient partnership |
| 63 | Compassionate access to an unapproved therapy | Communication · hope and uncertainty |
| 64 | Incidental findings in imaging research | Research ethics · incidental findings |
| 65 | Research involving refugees | Research ethics · voluntary participation |
| 67 | Deepfake health advertising | Technology · misleading health content |
| 68 | Camera-based distress detection | Technology · predictive surveillance |
| 69 | An app predicting changes in mood | Technology · mental-health predictions |
| 70 | Research participant becomes unwell | Research ethics · participant safety |
| 71 | Health data sold after a company takeover | Confidentiality · changing data use |
| 72 | Early access to a longevity drug | Professionalism · uncertain benefits |
| 73 | Pharmaceutical influence on patient advocacy | Integrity · industry-funded advocacy |
| 74 | Citizen science during an outbreak | Public health · community health data |
| 76 | Public trust after a trial pause | Communication · research safety updates |
| 77 | Ownership of a patient-created dataset | Research ethics · community data ownership |
| 78 | Virtual reality exposure research | Research ethics · anticipated distress |
| 79 | The family group-chat screenshot | Confidentiality · private messages |
| 80 | Algorithmic rental screening | Technology · fair automated decisions |
| 82 | Editing a colleague’s voice recording | Integrity · altered recordings |
| 83 | A viral rescue video | Dignity · filming emergencies |
| 84 | Online memorial comments | Empathy · online grief |
| 86 | Location sharing between friends | Consent · location sharing |
| 87 | A child’s digital footprint | Consent · children online |
| 88 | A deepfake at school | Technology · impersonation and harm |
| 89 | A neighbourhood Wi-Fi network | Technology · connectivity and data choices |
| 90 | Marketplace seller ratings | Fairness · platform appeals |
| 91 | A leaked volunteer database | Confidentiality · accidental disclosure |
| 92 | Facial filters and self-image | Empathy · online appearance pressures |
| 93 | Online tutoring data | Consent · lesson recordings |
| 95 | Anonymous campus app | Technology · anonymous community spaces |
| 96 | Automated job interviews | Equity · automated recruitment |
| 97 | Tracking devices in a sports team | Consent · athlete monitoring |
| 99 | Rewilding a local reserve | Sustainability · shared public space |
| 100 | Water allocation for a river town | Sustainability · water allocation |
| 101 | A school tree-removal plan | Sustainability · school safety and trees |
| 103 | A public art mural | Cultural respect · public representation |
| 104 | Renewable-energy wind farm | Sustainability · meaningful consultation |
| 105 | Food-waste collection | Sustainability · workable implementation |
| 106 | Protecting a night sky | Sustainability · light and public safety |
| 108 | Tourism in a fragile landscape | Sustainability · tourism and conservation |
| 110 | Preserving a local cemetery | Cultural respect · memory and development |
| 111 | A festival’s accessibility plan | Equity · accessible events |
| 112 | Community solar subscriptions | Equity · climate benefits |
| 114 | Community radio language policy | Community · language and belonging |
| 115 | Restoring a historical building | Community · heritage and future use |
| 116 | Community garden pesticide dispute | Sustainability · contested evidence |
| 117 | Wildlife feeding ban | Sustainability · community behaviour |
| 118 | Disaster donations sorting | Dignity · disaster assistance |
| 119 | A group project’s silent member | Teamwork · different participation styles |
| 120 | A mentor taking credit | Integrity · recognition at work |
| 121 | Competing student-club events | Teamwork · negotiating competing needs |
| 122 | A workplace dress-code complaint | Equity · workplace expectations |
| 123 | A friend’s unpaid labour | Fairness · unpaid expertise |
| 124 | A teacher’s political comment | Professionalism · authority and debate |
| 126 | A team’s hidden workload | Fairness · invisible work |
| 128 | A school discipline policy | Equity · attendance and discipline |
| 129 | The departing employee’s files | Confidentiality · demonstrating past work |
| 130 | A peer’s public apology | Empathy · apology and repair |
| 132 | A sports coach’s harsh feedback | Leadership · constructive feedback |
| 133 | A leadership succession dispute | Leadership · succession and legitimacy |
| 134 | A shared-house care roster | Teamwork · shared responsibilities |
| 135 | A child performer’s contract | Consent · young people's choices |
| 136 | Community choir exclusion | Community · inclusion and excellence |
| 137 | A refereeing mistake | Fairness · responding to mistakes |
| 139 | An employee’s second job | Fairness · competing work obligations |
| 140 | A school fundraiser prize | Equity · fundraising participation |
| 141 | A workplace wellbeing survey | Confidentiality · staff feedback |
| 142 | The inaccessible team retreat | Equity · inclusive workplaces |
| 144 | A restaurant’s service charge | Communication · transparent pricing |
| 145 | A performer’s contract cancellation | Fairness · past conduct and change |
| 146 | Anonymous peer feedback | Fairness · peer assessment |
| 147 | Parent volunteers and gatekeeping | Equity · access to school activities |
| 149 | The overloaded intern | Professionalism · work and learning |
| 150 | A shared presentation deadline | Teamwork · crisis and accountability |
| 152 | A club’s alcohol-free event | Community · changing traditions |
| 153 | A young entrepreneur’s loan | Fairness · access to opportunity |
| 154 | A union meeting boycott | Leadership · rebuilding representation |
| 155 | A library’s quiet-space policy | Community · competing access needs |
| 156 | Choosing a community award recipient | Fairness · recognising contribution |

## Reference checks and limits

The limited primary-source checks below informed the handling of clinical boundaries, research consent and identifiable information. They are not a legal sign-off for every scenario. For a high-stakes assessment bank, an Australian clinician or experienced MMI educator should review the clinical/research material before claiming external validation. The more technical or legally under-specified cases were held rather than filled in with invented rules.

- [Medical Board of Australia: sexual boundaries](https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Sexual-boundaries-guidelines.aspx): former-patient boundaries cannot be reduced to a fixed six-month rule. The held dating scenario needs revision.
- [NHMRC: National Statement on Ethical Conduct in Human Research](https://www.nhmrc.gov.au/research-policy/ethics/national-statement-ethical-conduct-human-research): research consent and appropriate review matter; hypothetical proposals must not imply ethical approval.
- [OAIC: de-identification and the Privacy Act](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/de-identification-and-the-privacy-act): removal of a name alone does not establish that a person is no longer reasonably identifiable. This informs the revised teaching-material and generated-data guidance.

## Validation

See [validation.md](validation.md) for the final automated checks. Content quality still requires educator judgement; passing software tests establishes integration and access behaviour, not educational validity.
