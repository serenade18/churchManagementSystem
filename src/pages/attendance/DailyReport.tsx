import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Alert, Spinner } from '../../components/ui'
import { downloadCsv } from '../../lib/api'
import { today } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import type { Id } from '../../types'

// Attendance day by day: every service held that day, who came (members, named visitors, the head
// count of others), how many checked themselves in, and when the first and last arrived.

interface ReportService {
  id: Id; name: string; service_type: string; branch_name: string | null
  members: number; visitors: number; head_count: number; total: number; by_qr: number; by_sms: number
  first_at: string | null; last_at: string | null
}
interface ReportDay { date: string; services: ReportService[]; members: number; visitors: number; head_count: number; total: number }
interface Report { date_from: string; date_to: string; days: ReportDay[] }

const ymd = (d: Date) => d.toISOString().slice(0, 10)
const clock = (at: string | null) => (at ? new Date(at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false }) : '')
const longDay = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default function DailyReport({ branch }: { branch: string }) {
  const [range, setRange] = useState({ date_from: ymd(new Date(Date.now() - 29 * 86400000)), date_to: today() })
  const { data, loading, error } = useApi<Report>('/cms/attendance/daily/', { ...range, branch })

  return (
    <section aria-labelledby="daily-title" className="card mt-6 p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="daily-title" className="font-semibold">Daily attendance</h2>
          <p className="text-sm text-mk-muted">Each day’s services, who came, and how they checked in.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[13px] text-mk-muted">From
            <input type="date" className="input" value={range.date_from} max={range.date_to} onChange={(e) => setRange({ ...range, date_from: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-mk-muted">To
            <input type="date" className="input" value={range.date_to} min={range.date_from} onChange={(e) => setRange({ ...range, date_to: e.target.value })} />
          </label>
          <button className="btn-secondary" onClick={() => downloadCsv('/cms/attendance/daily/', { ...range, branch, export: 'csv' }, `attendance-${range.date_from}-to-${range.date_to}.csv`)}>
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>
      <Alert>{error?.message}</Alert>
      {loading && !data ? <Spinner className="mx-auto my-10" /> : data?.days.length ? (
        <div className="flex flex-col gap-4">
          {data.days.map((day) => (
            <div key={day.date} aria-label={longDay(day.date)} role="group" className="overflow-hidden rounded-xl border border-mk-border">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-mk-ivory px-4 py-3">
                <h3 className="font-semibold text-mk-forest">{longDay(day.date)}</h3>
                <p className="text-sm text-mk-slate">
                  <strong className="text-mk-forest">{day.total}</strong> attended · {day.members} members · {day.visitors + day.head_count} visitors
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="sr-only"><tr><th>Service</th><th>Members</th><th>Visitors</th><th>Total</th><th>Check-ins</th></tr></thead>
                <tbody>
                  {day.services.map((s) => (
                    <tr key={s.id} className="border-t border-mk-mist">
                      <td className="px-4 py-2.5">
                        <Link to={`/attendance/${s.id}`} className="font-medium text-mk-forest hover:underline">{s.name}</Link>
                        <span className="block text-xs text-mk-muted">{s.branch_name || 'Church-wide'}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{s.members} <span className="text-xs text-mk-muted">members</span></td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{s.visitors + s.head_count} <span className="text-xs text-mk-muted">visitors</span></td>
                      <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-mk-forest">{s.total}</td>
                      <td className="hidden px-4 py-2.5 text-right text-xs text-mk-muted sm:table-cell">
                        {s.by_qr > 0 && `${s.by_qr} by QR`}{s.by_qr > 0 && s.by_sms > 0 && ' · '}{s.by_sms > 0 && `${s.by_sms} by SMS`}
                        {s.first_at && <span className="block">{clock(s.first_at)}{s.last_at && s.last_at !== s.first_at && `–${clock(s.last_at)}`}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : <p className="py-10 text-center text-sm text-mk-muted">No services between these dates.</p>}
    </section>
  )
}
