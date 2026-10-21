import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, MessageSquare, Plus, Search } from 'lucide-react'
import MemberForm from '../../components/MemberForm'
import { Alert, Badge, PageHeader, Pagination, Select, StatCard, Table, type Column } from '../../components/ui'
import { downloadCsv } from '../../lib/api'
import { useApi, useDebounced, useOptions } from '../../lib/hooks'
import { MEMBER_STATUS, GENDERS, ago, money } from '../../lib/format'
import type { Branch, Member, MemberSummary, Page } from '../../types'
import { useCan } from '../../lib/access'

export default function Members() {
  const can = useCan()
  const navigate = useNavigate()
  const branches = useOptions<Branch>('/cms/branches/')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ branch: '', status: '', gender: '' })
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const params = { ...filters, search: useDebounced(search), page }
  const { data, loading, error, reload } = useApi<Page<Member>>('/cms/members/', params)
  const summary = useApi<MemberSummary>('/cms/members/summary/').data
  const giving = can('giving')

  const setFilter = (key: keyof typeof filters) => (value: string) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1) }

  const columns: Column<Member>[] = [
    { key: 'membership_number', label: 'Member No.', render: (m) => <span className="font-mono text-[13px]">{m.membership_number}</span> },
    { key: 'full_name', label: 'Name', render: (m) => (
      <span className="flex flex-col">
        <span className="font-semibold text-mk-forest">{m.full_name}</span>
        <span className="text-[13px] text-mk-muted">{m.phone_number || 'No phone'}</span>
      </span>
    ) },
    { key: 'branch_name', label: 'Branch', render: (m) => m.branch_name || '—' },
    { key: 'status', label: 'Status', render: (m) => <Badge status={m.status}>{MEMBER_STATUS[m.status]}</Badge> },
    { key: 'activity', label: giving ? 'Last gift · last at church' : 'Last at church', render: (m) => (
      <span className="flex flex-col text-[13px] text-mk-muted">
        {giving && <span>Gave {ago(m.last_gift_at) || 'never'}</span>}
        <span>Came {ago(m.last_attended) || 'not yet recorded'}</span>
      </span>
    ) },
    ...(giving ? [{ key: 'given_this_year', label: 'Given this year', className: 'text-right font-semibold tabular-nums',
      render: (m: Member) => money(m.given_this_year ?? 0) }] : []),
  ]

  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Your congregation's membership register."
        actions={<>
          <button className="btn-secondary" onClick={() => navigate('/sms', { state: {
            branches: filters.branch ? [Number(filters.branch)] : [],
            statuses: filters.status ? [filters.status] : ['active'],
            gender: filters.gender,
          } })}><MessageSquare className="h-4 w-4" /> Send SMS</button>
          <button className="btn-secondary" onClick={() => downloadCsv('/cms/members/export/', { ...filters, search }, 'members.csv')}><Download className="h-4 w-4" /> Export</button>
          {can('members', true) && <button className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add member</button>}
        </>}
      />
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Active members" value={summary.active.toLocaleString()} hint={`${summary.new_this_month} joined this month`} />
          {giving && summary.gave_this_month !== null && (
            <StatCard label="Gave this month" value={summary.gave_this_month.toLocaleString()}
              hint={summary.active ? `members, ${Math.round((summary.gave_this_month / summary.active) * 100)}% of active` : 'members'} />
          )}
          <StatCard label="Away 4+ weeks" value={summary.away.toLocaleString()} hint="worth a call or an SMS" />
          <StatCard label="Have no phone" value={summary.no_phone.toLocaleString()} hint="they get no receipts or SMS" />
        </div>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mk-muted" />
          <input className="input pl-9" placeholder="Search name, number, phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={filters.branch} onChange={setFilter('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="All branches" />
        <Select value={filters.status} onChange={setFilter('status')} options={MEMBER_STATUS} placeholder="All statuses" />
        <Select value={filters.gender} onChange={setFilter('gender')} options={GENDERS} placeholder="All genders" />
      </div>
      <Alert>{error?.message}</Alert>
      <Table columns={columns} rows={data?.results} loading={loading} empty="No members found." onRowClick={(m) => navigate(`/members/${m.id}`)} />
      <Pagination page={page} count={data?.count} onChange={setPage} />
      {adding && <MemberForm onClose={() => setAdding(false)} onSaved={(m) => { setAdding(false); reload(); navigate(`/members/${m.id}`) }} />}
    </>
  )
}
