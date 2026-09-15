export function promptFocus(question: string) {
  const text = question.trim().toLowerCase()
  if (/\b(tell us|tell me|describe|give an example|experience|a time)\b/.test(text)) return 'Personal example'
  if (/^(how would|how should|how do|how can|what would you do)/.test(text)) return 'Approach and judgement'
  if (/^(why|what makes|what is the difference|what are the benefits|what effect)/.test(text)) return 'Concept and reasoning'
  if (/^(when|is it|should|would you)/.test(text)) return 'Position and boundaries'
  return 'Reflection and reasoning'
}

export function categoryTopics(category: string) {
  return category.split('·').map(value => value.trim()).filter(Boolean)
}
