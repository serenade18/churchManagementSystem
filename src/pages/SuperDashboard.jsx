import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, MessageSquare, ShieldCheck, Smartphone, UserCheck, Users, XCircle } from 'lucide-react'
import { Alert, Badge, PageHeader, Progress, Spinner, StatCard, Table } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useApi } from '../lib/hooks'
import { date, dateTime, money } from '../lib/format'

const CHECK = {
  ok: [CheckCircle2, 'text-emerald-600', 'green', 'OK'],
  warn: [AlertTriangle, 'text-amber-600', 'amber', 'Check'],
  error: [XCircle, 'text-red-600', 'red', 'Action needed'],
}
const STATUS = { active: ['green', 'Active'], disabled: ['slate', 'Disabled'], unverified: ['amber', 'Phone not verified'] }

function Panel({ title, action, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function Line({ label, value, tone }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className={`font-medium ${tone === 'bad' ? 'text-red-600' : 'text-slate-900'}`}>{value}</span>
    </div>
  )
}

/** System overview for super admins: accounts, activity, and the health of payments and SMS. */
export default function SuperDashboard() {
  const { user } = useAuth()
  const { data: d, loading, error } = useApi('/cms/super/overview/')

  if (error) return <Alert>{error.message}</Alert>
  if (loading && !d) return <div className="py-20"><Spinner className="mx-auto h-8 w-8" /></div>

  const problems = d.checks.filter((c) => c.state !== 'ok').length
  const maxBranch = Math.max(1, ...d.branches.map((b) => Number(b.total)))

  return (
    <>
      <PageHeader title="System overview" subtitle={`Super admin view for ${user.first_name || user.username}: accounts, activity and how payments and SMS are running.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Admin accounts" value={d.accounts.total} hint={`${d.accounts.superadmins} super admin${d.accounts.superadmins === 1 ? '' : 's'} · ${d.accounts.admins} admin${d.accounts.admins === 1 ? '' : 's'}`} />
        <StatCard icon={UserCheck} label="New signups (30 days)" value={d.accounts.signups_30d} hint={`${d.accounts.unverified} not verified · ${d.accounts.disabled} disabled`} />
        <StatCard icon={Smartphone} label="Paybill this month" value={money(d.payments.paybill_month.amount)} hint={`${d.payments.paybill_month.count} payments`} />
        <StatCard icon={problems ? AlertTriangle : ShieldCheck} label="System checks" value={problems ? `${problems} to review` : 'All good'} hint={`${d.checks.length} checks`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="System status" className="xl:col-span-2">
          <ul className="divide-y divide-slate-100">
            {d.checks.map((c) => {
              const [Icon, color, tone, label] = CHECK[c.state]
              return (
                <li key={c.key} className="flex items-start gap-3 py-2.5">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{c.label}</p>
                    <p className="text-xs text-slate-500">{c.detail}</p>
                  </div>
                  <Badge tone={tone}>{label}</Badge>
                </li>
              )
            })}
          </ul>
        </Panel>

        <div className="space-y-6">
          <Panel title="Payments">
            <Line label="Online payments (30 days)" value={`${d.payments.online_30d.success} paid · ${d.payments.online_30d.failed} failed`} />
            <Line label="Pending (30 days)" value={d.payments.online_30d.pending} tone={d.payments.online_30d.pending ? 'bad' : ''} />
            <Line label="Last Paybill payment received" value={d.payments.last_paybill_at ? dateTime(d.payments.last_paybill_at) : 'None yet'} />
            <Link to="/paybill" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">Open Paybill</Link>
          </Panel>
          <Panel title={<span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-slate-400" /> SMS this month</span>}>
            <Line label="Donation receipts sent" value={d.sms.receipts_sent} />
            <Line label="Receipts failed" value={d.sms.receipts_failed} tone={d.sms.receipts_failed ? 'bad' : ''} />
            <Line label="Givers with no phone" value={d.sms.receipts_no_phone} />
            <Line label="Bulk SMS" value={`${d.sms.bulk_campaigns} sends · ${d.sms.bulk_sent} delivered · ${d.sms.bulk_failed} failed`} />
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Recent sign-ins" action={<Link to="/users" className="text-sm font-medium text-brand-700 hover:underline">Manage admins</Link>}>
          <Table rows={d.recent_logins} empty="Nobody has signed in yet." columns={[
            { key: 'name', label: 'Name', render: (p) => <><p className="font-medium text-slate-900">{p.name}</p><p className="text-xs text-slate-500">{p.username}</p></> },
            { key: 'role', label: 'Role', render: (p) => <Badge tone={p.role === 'Super admin' ? 'purple' : 'blue'}>{p.role}</Badge> },
            { key: 'last_login', label: 'Last sign-in', render: (p) => dateTime(p.last_login) },
          ]} />
        </Panel>
        <Panel title="Newest accounts">
          <Table rows={d.recent_signups} empty="No accounts yet." columns={[
            { key: 'name', label: 'Name', render: (p) => <><p className="font-medium text-slate-900">{p.name}</p><p className="text-xs text-slate-500">{p.username}</p></> },
            { key: 'role', label: 'Role', render: (p) => <Badge tone={p.role === 'Super admin' ? 'purple' : 'blue'}>{p.role}</Badge> },
            { key: 'status', label: 'Status', render: (p) => <Badge tone={STATUS[p.status][0]}>{STATUS[p.status][1]}</Badge> },
            { key: 'date_joined', label: 'Created', render: (p) => date(p.date_joined) },
          ]} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Donations recorded by admins (this month)">
          {d.activity.length ? (
            <ul className="space-y-2">
              {d.activity.map((a) => (
                <li key={a.username} className="flex justify-between text-sm">
                  <span className="font-medium">{a.username}</span>
                  <span className="text-slate-600">{a.count} record{a.count === 1 ? '' : 's'} · {money(a.total)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">No cash, bank or cheque donations recorded this month.</p>}
        </Panel>
        <Panel title="Giving by branch (this month)" action={<span className="text-xs text-slate-500">{d.totals.members} members · {d.totals.branches} branches</span>}>
          {d.branches.length ? (
            <ul className="space-y-3">
              {d.branches.map((b) => (
                <li key={b.id}>
                  <div className="mb-1 flex justify-between text-sm"><span>{b.name} <span className="text-slate-400">· {b.member_count} members</span></span><span className="font-medium">{money(b.total)}</span></div>
                  <Progress value={b.total} max={maxBranch} />
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">No branches yet.</p>}
        </Panel>
      </div>
    </>
  )
}
