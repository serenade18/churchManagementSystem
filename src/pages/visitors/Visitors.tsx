import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, MessageSquare, Pencil, Plus, Repeat, Search, Trash2, UserCheck } from 'lucide-react'
import VisitorForm from '../../components/VisitorForm'
import { Alert, Badge, ConfirmDialog, Field, Modal, PageHeader, Pagination, Select, Spinner, StatCard, Table, type Column } from '../../components/ui'
import { api, downloadCsv, errorMessage } from '../../lib/api'
import { useCan } from '../../lib/access'
import { FOLLOW_UP, HOW_HEARD, SERVICE_TYPES, ago, date } from '../../lib/format'
import { useApi, useDebounced, useOptions } from '../../lib/hooks'
import type { Branch, Page, Visit, Visitor, VisitorSummary } from '../../types'

// Visitors: people who came but aren't members. Each service they're marked at (by an usher, or by
// scanning a check-in QR code with a number the church doesn't know) counts as a visit.

const CHECKED_IN_BY = { manual: 'Marked by an usher', qr: 'Scanned the QR code', sms: 'SMS link' }
const visitsLabel = (n: number) => (n === 0 ? 'No visits recorded' : n === 1 ? 'First visit' : `${n} visits`)

/** One visitor: their details, every visit, and what to do next. */
function VisitorPanel({ visitor, onClose, onChanged }: { visitor: Visitor; onClose: () => void; onChanged: (notice: string) => void }) {
  const can = useCan()
  const navigate = useNavigate()
  const visits = useApi<Visit[]>(`/cms/visitors/${visitor.id}/visits/`)
  const [editing, setEditing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [number, setNumber] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const canEdit = can('members', true)

  const run = async (action: () => Promise<string>) => {
    setBusy(true); setError('')
    try { onChanged(await action()) } catch (e) { setError(errorMessage(e)); setBusy(false) }
  }
  const join = () => run(async () => {
    const res = await api.post<{ membership_number: string }>(`/cms/visitors/${visitor.id}/become-member/`, { membership_number: number })
    return `${visitor.full_name} is now member ${res.membership_number}.`
  })
  const remove = () => run(async () => { await api.del(`/cms/visitors/${visitor.id}/`); return `${visitor.full_name} was removed.` })

  if (editing) return <VisitorForm visitor={visitor} onClose={() => setEditing(false)} onSaved={() => onChanged('Visitor saved.')} />

  const details: [string, string | null | undefined][] = [
    ['Phone', visitor.phone_number], ['Email', visitor.email], ['Branch', visitor.branch_name],
    ['First visit', visitor.first_visit && date(visitor.first_visit)],
    ['How they heard of us', visitor.how_heard && HOW_HEARD[visitor.how_heard]], ['Invited by', visitor.invited_by_name],
    ['Address', visitor.address],
  ]
  return (
    <Modal open onClose={onClose} title={visitor.full_name} wide
      footer={<>
        {canEdit && <button className="btn-secondary mr-auto text-danger" onClick={() => setDeleting(true)} aria-label="Remove visitor"><Trash2 className="h-4 w-4" /></button>}
        {visitor.phone_number && can('sms', true) && (
          <button className="btn-secondary" onClick={() => navigate('/sms', { state: { members: [visitor] } })}><MessageSquare className="h-4 w-4" /> SMS</button>
        )}
        {canEdit && <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</button>}
        {canEdit && <button className="btn-primary" onClick={() => setJoining(true)}><UserCheck className="h-4 w-4" /> Become a member</button>}
      </>}>
      <Alert>{error}</Alert>
      <p className="mb-4 flex flex-wrap items-center gap-2 text-[15px] text-mk-muted">
        <span className="font-mono text-sm">{visitor.membership_number}</span>
        {visitor.follow_up && <Badge status={visitor.follow_up}>{FOLLOW_UP[visitor.follow_up]}</Badge>}
        {visitor.visits > 1 && <Badge tone="blue">Came back</Badge>}
      </p>
      <dl className="mb-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {details.filter(([, v]) => v).map(([label, value]) => (
          <div key={label}><dt className="text-[13px] text-mk-muted">{label}</dt><dd className="text-[15px] text-mk-forest">{value}</dd></div>
        ))}
      </dl>
      {visitor.notes && <p className="mb-5 whitespace-pre-line rounded-xl bg-mk-ivory px-4 py-3 text-sm text-mk-slate">{visitor.notes}</p>}

      <h3 className="mb-2 font-semibold text-mk-forest">Visits</h3>
      {visits.loading && !visits.data ? <Spinner className="mx-auto my-4" /> : visits.data?.length ? (
        <ol className="flex flex-col divide-y divide-mk-mist rounded-xl border border-mk-border">
          {visits.data.map((v) => (
            <li key={v.service}>
              <button className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-mk-ivory" onClick={() => navigate(`/attendance/${v.service}`)}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-mk-forest">{v.name}</span>
                  <span className="block text-xs text-mk-muted">{SERVICE_TYPES[v.service_type] || v.service_type}{v.branch_name && ` · ${v.branch_name}`} · {CHECKED_IN_BY[v.method]}</span>
                </span>
                <span className="flex-none text-sm tabular-nums text-mk-slate">{date(v.date)}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : <p className="text-sm text-mk-muted">Not marked at any service yet. Mark them present on a service’s attendance list, or they can scan a check-in QR code.</p>}

      {joining && (
        <Modal open onClose={() => setJoining(false)} title={`Welcome ${visitor.first_name} as a member`}
          footer={<><button className="btn-secondary" onClick={() => setJoining(false)}>Cancel</button>
            <button className="btn-primary" onClick={join} disabled={busy}>{busy ? 'Saving…' : 'Make them a member'}</button></>}>
          <Alert>{error}</Alert>
          <p className="mb-4 text-[15px]">They become an active member with a membership number in your church’s series. Their visits and how they found you are kept.</p>
          <Field label="Membership number" hint="Leave empty for the next number."><input className="input font-mono" value={number} onChange={(e) => setNumber(e.target.value)} /></Field>
        </Modal>
      )}
      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} onConfirm={remove} busy={busy} title="Remove visitor"
        message={`Remove ${visitor.full_name} and their visits? This can’t be undone.`} />
    </Modal>
  )
}

export default function Visitors() {
  const can = useCan()
  const branches = useOptions<Branch>('/cms/branches/')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ branch: '', follow_up: '', repeat: '', stage: '' })
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<Visitor | null>(null)
  const [notice, setNotice] = useState('')
  const params = { ...filters, search: useDebounced(search), page }
  const { data, loading, error, reload } = useApi<Page<Visitor>>('/cms/visitors/', params)
  const summary = useApi<VisitorSummary>('/cms/visitors/summary/')
  const joined = filters.stage === 'joined'

  const setFilter = (key: keyof typeof filters) => (value: string) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1) }
  const changed = (text: string) => { setOpen(null); setAdding(false); setNotice(text); reload(); summary.reload() }

  const columns: Column<Visitor>[] = [
    { key: 'full_name', label: 'Name', render: (v) => (
      <span className="flex flex-col">
        <span className="font-semibold text-mk-forest">{v.full_name}</span>
        <span className="text-[13px] text-mk-muted">{v.phone_number || 'No phone'} · <span className="font-mono">{v.membership_number}</span></span>
      </span>
    ) },
    { key: 'first_visit', label: 'First came', render: (v) => (v.first_visit ? date(v.first_visit) : '—') },
    { key: 'visits', label: 'Visits', render: (v) => (
      <span className="flex flex-col text-[13px]">
        <span className="flex items-center gap-1.5 font-medium text-mk-forest">{v.visits > 1 && <Repeat className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />}{visitsLabel(v.visits)}</span>
        {v.last_visit && <span className="text-mk-muted">Last came {ago(v.last_visit)}</span>}
      </span>
    ) },
    { key: 'how_heard', label: 'Found us through', render: (v) => (v.invited_by_name ? `Invited by ${v.invited_by_name}` : v.how_heard ? HOW_HEARD[v.how_heard] : '—') },
    { key: 'branch_name', label: 'Branch', render: (v) => v.branch_name || '—' },
    joined
      ? { key: 'date_joined', label: 'Became a member', render: (v) => (v.date_joined ? date(v.date_joined) : '—') }
      : { key: 'follow_up', label: 'Follow-up', render: (v) => (v.follow_up ? <Badge status={v.follow_up}>{FOLLOW_UP[v.follow_up]}</Badge> : '—') },
  ]

  return (
    <>
      <PageHeader
        title="Visitors"
        subtitle="Everyone who has come but isn’t a member yet, and how often they come back."
        actions={<>
          <button className="btn-secondary" onClick={() => downloadCsv('/cms/visitors/export/', { ...filters, search }, 'visitors.csv')}><Download className="h-4 w-4" /> Export</button>
          {can('members', true) && <button className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add visitor</button>}
        </>}
      />
      {summary.data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Visitors" value={summary.data.total.toLocaleString()} hint={`${summary.data.new_this_month} first came this month`} />
          <StatCard label="Came back" value={summary.data.repeat.toLocaleString()} hint="visited more than once" />
          <StatCard label="To follow up" value={summary.data.to_follow_up.toLocaleString()} hint="not contacted yet" />
          <StatCard label="Became members" value={summary.data.joined_this_year.toLocaleString()} hint="this year" />
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {([['', 'Visitors'], ['joined', 'Became members']] as const).map(([value, label]) => (
          <button key={value} onClick={() => setFilter('stage')(value)}
            className={`rounded-full border px-3 py-1 text-sm ${filters.stage === value ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700' : 'border-mk-border text-mk-slate hover:bg-mk-ivory'}`}>{label}</button>
        ))}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mk-muted" />
          <input className="input pl-9" placeholder="Search name, phone…" aria-label="Search visitors" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={filters.branch} onChange={setFilter('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="All branches" />
        <Select value={filters.repeat} onChange={setFilter('repeat')} options={{ true: 'Came back', false: 'Came once' }} placeholder="Any number of visits" />
        {!joined && <Select value={filters.follow_up} onChange={setFilter('follow_up')} options={FOLLOW_UP} placeholder="Any follow-up" />}
      </div>
      <Alert tone="green">{notice}</Alert>
      <Alert>{error?.message}</Alert>
      <Table columns={columns} rows={data?.results} loading={loading} onRowClick={joined ? undefined : setOpen}
        empty={joined ? 'No visitors have become members yet.' : 'No visitors yet. Add one here, mark them on a service, or they can scan a check-in QR code.'} />
      <Pagination page={page} count={data?.count} onChange={setPage} />
      {adding && <VisitorForm onClose={() => setAdding(false)} onSaved={(v) => changed(`${v.full_name} added as visitor ${v.membership_number}.`)} />}
      {open && <VisitorPanel visitor={open} onClose={() => setOpen(null)} onChanged={changed} />}
    </>
  )
}
