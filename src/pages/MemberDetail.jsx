import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import MemberForm from '../components/MemberForm'
import { Alert, Badge, ConfirmDialog, Pagination, Spinner, Table } from '../components/ui'
import { api } from '../lib/api'
import { useApi } from '../lib/hooks'
import { CHANNELS, DONATION_STATUS, DONATION_TYPES, GENDERS, MARITAL, MEMBER_STATUS, date, dateTime, money } from '../lib/format'

export default function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const { data: member, error, reload } = useApi(`/cms/members/${id}/`)
  const donations = useApi(`/cms/members/${id}/donations/`, { page })

  if (error) return <Alert>{error.message}</Alert>
  if (!member) return <div className="py-20"><Spinner className="mx-auto h-8 w-8" /></div>

  const remove = async () => {
    setBusy(true)
    try {
      await api.del(`/cms/members/${id}/`)
      navigate('/members')
    } catch (e) {
      setDeleteError(e.message)
      setBusy(false)
      setDeleting(false)
    }
  }

  const details = [
    ['Phone', member.phone_number], ['Email', member.email], ['National ID', member.national_id],
    ['Gender', GENDERS[member.gender]], ['Date of birth', member.date_of_birth && date(member.date_of_birth)],
    ['Marital status', MARITAL[member.marital_status]], ['Branch', member.branch_name],
    ['Date joined', member.date_joined && date(member.date_joined)], ['Address', member.address],
    ['Baptized', member.is_baptized ? 'Yes' : 'No'], ['Confirmed', member.is_confirmed ? 'Yes' : 'No'],
  ]

  return (
    <>
      <Link to="/members" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Members</Link>
      <Alert>{deleteError}</Alert>
      <div className="card mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800">
              {member.first_name[0]}{member.last_name[0]}
            </span>
            <div>
              <h1 className="text-xl font-semibold">{member.full_name}</h1>
              <p className="text-sm text-slate-500">Member No. <span className="font-mono">{member.membership_number}</span> · <Badge status={member.status}>{MEMBER_STATUS[member.status]}</Badge></p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</button>
            <button className="btn-secondary text-red-600" onClick={() => setDeleting(true)}><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
        </div>
        <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-brand-50 p-3">
            <dt className="text-xs text-brand-700">Total given</dt>
            <dd className="text-lg font-semibold text-brand-900">{money(member.total_given)}</dd>
          </div>
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-sm">{value || '—'}</dd>
            </div>
          ))}
        </dl>
        {member.notes && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{member.notes}</p>}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Giving history</h2>
      <Table
        loading={donations.loading}
        rows={donations.data?.results}
        empty="No donations recorded for this member yet."
        columns={[
          { key: 'created_at', label: 'Date', render: (d) => dateTime(d.created_at) },
          { key: 'donation_type', label: 'Type', render: (d) => DONATION_TYPES[d.donation_type] || d.donation_type },
          { key: 'project_name', label: 'Project', render: (d) => d.project_name || '—' },
          { key: 'channel', label: 'Channel', render: (d) => CHANNELS[d.channel] },
          { key: 'receipt', label: 'Receipt / Ref', render: (d) => d.receipt || '—' },
          { key: 'status', label: 'Status', render: (d) => <Badge status={d.status}>{DONATION_STATUS[d.status]}</Badge> },
          { key: 'amount', label: 'Amount', className: 'text-right', render: (d) => money(d.amount) },
        ]}
      />
      <Pagination page={page} count={donations.data?.count} onChange={setPage} />

      {editing && <MemberForm member={member} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
      <ConfirmDialog open={deleting} busy={busy} onClose={() => setDeleting(false)} onConfirm={remove} title="Delete member"
        message={`Delete ${member.full_name}? Their donation records are kept but will no longer be linked to them.`} />
    </>
  )
}
