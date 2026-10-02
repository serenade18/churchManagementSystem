import { useState } from 'react'
import { Download, Plus, Printer, Search, Trash2 } from 'lucide-react'
import DonationForm, { ReceiptSmsBadge } from '../../components/DonationForm'
import { Alert, Badge, ConfirmDialog, PageHeader, Pagination, Select, StatCard, Table } from '../../components/ui'
import { api, downloadCsv } from '../../lib/api'
import { useApi, useDebounced, useOptions } from '../../lib/hooks'
import { CHANNELS, DONATION_STATUS, DONATION_TYPES, MPESA_CHANNELS, dateTime, money } from '../../lib/format'

const EMPTY_FILTERS = { status: '', channel: '', donation_type: '', branch: '', project: '', date_from: '', date_to: '' }

export default function Donations() {
  const branches = useOptions('/cms/branches/')
  const projects = useOptions('/cms/projects/')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null) // null | 'new' | donation
  const [deleting, setDeleting] = useState(null)
  const [actionError, setActionError] = useState('')
  const filterParams = { ...filters, search: useDebounced(search) }
  const { data, loading, error, reload } = useApi('/cms/donations/', { ...filterParams, page })
  const summary = useApi('/cms/donations/summary/', filterParams)

  const setFilter = (key) => (value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1) }
  const refresh = () => { reload(); summary.reload() }

  const remove = async () => {
    try {
      await api.del(`/cms/donations/${deleting.id}/`)
      refresh()
    } catch (e) {
      setActionError(e.message)
    }
    setDeleting(null)
  }

  const columns = [
    { key: 'created_at', label: 'Date', render: (d) => dateTime(d.created_at) },
    { key: 'member', label: 'Giver', render: (d) => (
      <div><p className="font-medium text-slate-900">{d.member_name || d.membership_number || 'Anonymous'}</p>
        <p className="text-xs text-slate-500">{d.member_name ? d.membership_number : d.phone_number}</p></div>
    ) },
    { key: 'donation_type', label: 'Type', render: (d) => <>{DONATION_TYPES[d.donation_type] || d.donation_type}{d.project_name && <p className="text-xs text-slate-500">{d.project_name}</p>}</> },
    { key: 'branch_name', label: 'Branch', render: (d) => d.branch_name || '—' },
    { key: 'channel', label: 'Channel', render: (d) => <>{CHANNELS[d.channel]}{d.receipt && <p className="font-mono text-xs text-slate-500">{d.receipt}</p>}</> },
    { key: 'status', label: 'Status', render: (d) => <Badge status={d.status}>{DONATION_STATUS[d.status]}</Badge> },
    { key: 'receipt_sms_status', label: 'SMS', render: (d) => d.status === 'success' ? <ReceiptSmsBadge donation={d} /> : '—' },
    { key: 'amount', label: 'Amount', className: 'text-right font-medium', render: (d) => money(d.amount) },
    { key: 'actions', label: '', render: (d) => (
      <div className="flex justify-end gap-1">
        {d.status === 'success' && (
          <a href={`/print/receipt/${d.id}`} target="_blank" rel="noreferrer" title="Print receipt" aria-label="Print receipt"
            className="rounded p-1 text-slate-400 hover:bg-brand-50 hover:text-brand-700" onClick={(e) => e.stopPropagation()}>
            <Printer className="h-4 w-4" />
          </a>
        )}
        {!MPESA_CHANNELS.includes(d.channel) && (
          <button className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete donation"
            onClick={(e) => { e.stopPropagation(); setDeleting(d) }}><Trash2 className="h-4 w-4" /></button>
        )}
      </div>
    ) },
  ]

  const s = summary.data
  return (
    <>
      <PageHeader
        title="Donations"
        subtitle="M-PESA giving is recorded automatically. Record cash, bank and cheque giving here."
        actions={<>
          <button className="btn-secondary" onClick={() => downloadCsv('/cms/donations/export/', filterParams, 'donations.csv')}><Download className="h-4 w-4" /> Export</button>
          <button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Record donation</button>
        </>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total received (filtered)" value={money(s?.total)} hint={`${s?.count ?? 0} successful donation${s?.count === 1 ? '' : 's'}`} />
        <StatCard label="Top type" value={s?.by_type?.[0] ? DONATION_TYPES[s.by_type[0].donation_type] : '—'} hint={s?.by_type?.[0] && money(s.by_type[0].total)} />
        <StatCard label="By channel" value={s?.by_channel?.[0] ? CHANNELS[s.by_channel[0].channel] : '—'}
          hint={s?.by_channel?.map((c) => `${CHANNELS[c.channel]} ${money(c.total)}`).join(' · ')} />
      </div>

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search member, phone, receipt…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <input className="input" type="date" value={filters.date_from} onChange={(e) => setFilter('date_from')(e.target.value)} aria-label="From date" />
        <input className="input" type="date" value={filters.date_to} onChange={(e) => setFilter('date_to')(e.target.value)} aria-label="To date" />
        <Select value={filters.donation_type} onChange={setFilter('donation_type')} options={DONATION_TYPES} placeholder="All types" />
        <Select value={filters.status} onChange={setFilter('status')} options={DONATION_STATUS} placeholder="All statuses" />
        <Select value={filters.channel} onChange={setFilter('channel')} options={CHANNELS} placeholder="All channels" />
        <Select value={filters.branch} onChange={setFilter('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="All branches" />
        <Select value={filters.project} onChange={setFilter('project')} options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="All projects" />
        <button className="btn-secondary" onClick={() => { setFilters(EMPTY_FILTERS); setSearch(''); setPage(1) }}>Clear filters</button>
      </div>

      <Alert>{error?.message || actionError}</Alert>
      <Table columns={columns} rows={data?.results} loading={loading} empty="No donations match these filters." onRowClick={setEditing} />
      <Pagination page={page} count={data?.count} onChange={setPage} />

      {editing && <DonationForm donation={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh() }} onResent={(d) => { setEditing(d); reload() }} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete donation"
        message={deleting && `Delete this ${money(deleting.amount)} ${CHANNELS[deleting.channel]} donation? This cannot be undone.`} />
    </>
  )
}
