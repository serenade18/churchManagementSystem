import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { type LucideIcon, AlertTriangle, CheckCircle2, LogIn, MonitorPlay, ShieldCheck, UserCheck, Users, XCircle } from 'lucide-react'
import { Alert, Badge, PageHeader, Spinner, StatCard, Table } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { api, errorMessage } from '../../lib/api'
import { useApi } from '../../lib/hooks'
import { branding } from '../../lib/theme'
import { date, dateTime } from '../../lib/format'
import type { AccountStatus, CheckState, SuperOverview, Tone } from '../../types'

/** Super admins offer (or stop offering) "Explore the demo" on the sign-in page. */
function DemoSwitch() {
  const [enabled, setEnabled] = useState(Boolean(branding.raw?.demo_enabled))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toggle = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.patch<{ demo_enabled: boolean }>('/cms/demo/', { enabled: !enabled })
      setEnabled(res.demo_enabled)
      if (branding.raw) branding.raw.demo_enabled = res.demo_enabled
    } catch (e) {
      setError(errorMessage(e))
    }
    setBusy(false)
  }
  return (
    <div className="card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><MonitorPlay /></span>
      <div className="flex-1 text-sm">
        <p className="font-semibold text-slate-900">Demo mode <Badge tone={enabled ? 'green' : 'slate'}>{enabled ? 'On' : 'Off'}</Badge></p>
        <p className="mt-1 text-slate-600">
          When on, the sign-in page offers "Explore the demo": visitors see the whole app filled with built-in sample data,
          view only. It runs in their browser and never shows or changes your real members and giving.
        </p>
        {error && <p className="mt-1 text-red-600">{error}</p>}
      </div>
      <button className={enabled ? 'btn-secondary' : 'btn-primary'} onClick={toggle} disabled={busy}>
        {busy ? 'Saving…' : enabled ? 'Turn demo off' : 'Turn demo on'}
      </button>
    </div>
  )
}

const CHECK: Record<CheckState, [LucideIcon, string, Tone, string]> = {
  ok: [CheckCircle2, 'text-emerald-600', 'green', 'OK'],
  warn: [AlertTriangle, 'text-amber-600', 'amber', 'Check'],
  error: [XCircle, 'text-red-600', 'red', 'Action needed'],
}
const STATUS: Record<AccountStatus, [Tone, string]> = { active: ['green', 'Active'], disabled: ['slate', 'Disabled'], unverified: ['amber', 'Phone not verified'] }

function Panel({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
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

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  )
}

/** System overview for super admins: admin accounts and system health. Church data stays on the admin dashboard. */
export default function SuperDashboard() {
  const { user } = useAuth()
  const { data: d, error } = useApi<SuperOverview>('/cms/super/overview/')

  if (error) return <Alert>{error.message}</Alert>
  if (!d) return <div className="py-20"><Spinner className="mx-auto h-8 w-8" /></div>

  const a = d.accounts
  const problems = d.checks.filter((c) => c.state !== 'ok').length

  return (
    <>
      <PageHeader title="System overview" subtitle={`Super admin view for ${user?.first_name || user?.username}: admin accounts and system health.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Admin accounts" value={a.total} hint={`${a.superadmins} super admin${a.superadmins === 1 ? '' : 's'} · ${a.admins} admin${a.admins === 1 ? '' : 's'}`} />
        <StatCard icon={LogIn} label="Signed in (30 days)" value={a.signed_in_30d} hint={`of ${a.active} active account${a.active === 1 ? '' : 's'}`} />
        <StatCard icon={UserCheck} label="New signups (30 days)" value={a.signups_30d} hint={`${a.unverified} not verified`} />
        <StatCard icon={problems ? AlertTriangle : ShieldCheck} label="System checks" value={problems ? `${problems} to review` : 'All good'} hint={`${d.checks.length} checks`} />
      </div>

      <DemoSwitch />

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

        <Panel title="Accounts" action={<Link to="/users" className="text-sm font-medium text-brand-700 hover:underline">Manage admins</Link>}>
          <Line label="Super admins" value={a.superadmins} />
          <Line label="Admins" value={a.admins} />
          <Line label="Active" value={a.active} />
          <Line label="Disabled" value={a.disabled} />
          <Line label="Phone not verified" value={a.unverified} />
          <p className="mt-3 text-xs text-slate-500">Disable accounts that are no longer needed, and remove unfinished signups you don't recognise.</p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Recent sign-ins">
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
    </>
  )
}
