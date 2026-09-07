export type TranscriptSpan = { start: number; end: number; questionIndex: number | null }
export type TranscriptLayout = { version: 1; spans: TranscriptSpan[] }

export function transcriptQuestions(value: unknown): string[] {
 return Array.isArray(value) && value.length <= 20 && value.every(q => typeof q === 'string' && q.trim() && q.length <= 4000) ? value : []
}

/** Preserve original whitespace and wording. The model only assigns unit numbers. */
export function transcriptUnits(text: string): Array<{ start: number; end: number; text: string }> {
 const result: Array<{ start: number; end: number; text: string }> = []
 for (const sentence of new Intl.Segmenter('en', {granularity:'sentence'}).segment(text)) {
  const words = [...sentence.segment.matchAll(/\S+\s*|\s+/g)]
  let start = sentence.index, length = 0
  for (let index = 0; index < words.length; index++) {
   length += words[index][0].length
   if ((index + 1) % 60 === 0 || index === words.length - 1) {
    result.push({start,end:start + length,text:text.slice(start,start + length)})
    start += length; length = 0
   }
  }
 }
 return result
}

export function layoutFromAssignments(text: string, questions: string[], value: unknown): TranscriptLayout {
 const units = transcriptUnits(text)
 const indices = value && typeof value === 'object' && 'question_indices' in value ? value.question_indices : null
 if (!units.length || units.length > 500 || !Array.isArray(indices) || indices.length !== units.length) throw new Error('invalid_transcript_layout')
 const spans:TranscriptSpan[] = []
 units.forEach((unit, index) => {
  const questionIndex = indices[index]
  if (questionIndex !== null && (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= questions.length)) throw new Error('invalid_transcript_layout')
  const previous = spans.at(-1)
  if (previous && previous.questionIndex === questionIndex) previous.end = unit.end
  else spans.push({start:unit.start,end:unit.end,questionIndex})
 })
 const result:TranscriptLayout = {version:1,spans}
 if (!validTranscriptLayout(result,text,questions)) throw new Error('invalid_transcript_layout')
 return result
}

export function validTranscriptLayout(value: unknown, text: string, questions: string[]): value is TranscriptLayout {
 if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('spans' in value) || !Array.isArray(value.spans) || !value.spans.length || value.spans.length > 500) return false
 let end = 0
 for (const span of value.spans) {
  if (!span || typeof span !== 'object' || !Number.isInteger(span.start) || !Number.isInteger(span.end) || span.start !== end || span.end <= span.start || span.end > text.length || (span.questionIndex !== null && (!Number.isInteger(span.questionIndex) || span.questionIndex < 0 || span.questionIndex >= questions.length))) return false
  end = span.end
 }
 return end === text.length
}

export function questionTranscriptSections(text: string, questions: string[], layout: TranscriptLayout) {
 if (!validTranscriptLayout(layout,text,questions)) return []
 return [...questions.map((question, questionIndex) => ({question,questionIndex})),{question:'Other parts of your response',questionIndex:null}]
  .map(section => ({...section,passages:layout.spans.filter(span => span.questionIndex === section.questionIndex).map(span => text.slice(span.start,span.end))}))
  .filter(section => section.questionIndex !== null || section.passages.length > 0)
}
