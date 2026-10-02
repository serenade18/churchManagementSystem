import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarCheck, CalendarDays, MessageSquare, Plus, UserX, Users } from 'lucide-react'
import ServiceForm from '../components/ServiceForm'
import { Alert, PageHeader, Pagination, Select, StatCard, Table } from '../components/ui'
import { useApi, useOptions } from '../lib/hooks'
import { SERVICE_TYPES, date } from '../lib/format'

const AXIS = { fontSize: 12, fill: '#64748b' }

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const t = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="text-slate-500">{t.name} · {date(t.date)}</p>
      <p className="font-semibold text-slate-900">{t.total} attended</p>
      <p className="text-xs text-slate-500">{t.members_present} members · {t.visitors} visitors</p>
    </div>
  )
}

export default function Attendance() {
  const navigate = useNavigate()
  const branches = useOptions('/cms/branches/')
  const [branch, setBranch] = useState('')
  const [type, setType] = useState('')
  const [weeks, setWeeks] = useState('4')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const stats = useApi('/cms/attendance/stats/', { branch, weeks })
  const services = useApi('/cms/services/', { branch, service_type: type, page })
  const s = stats.data

  const trend = (s?.trend || []).map((t) => ({
    ...t, label: new Date(t.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
  }))

  return (
    <>
      <PageHeader title="Attendance" subtitle="Record who came to each service and follow up with members who have been away."
        actions={<>
          <div className="w-44"><Select value={branch} onChange={(v) => { setBranch(v); setPage(1) }} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="All branches" /></div>
          <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New service</button>
        </>} />
      <Alert>{stats.error?.message || services.error?.message}</Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Last service" value={s?.last_service ? s.last_service.total : '—'}
          hint={s?.last_service ? `${s.last_service.name} · ${date(s.last_service.date)}` : 'No services yet'} />
        <StatCard icon={Users} label="Average attendance" value={s?.average_attendance ?? '—'} hint="Per service day, last 8 · incl. visitors" />
        <StatCard icon={CalendarDays} label="Services this month" value={s?.services_this_month ?? '—'} />
        <StatCard icon={UserX} label="Need follow-up" value={s?.follow_up_count ?? '—'} hint={`Active members absent ${weeks}+ weeks`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h2 className="font-semibold">Attendance trend</h2>
          <p className="mb-4 text-sm text-slate-500">Total attendance per service day (last {trend.length || 12})</p>
          {trend.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                  <Tooltip content={<TrendTooltip />} cursor={{ fill: '#eff4ff' }} />
                  <Bar dataKey="total" fill="#2453d9" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-16 text-center text-sm text-slate-500">Create a service and mark attendance to see the trend.</p>}
        </div>

        <div className="card flex flex-col p-5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Follow up</h2>
            <div className="w-32"><Select value={weeks} onChange={setWeeks} options={{ 2: '2+ weeks', 4: '4+ weeks', 8: '8+ weeks', 12: '12+ weeks' }} /></div>
          </div>
          <p className="mb-3 text-sm text-slate-500">Active members who haven't attended in {weeks}+ weeks.</p>
          <ul className="max-h-64 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {s?.follow_up?.length === 0 && <li className="py-6 text-center text-sm text-slate-500">Everyone has been around recently.</li>}
            {s?.follow_up?.map((m) => (
              <li key={m.id} className="flex cursor-pointer justify-between gap-3 py-2 text-sm hover:bg-slate-50" onClick={() => navigate(`/members/${m.id}`)}>
                <span><span className="font-medium">{m.full_name}</span> <span className="text-slate-400">· {m.branch_name || 'No branch'}</span></span>
                <span className="whitespace-nowrap text-xs text-slate-500">{m.last_attended ? `Last: ${date(m.last_attended)}` : 'Never recorded'}</span>
              </li>
            ))}
          </ul>
          {s?.follow_up?.length > 0 && (
            <button className="btn-secondary mt-3" onClick={() => navigate('/sms', { state: { members: s.follow_up } })}>
              <MessageSquare className="h-4 w-4" /> SMS {s.follow_up.length === s.follow_up_count ? 'these' : `the first ${s.follow_up.length}`} members
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Services</h2>
        <div className="w-48"><Select value={type} onChange={(v) => { setType(v); setPage(1) }} options={SERVICE_TYPES} placeholder="All types" /></div>
      </div>
      <Table loading={services.loading} rows={services.data?.results} onRowClick={(row) => navigate(`/attendance/${row.id}`)}
        empty="No services yet. Create one to start taking attendance."
        columns={[
          { key: 'date', label: 'Date', render: (r) => <>{date(r.date)}{r.start_time && <span className="text-slate-400"> · {r.start_time.slice(0, 5)}</span>}</> },
          { key: 'name', label: 'Service', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
          { key: 'branch_name', label: 'Branch', render: (r) => r.branch_name || 'Church-wide' },
          { key: 'members_present', label: 'Members', className: 'text-right' },
          { key: 'visitor_count', label: 'Visitors', className: 'text-right' },
          { key: 'total_attendance', label: 'Total', className: 'text-right font-semibold' },
        ]} />
      <Pagination page={page} count={services.data?.count} onChange={setPage} />

      {creating && <ServiceForm onClose={() => setCreating(false)} onSaved={(svc) => navigate(`/attendance/${svc.id}`)} />}
    </>
  )
}
