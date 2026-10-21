import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, MessageSquare, Pencil, Printer, Trash2 } from 'lucide-react'
import MemberForm from '../../components/MemberForm'
import { Alert, Badge, ConfirmDialog, Field, Modal, Pagination, Spinner, StatCard, Table } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useApi } from '../../lib/hooks'
import { CHANNELS, DONATION_STATUS, GENDERS, MARITAL, MEMBER_STATUS, ago, date, dateTime, money, today } from '../../lib/format'
import type { AttendanceSummary, Donation, Member, Page } from '../../types'
import { useCan } from '../../lib/access'

const SUNDAY = { came: 'came', missed: 'missed', none: 'no service recorded' }

export default function MemberDetail() {
  const can = useCan()
  const { id } = useParams()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [statementOpen, setStatementOpen] = useState(false)
  const thisYear = new Date().getFullYear()
  const [period, setPeriod] = useState({ date_from: `${thisYear}-01-01`, date_to: today() })
  const { data: member, error, reload } = useApi<Member>(`/cms/members/${id}/`)
  const seesGiving = can('giving')
  const donations = useApi<Page<Donation>>(seesGiving ? `/cms/members/${id}/donations/` : null, { page })
  const attendance = useApi<AttendanceSummary>(can('attendance') ? `/cms/members/${id}/attendance-summary/` : null)

  if (error) return <Alert>{error.message}</Alert>
  if (!member) return <div className="py-20"><Spinner className="mx-auto h-8 w-8" /></div>

  const remove = async () => {
    setBusy(true)
    try {
      await api.del(`/cms/members/${id}/`)
      navigate('/members')
    } catch (e) {
      setDeleteError(errorMessage(e))
      setBusy(false)
      setDeleting(false)
    }
  }

  const details = [
    ['Phone', member.phone_number], ['Email', member.email], ['National ID', member.national_id],
    ['Gender', member.gender && GENDERS[member.gender]], ['Date of birth', member.date_of_birth && date(member.date_of_birth)],
    ['Marital status', member.marital_status && MARITAL[member.marital_status]], ['Branch', member.branch_name],
    ['Date joined', member.date_joined && date(member.date_joined)], ['Address', member.address],
    ['Baptized', member.is_baptized ? 'Yes' : 'No'], ['Confirmed', member.is_confirmed ? 'Yes' : 'No'],
  ]

  return (
    <>
      <Link to="/members" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-mk-muted hover:text-mk-forest"><ArrowLeft className="h-4 w-4" /> Members</Link>
      <Alert>{deleteError}</Alert>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-brand-50 font-display text-lg font-semibold text-brand-700">
            {member.first_name[0]}{member.last_name[0]}
          </span>
          <div>
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-mk-forest sm:text-[34px]">{member.full_name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[15px] text-mk-muted">
              <span className="font-mono text-sm">{member.membership_number}</span>
              {member.branch_name && <span>· {member.branch_name}</span>}
              <Badge status={member.status}>{MEMBER_STATUS[member.status]}</Badge>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {member.phone_number && can('sms', true) && (
            <button className="btn-secondary" onClick={() => navigate('/sms', { state: { members: [member] } })}><MessageSquare className="h-4 w-4" /> SMS</button>
          )}
          {seesGiving && <button className="btn-secondary" onClick={() => setStatementOpen(true)}><FileText className="h-4 w-4" /> Giving statement</button>}
          {can('members', true) && <>
            <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</button>
            <button className="btn-secondary text-danger" onClick={() => setDeleting(true)}><Trash2 className="h-4 w-4" /> Delete</button>
          </>}
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {seesGiving && (
          <section aria-labelledby="giving-title" className="card flex flex-col gap-4 p-6">
            <h2 id="giving-title" className="font-display text-xl font-semibold text-mk-forest">Giving</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="This year" value={money(member.given_this_year ?? 0)} />
              <StatCard label="All time" value={money(member.total_given)} />
            </div>
            <p className="text-sm text-mk-muted">{member.last_gift_at ? `Last gift ${ago(member.last_gift_at)}.` : 'No gifts recorded yet.'}</p>
          </section>
        )}
        {can('attendance') && (
          <section aria-labelledby="att-title" className="card flex flex-col gap-4 p-6">
            <h2 id="att-title" className="font-display text-xl font-semibold text-mk-forest">At church</h2>
            {attendance.data?.sundays && (
              <ol aria-label="Last 12 Sundays" className="flex flex-wrap gap-2">
                {attendance.data.sundays.map((d) => (
                  <li key={d.date} title={`${date(d.date)}: ${SUNDAY[d.state]}`} aria-label={`${date(d.date)}: ${SUNDAY[d.state]}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${d.state === 'came'
                      ? 'bg-brand-600 text-white' : d.state === 'missed' ? 'border-2 border-mk-border text-mk-muted' : 'border border-dashed border-mk-border text-mk-border'}`}>
                    {d.state === 'came' ? '✓' : new Date(d.date).getDate()}
                  </li>
                ))}
              </ol>
            )}
            <p className="text-sm text-mk-muted">
              {attendance.data?.rate != null
                ? <><span className="font-semibold text-mk-forest">{attendance.data.rate}%</span> of services in the last 90 days ({attendance.data.attended_last_90_days} of {attendance.data.services_last_90_days}). </>
                : 'No services recorded in the last 90 days. '}
              Last here: {attendance.data?.last_attended ? `${date(attendance.data.last_attended)} (${ago(attendance.data.last_attended)})` : 'never recorded'}.
            </p>
            {attendance.data?.sundays && <p className="text-[13px] text-mk-muted">Last 12 Sundays: ✓ came · number: missed · dashed: no service recorded.</p>}
          </section>
        )}
      </div>

      <section aria-labelledby="details-title" className="card mb-6 p-6">
        <h2 id="details-title" className="mb-4 font-display text-xl font-semibold text-mk-forest">Details</h2>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[13px] text-mk-muted">{label}</dt>
              <dd className="text-[15px] text-mk-forest">{value || '—'}</dd>
            </div>
          ))}
        </dl>
        {member.notes && <p className="mt-4 rounded-xl bg-mk-ivory p-3 text-sm text-mk-slate">{member.notes}</p>}
      </section>

      {seesGiving && <>
      <h2 className="mb-3 font-display text-xl font-semibold text-mk-forest">Giving history</h2>
      <Table
        loading={donations.loading}
        rows={donations.data?.results}
        empty="No donations recorded for this member yet."
        columns={[
          { key: 'created_at', label: 'Date', render: (d) => dateTime(d.created_at) },
          { key: 'donation_type', label: 'Type', render: (d) => d.donation_type_name },
          { key: 'project_name', label: 'Project', render: (d) => d.project_name || '—' },
          { key: 'channel', label: 'Channel', render: (d) => CHANNELS[d.channel] },
          { key: 'receipt', label: 'Receipt / Ref', render: (d) => d.receipt || '—' },
          { key: 'status', label: 'Status', render: (d) => <Badge status={d.status}>{DONATION_STATUS[d.status]}</Badge> },
          { key: 'amount', label: 'Amount', className: 'text-right', render: (d) => money(d.amount) },
          { key: 'print', label: '', render: (d) => d.status === 'success' && (
            <a href={`/print/receipt/${d.id}`} target="_blank" rel="noreferrer" title="Print receipt" aria-label="Print receipt"
              className="inline-flex rounded p-1 text-mk-muted hover:bg-brand-50 hover:text-brand-700"><Printer className="h-4 w-4" /></a>
          ) },
        ]}
      />
      <Pagination page={page} count={donations.data?.count} onChange={setPage} />
      </>}

      {editing && <MemberForm member={member} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
      <Modal open={statementOpen} onClose={() => setStatementOpen(false)} title="Giving statement"
        footer={<>
          <button className="btn-secondary" onClick={() => setStatementOpen(false)}>Cancel</button>
          <a className="btn-primary" target="_blank" rel="noreferrer" onClick={() => setStatementOpen(false)}
            href={`/print/statement/${id}?date_from=${period.date_from}&date_to=${period.date_to}`}><Printer className="h-4 w-4" /> Open statement</a>
        </>}>
        <div className="mb-3 flex flex-wrap gap-2">
          {[[`${thisYear}-01-01`, today(), 'This year'], [`${thisYear - 1}-01-01`, `${thisYear - 1}-12-31`, 'Last year']].map(([from, to, label]) => (
            <button key={label} type="button" onClick={() => setPeriod({ date_from: from, date_to: to })}
              className={`rounded-full border px-3 py-1 text-sm ${period.date_from === from && period.date_to === to ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-mk-border text-mk-slate hover:bg-mk-ivory'}`}>{label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><input className="input" type="date" value={period.date_from} onChange={(e) => setPeriod({ ...period, date_from: e.target.value })} /></Field>
          <Field label="To"><input className="input" type="date" value={period.date_to} onChange={(e) => setPeriod({ ...period, date_to: e.target.value })} /></Field>
        </div>
      </Modal>
      <ConfirmDialog open={deleting} busy={busy} onClose={() => setDeleting(false)} onConfirm={remove} title="Delete member"
        message={`Delete ${member.full_name}? Their donation records are kept but will no longer be linked to them.`} />
    </>
  )
}
