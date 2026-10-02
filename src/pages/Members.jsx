import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, MessageSquare, Plus, Search } from 'lucide-react'
import MemberForm from '../components/MemberForm'
import { Alert, Badge, PageHeader, Pagination, Select, Table } from '../components/ui'
import { downloadCsv } from '../lib/api'
import { useApi, useDebounced, useOptions } from '../lib/hooks'
import { MEMBER_STATUS, GENDERS, money } from '../lib/format'

export default function Members() {
  const navigate = useNavigate()
  const branches = useOptions('/cms/branches/')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ branch: '', status: '', gender: '' })
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const params = { ...filters, search: useDebounced(search), page }
  const { data, loading, error, reload } = useApi('/cms/members/', params)

  const setFilter = (key) => (value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1) }

  const columns = [
    { key: 'membership_number', label: 'Member No.', render: (m) => <span className="font-mono text-xs">{m.membership_number}</span> },
    { key: 'full_name', label: 'Name', render: (m) => <span className="font-medium text-slate-900">{m.full_name}</span> },
    { key: 'phone_number', label: 'Phone', render: (m) => m.phone_number || '—' },
    { key: 'branch_name', label: 'Branch', render: (m) => m.branch_name || '—' },
    { key: 'status', label: 'Status', render: (m) => <Badge status={m.status}>{MEMBER_STATUS[m.status]}</Badge> },
    { key: 'total_given', label: 'Total given', className: 'text-right', render: (m) => money(m.total_given) },
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
          <button className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add member</button>
        </>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
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
