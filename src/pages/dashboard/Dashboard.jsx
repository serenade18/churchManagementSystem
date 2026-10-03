import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Building2, CalendarDays, FolderKanban, HandCoins, Users } from 'lucide-react'
import { Alert, Badge, PageHeader, Progress, Spinner, StatCard } from '../../components/ui'
import { useApi } from '../../lib/hooks'
import { CHANNELS, DONATION_STATUS, compactMoney, date, dateTime, money } from '../../lib/format'
import { brandColor } from '../../lib/theme'

const AXIS = { fontSize: 12, fill: '#64748b' }

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{money(payload[0].value)}</p>
    </div>
  )
}

const monthLabel = (key) => {
  const [y, m] = key.split('-')
  return new Date(y, m - 1).toLocaleDateString('en-KE', { month: 'short', year: '2-digit' })
}

export default function Dashboard() {
  const { data, loading, error } = useApi('/cms/dashboard/')

  if (loading && !data) return <div className="py-20"><Spinner className="mx-auto h-8 w-8" /></div>
  if (error) return <Alert>{error.message}</Alert>

  const trend = data.trend.map((t) => ({ month: monthLabel(t.month), total: Number(t.total) }))
  const byType = data.by_type.map((t) => ({ type: t.name || 'Unspecified', total: Number(t.total) }))

  return (
    <>
      <PageHeader title="Dashboard" subtitle="An overview of your church at a glance." />

      {data.unallocated_payments > 0 && (
        <Link to="/paybill" className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{money(data.unallocated_amount)}</strong> from {data.unallocated_payments} Paybill payment{data.unallocated_payments === 1 ? '' : 's'} is
            counted in the totals below but not yet assigned to a giver. <span className="font-medium underline">Allocate now</span>
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HandCoins} label="Giving this month" value={money(data.donations.this_month)} hint={`${money(data.donations.today)} today`} />
        <StatCard icon={CalendarDays} label="Giving this year" value={money(data.donations.this_year)} hint={`${money(data.donations.all_time)} all time`} />
        <StatCard icon={Users} label="Active members" value={data.members.active.toLocaleString()} hint={`${data.members.total} total · ${data.members.new_this_month} new this month`} />
        <StatCard icon={Building2} label="Branches" value={data.branches.active} hint={`${data.projects.ongoing} ongoing project${data.projects.ongoing === 1 ? '' : 's'}`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h2 className="font-semibold">Monthly giving</h2>
          <p className="mb-4 text-sm text-slate-500">Successful donations, last 12 months</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compactMoney} width={80} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: brandColor(50) }} />
                <Bar dataKey="total" fill={brandColor(600)} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Giving by type</h2>
          <p className="mb-4 text-sm text-slate-500">This year</p>
          {byType.length ? (
            <div style={{ height: Math.max(160, byType.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="type" tick={AXIS} tickLine={false} axisLine={false} width={130} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: brandColor(50) }} />
                  <Bar dataKey="total" fill={brandColor(600)} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">No donations yet this year.</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold">Recent donations</h2>
            <Link to="/donations" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.recent_donations.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-500">No donations yet.</li>}
            {data.recent_donations.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {d.member_name || d.giver_name || d.membership_number || d.phone_number || (d.unallocated ? 'Giver not yet known' : 'Anonymous')}
                    {d.unallocated && <span className="ml-2"><Badge tone="amber">Unallocated</Badge></span>}
                  </p>
                  <p className="text-xs text-slate-500">{d.donation_type_name} · {CHANNELS[d.channel]} · {dateTime(d.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{money(d.amount)}</p>
                  <Badge status={d.status}>{DONATION_STATUS[d.status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Last service</h2>
              <Link to="/attendance" className="text-sm font-medium text-brand-700 hover:underline">Attendance</Link>
            </div>
            {data.last_service ? (
              <Link to={`/attendance/${data.last_service.id}`} className="block">
                <p className="text-3xl font-semibold text-slate-900">{data.last_service.total}</p>
                <p className="text-sm text-slate-600">{data.last_service.members_present} members · {data.last_service.visitors} visitors</p>
                <p className="mt-1 text-xs text-slate-500">{data.last_service.name} · {date(data.last_service.date)}{data.last_service.branch_name && ` · ${data.last_service.branch_name}`}</p>
              </Link>
            ) : <p className="text-sm text-slate-500">No attendance recorded yet.</p>}
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Projects</h2>
              <Link to="/projects" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
            </div>
            {data.active_projects.length === 0 && <p className="text-sm text-slate-500">No active projects.</p>}
            <ul className="space-y-4">
              {data.active_projects.map((p) => (
                <li key={p.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium"><FolderKanban className="h-4 w-4 text-slate-400" />{p.name}</span>
                    <span className="text-slate-500">{Number(p.target_amount) > 0 ? `${Math.round((p.amount_raised / p.target_amount) * 100)}%` : ''}</span>
                  </div>
                  <Progress value={p.amount_raised} max={p.target_amount} />
                  <p className="mt-1 text-xs text-slate-500">{money(p.amount_raised)}{Number(p.target_amount) > 0 && ` of ${money(p.target_amount)}`}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Top branches <span className="text-sm font-normal text-slate-500">(this year)</span></h2>
            {data.top_branches.length === 0 && <p className="text-sm text-slate-500">No branches yet.</p>}
            <ul className="space-y-2">
              {data.top_branches.map((b) => (
                <li key={b.id} className="flex justify-between text-sm">
                  <span>{b.name} <span className="text-slate-400">· {b.member_count} members</span></span>
                  <span className="font-medium">{money(b.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
