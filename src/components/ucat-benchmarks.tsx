import { UCAT_ANZ_2026 } from '@/lib/ucat/benchmarks'

export function UcatBenchmarks({ sectionSlugs }: { sectionSlugs?: string[] }) {
  const rows = Object.entries(UCAT_ANZ_2026.sections).filter(([slug]) => !sectionSlugs || sectionSlugs.includes(slug))
  return <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 text-sm text-[#1b2a46]">
    <h2 className="font-semibold">Official UCAT ANZ 2026 benchmarks</h2>
    <p className="mt-2 text-xs leading-relaxed text-gray-600">17,341 candidates. These are actual scaled-score statistics; your practice score above is an estimate.</p>
    <div className="mt-4 overflow-x-auto"><table className="w-full border-collapse text-left text-xs tabular-nums">
      <thead><tr className="border-b border-gray-200"><th className="py-2 pr-4 font-medium">Section</th><th className="px-2 py-2 text-right font-medium">Mean</th><th className="px-2 py-2 text-right font-medium">Median</th><th className="py-2 pl-2 text-right font-medium">90th percentile</th></tr></thead>
      <tbody>{rows.map(([slug, row]) => <tr key={slug} className="border-b border-gray-100 last:border-0"><th scope="row" className="py-3 pr-4 font-normal">{row.name} <span className="text-gray-500">/ {row.maximum}</span></th><td className="px-2 py-3 text-right">{row.mean.toLocaleString('en-AU')}</td><td className="px-2 py-3 text-right">{row.quartiles[1].toLocaleString('en-AU')}</td><td className="py-3 pl-2 text-right">{row.deciles[8].toLocaleString('en-AU')}</td></tr>)}</tbody>
    </table></div>
    <p className="mt-3 text-xs text-gray-500"><a className="underline" href={UCAT_ANZ_2026.source} target="_blank" rel="noreferrer">Source: UCAT ANZ 2026 summary statistics</a>. This table does not specify how raw marks convert to scaled scores.</p>
  </section>
}
