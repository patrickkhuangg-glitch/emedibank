import { InterviewRehearsalRunner } from '@/components/interviews/rehearsal-runner'
import { INTERVIEW_STATIONS } from '@/lib/interviews/stations'
import { studentStation } from '@/lib/interviews/trial-stations'
export default function Page(){return <InterviewRehearsalRunner station={studentStation(INTERVIEW_STATIONS[0])} allowUntracked/>}
