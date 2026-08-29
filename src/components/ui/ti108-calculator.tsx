'use client'
import { useEffect, useRef, useState } from 'react'

type CalcState = {
  display: string
  prev: number | null
  op: string | null
  waiting: boolean
  memory: number
  lastMRC: boolean
}
const INIT: CalcState = { display: '0', prev: null, op: null, waiting: false, memory: 0, lastMRC: false }

function compute(a: number, op: string, b: number): number | 'Error' {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '×': return a * b
    case '÷': return b === 0 ? 'Error' : a / b
  }
  return b
}
function fmt(display: string): string {
  if (display === 'Error') return 'Error'
  let out = display.indexOf('.') === -1 ? display + '.' : display
  const digits = out.replace('.', '').replace('-', '')
  if (digits.length > 9) {
    const n = Number(Number(display).toPrecision(8)).toString()
    out = n.indexOf('.') === -1 ? n + '.' : n
  }
  return out
}

export function TI108Calculator({ onClose }: { onClose: () => void }) {
  const [c, setC] = useState<CalcState>(INIT)
  const [pos, setPos] = useState({ x: 40, y: 90 })
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const digit = (d: string) =>
    setC((s) =>
      s.waiting
        ? { ...s, display: d, waiting: false, lastMRC: false }
        : { ...s, display: s.display === '0' ? d : s.display + d, lastMRC: false },
    )
  const dot = () =>
    setC((s) =>
      s.waiting ? { ...s, display: '0.', waiting: false } : s.display.includes('.') ? s : { ...s, display: s.display + '.' },
    )
  const clearAll = () => setC(INIT)
  const setOp = (o: string) =>
    setC((s) => {
      const cur = parseFloat(s.display)
      if (s.op && !s.waiting && s.prev != null) {
        const r = compute(s.prev, s.op, cur)
        if (r === 'Error') return { ...INIT, display: 'Error' }
        return { ...s, display: String(r), prev: r, op: o, waiting: true, lastMRC: false }
      }
      return { ...s, prev: cur, op: o, waiting: true, lastMRC: false }
    })
  const equals = () =>
    setC((s) => {
      if (s.op == null || s.prev == null) return s
      const r = compute(s.prev, s.op, parseFloat(s.display))
      return { ...s, display: r === 'Error' ? 'Error' : String(r), op: null, prev: null, waiting: true }
    })
  const sqrt = () => setC((s) => { const v = parseFloat(s.display); return { ...s, display: v < 0 ? 'Error' : String(Math.sqrt(v)), waiting: true } })
  const negate = () => setC((s) => (s.display === '0' || s.display === 'Error') ? s : { ...s, display: s.display.startsWith('-') ? s.display.slice(1) : '-' + s.display })
  const percent = () =>
    setC((s) => {
      const cur = parseFloat(s.display)
      if (s.op && s.prev != null) return { ...s, display: s.op === '+' || s.op === '-' ? String(s.prev * cur / 100) : String(cur / 100) }
      return { ...s, display: String(cur / 100) }
    })
  const mem = (kind: string) =>
    setC((s) => {
      const cur = parseFloat(s.display)
      if (kind === 'M+') return { ...s, memory: s.memory + cur, waiting: true, lastMRC: false }
      if (kind === 'M-') return { ...s, memory: s.memory - cur, waiting: true, lastMRC: false }
      if (s.lastMRC) return { ...s, memory: 0, lastMRC: false }
      return { ...s, display: String(s.memory), waiting: true, lastMRC: true }
    })

  // physical keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key
      if (k >= '0' && k <= '9') digit(k)
      else if (k === '.') dot()
      else if (k === '+') setOp('+')
      else if (k === '-') setOp('-')
      else if (k === '*') setOp('×')
      else if (k === '/') { e.preventDefault(); setOp('÷') }
      else if (k === 'Enter' || k === '=') { e.preventDefault(); equals() }
      else if (k === 'Escape') clearAll()
      else if (k === 'Backspace') setC((s) => (!s.waiting && s.display.length > 1 ? { ...s, display: s.display.slice(0, -1) } : { ...s, display: '0' }))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // drag
  useEffect(() => {
    const move = (e: MouseEvent) => { if (drag.current) setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }) }
    const up = () => { drag.current = null }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [])

  const KEYS: [string, string, () => void][] = [
    ['+/−', 'red', negate], ['√', 'red', sqrt], ['%', 'red', percent], ['÷', 'red', () => setOp('÷')],
    ['MRC', 'red', () => mem('MRC')], ['M−', 'red', () => mem('M-')], ['M+', 'red', () => mem('M+')], ['×', 'red', () => setOp('×')],
    ['7', 'white', () => digit('7')], ['8', 'white', () => digit('8')], ['9', 'white', () => digit('9')], ['−', 'red', () => setOp('-')],
    ['4', 'white', () => digit('4')], ['5', 'white', () => digit('5')], ['6', 'white', () => digit('6')], ['+', 'red', () => setOp('+')],
    ['1', 'white', () => digit('1')], ['2', 'white', () => digit('2')], ['3', 'white', () => digit('3')], ['=', 'red eq', equals],
    ['ON/C', 'red', clearAll], ['0', 'white', () => digit('0')], ['.', 'white', dot],
  ]

  return (
    <div
      className="fixed z-50 w-[290px] select-none rounded-lg border border-[#43587e] shadow-2xl"
      style={{ left: pos.x, top: pos.y, background: 'linear-gradient(#6e8cbb,#5c79ac)' }}
    >
      <div
        className="flex cursor-move items-center justify-between px-3 py-2 text-white"
        onMouseDown={(e) => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y } }}
      >
        <span className="text-sm font-medium">Calculator</span>
        <button onClick={onClose} aria-label="Close calculator" className="text-lg leading-none">✕</button>
      </div>
      <div className="mx-3 rounded border-2 border-[#46506a] bg-[#c9d2c4] px-3 py-2 text-right">
        <span className="font-mono text-2xl tracking-widest text-[#20261f]" style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{fmt(c.display)}</span>
      </div>
      <div className="px-4 py-1 text-[11px] italic text-white">TEXAS INSTRUMENTS TI-108</div>
      <div className="grid grid-cols-4 gap-2 px-4 pb-4 pt-1">
        {KEYS.map(([label, cls, fn], idx) => (
          <button
            key={idx}
            onClick={fn}
            className={
              'h-11 rounded-md text-base font-bold shadow-[0_2px_0_rgba(0,0,0,.28)] active:translate-y-px ' +
              (cls.includes('white') ? 'bg-white text-[#222]' : 'text-white') +
              (cls.includes('eq') ? ' col-start-4 row-span-2 row-start-5 h-auto' : '')
            }
            style={cls.includes('white') ? undefined : { background: 'linear-gradient(#d0483a,#c0392b)' }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
