import { useParams, useSearchParams } from 'react-router-dom'
import PrintLayout, { ChurchHeader } from '../../components/PrintLayout'
import { useApi } from '../../lib/hooks'
import { date, dateTime, money } from '../../lib/format'
import type { Statement } from '../../types'

export default function StatementPrint() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const { data: s, loading, error } = useApi<Statement>(`/cms/members/${id}/statement/`, {
    date_from: search.get('date_from') || '', date_to: search.get('date_to') || '',
  })

  return (
    <PrintLayout title={s ? `Giving statement ${s.member.membership_number} ${s.date_from} to ${s.date_to}` : 'Giving statement'} loading={loading} error={error}>
      {s && (
        <div className="text-slate-800">
          <ChurchHeader church={s.church} title="Giving Statement" subtitle={
            <p className="mt-1 text-xs text-slate-600">{date(s.date_from)} – {date(s.date_to)}</p>
          } />

          <div className="mb-6 grid grid-cols-2 gap-2 text-sm">
            <p><span className="text-slate-500">Member: </span><span className="font-semibold">{s.member.full_name}</span></p>
            <p><span className="text-slate-500">Membership no.: </span><span className="font-semibold">{s.member.membership_number}</span></p>
            {s.member.branch && <p><span className="text-slate-500">Branch: </span>{s.member.branch}</p>}
            {s.member.phone_number && <p><span className="text-slate-500">Phone: </span>{s.member.phone_number}</p>}
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y-2 border-slate-800 text-left text-xs uppercase tracking-wide">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Receipt no.</th>
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 pr-2">Method / Ref</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {s.donations.map((d) => (
                <tr key={d.receipt_number} className="break-inside-avoid border-b border-slate-200">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{date(d.date)}</td>
                  <td className="py-1.5 pr-2 font-mono text-xs">{d.receipt_number}</td>
                  <td className="py-1.5 pr-2">{d.description}</td>
                  <td className="py-1.5 pr-2 text-xs">{d.channel}{d.reference && <span className="font-mono"> · {d.reference}</span>}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">{money(d.amount)}</td>
                </tr>
              ))}
              {!s.donations.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No giving recorded in this period.</td></tr>}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-800 font-bold">
                <td colSpan={4} className="py-2">Total</td>
                <td className="py-2 text-right whitespace-nowrap">{money(s.total)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-sm"><span className="text-slate-500">In words: </span><span className="italic">{s.total_in_words}</span></p>

          {s.by_type.length > 1 && (
            <div className="mt-6 break-inside-avoid">
              <p className="mb-2 text-sm font-semibold">Summary</p>
              <table className="w-72 text-sm">
                <tbody>
                  {s.by_type.map((t) => (
                    <tr key={t.label} className="border-b border-slate-200"><td className="py-1">{t.label}</td><td className="py-1 text-right">{money(t.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-10 text-center text-xs italic text-slate-500">Thank you for your faithful giving. God bless you!</p>
          <p className="mt-1 text-center text-[10px] text-slate-400">Printed {dateTime(s.printed_at)}</p>
        </div>
      )}
    </PrintLayout>
  )
}
