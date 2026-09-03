'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { HistoricalPracticeReview, HistoricalReviewItem } from '@/lib/practice/sessions'

const ARIAL = 'Arial, Helvetica, sans-serif'
const BAR = 'linear-gradient(#1a78bf,#1268ad)'

export function PastSessionReview({ review }: { review: HistoricalPracticeReview }) {
  const [index, setIndex] = useState(0)
  const item = review.items[index]
  const title = review.tag || review.subtestName || 'Practice session'
  const pct = review.total ? Math.round((review.correct / review.total) * 100) : 0

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white text-[#1b1b1b]" style={{ fontFamily: ARIAL }}>
      <header className="flex items-center justify-between gap-4 px-5 py-3 text-white" style={{ background: BAR }}>
        <div>
          <p className="text-xs text-white/75">Completed session</p>
          <h1 className="text-lg font-semibold">{review.examName} · {title}</h1>
        </div>
        <Link href={`/practice/${review.examSlug}`} className="rounded border border-white/40 px-3 py-1.5 text-sm hover:bg-white/10">Exit review</Link>
      </header>

      <div className="flex items-center justify-between border-b border-[#aac7df] bg-[#eaf3fa] px-5 py-2 text-sm text-[#194f7a]">
        <span>{review.mode === 'timed' ? 'Timed' : 'Untimed'} · {review.items.length} questions</span>
        <span className="font-semibold">Score {review.correct}/{review.total} · {pct}%</span>
      </div>

      <main className="grid min-h-0 flex-1 md:grid-cols-[230px_1fr]">
        <nav className="overflow-auto border-r border-gray-200 bg-[#f6f7f8] p-3" aria-label="Session questions">
          <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-gray-500">Questions</p>
          <div className="grid grid-cols-5 gap-2 md:grid-cols-4">
            {review.items.map((entry, position) => {
              const active = position === index
              const state = !entry.answered ? 'unseen' : entry.score > 0 ? 'correct' : 'incorrect'
              return (
                <button
                  key={entry.question.id}
                  onClick={() => setIndex(position)}
                  className={`h-10 rounded border text-sm font-semibold transition-transform hover:-translate-y-0.5 ${active ? 'ring-2 ring-[#1268ad] ring-offset-1' : ''} ${state === 'correct' ? 'border-[#32855a] bg-[#e4f3ea] text-[#216540]' : state === 'incorrect' ? 'border-[#ca4b4b] bg-[#fbe9e9] text-[#9f2828]' : 'border-gray-300 bg-white text-gray-500'}`}
                  aria-current={active ? 'step' : undefined}
                >
                  {position + 1}
                </button>
              )
            })}
          </div>
        </nav>

        <section className="min-w-0 overflow-auto p-5 md:p-8">
          {item ? <QuestionReview item={item} number={index + 1} /> : <p>Question no longer available.</p>}
        </section>
      </main>

      <footer className="flex items-center justify-between px-5 py-2 text-white" style={{ background: BAR }}>
        <button disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="rounded px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-35">← Previous</button>
        <span className="text-sm">Question {index + 1} of {review.items.length}</span>
        <button disabled={index >= review.items.length - 1} onClick={() => setIndex((value) => Math.min(review.items.length - 1, value + 1))} className="rounded px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-35">Next →</button>
      </footer>
    </div>
  )
}

function QuestionReview({ item, number }: { item: HistoricalReviewItem; number: number }) {
  const q = item.question
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Question {number}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${!item.answered ? 'bg-gray-100 text-gray-600' : item.score > 0 ? 'bg-[#e4f3ea] text-[#216540]' : 'bg-[#fbe9e9] text-[#9f2828]'}`}>
          {!item.answered ? 'Not answered' : `${item.score}/${q.marks} mark${q.marks === 1 ? '' : 's'}`}
        </span>
      </div>
      <div className={`grid gap-7 ${q.passage || q.images.length || q.tables.length ? 'lg:grid-cols-2' : ''}`}>
        {(q.passage || q.images.length || q.tables.length) ? (
          <div className="space-y-4 rounded border border-gray-300 bg-[#fafafa] p-5">
            {q.passage ? <p className="whitespace-pre-wrap leading-7">{q.passage}</p> : null}
            {q.images.map((src, imageIndex) => <img key={src} src={src} alt={`Question diagram ${imageIndex + 1}`} className="max-w-full border border-gray-200 bg-white" />)}
            {q.tables.map((table, tableIndex) => (
              <div key={tableIndex} className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{table.headers.map((header, i) => <th key={i} className="border border-gray-400 bg-gray-100 px-3 py-2 text-left">{header}</th>)}</tr></thead><tbody>{table.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className="border border-gray-400 px-3 py-2">{cell}</td>)}</tr>)}</tbody></table></div>
            ))}
          </div>
        ) : null}
        <div>
          <p className="mb-5 whitespace-pre-wrap text-[17px] leading-7">{q.stem}</p>
          {q.statements ? <GridReview item={item} /> : q.mostLeast ? <MostLeastReview item={item} /> : <OptionsReview item={item} />}
          <div className="mt-7 rounded border-l-4 border-[#1268ad] bg-[#eef6fc] p-5">
            <h3 className="font-bold text-[#194f7a]">Worked explanation</h3>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-6">{item.explanation || 'No explanation has been added yet.'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function OptionsReview({ item }: { item: HistoricalReviewItem }) {
  return <div className="space-y-2.5">{item.question.options.map((option) => {
    const selected = option.id === item.selectedOptionId
    const correct = option.id === item.correctOptionId
    const cls = correct ? 'border-[#32855a] bg-[#e4f3ea]' : selected ? 'border-[#ca4b4b] bg-[#fbe9e9]' : 'border-gray-300 bg-white'
    return <div key={option.id} className={`flex gap-3 rounded border-2 p-3 ${cls}`}><span className="font-bold">{option.label}.</span><span className="flex-1">{option.body}</span>{correct ? <span className="text-xs font-bold text-[#216540]">Correct</span> : selected ? <span className="text-xs font-bold text-[#9f2828]">Your answer</span> : null}</div>
  })}</div>
}

function GridReview({ item }: { item: HistoricalReviewItem }) {
  return <div className="space-y-2">{item.question.statements?.map((statement) => {
    const selected = String(item.response?.[String(statement.index)] ?? '—')
    const correct = item.correctStatements?.find((answer) => answer.index === statement.index)?.answer ?? '—'
    return <div key={statement.index} className="rounded border border-gray-300 p-3"><p>{statement.text}</p><p className="mt-2 text-sm"><span className={selected === correct ? 'font-semibold text-[#216540]' : 'font-semibold text-[#9f2828]'}>Your answer: {selected}</span><span className="ml-4 font-semibold text-[#216540]">Correct: {correct}</span></p></div>
  })}</div>
}

function MostLeastReview({ item }: { item: HistoricalReviewItem }) {
  const selectedMost = Number(item.response?.most)
  const selectedLeast = Number(item.response?.least)
  return <div className="space-y-2">{item.question.mostLeast?.actions.map((action) => {
    const labels = []
    if (action.index === selectedMost) labels.push('Your most')
    if (action.index === selectedLeast) labels.push('Your least')
    if (action.index === item.correctMostLeast?.most) labels.push('Correct most')
    if (action.index === item.correctMostLeast?.least) labels.push('Correct least')
    return <div key={action.index} className="flex items-center justify-between gap-3 rounded border border-gray-300 p-3"><span>{action.text}</span><span className="text-xs font-semibold text-[#194f7a]">{labels.join(' · ')}</span></div>
  })}</div>
}
