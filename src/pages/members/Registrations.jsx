import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, ExternalLink, Search, UserCheck, UserPlus } from 'lucide-react'
import { Alert, Badge, Field, Modal, PageHeader, Pagination, Select, Table } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi, useDebounced, useOptions } from '../../lib/hooks'
import { GENDERS, MARITAL, REGISTRATION_STATUS, date, dateTime } from '../../lib/format'

const TABS = [['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']]

function Detail({ label, children }) {
  if (!children) return null
  return <p className="text-sm"><span className="block text-xs text-slate-500">{label}</span>{children}</p>
}

/** Review one sign-up: create a member (or link to the one it matches), or reject it. */
function Review({ reg, onClose, onDone }) {
  const branches = useOptions('/cms/branches/')
  const pending = reg.status === 'pending'
  const [link, setLink] = useState(reg.possible_matches.find((m) => m.reason === 'Same phone number')?.id || '')
  const [form, setForm] = useState({
    membership_number: reg.suggested_number || '', branch: reg.branch || '',
    status: reg.kind === 'visitor' ? 'visitor' : 'active', notify: true,
  })
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action) => {
    setBusy(true)
    setError('')
    try { onDone(await action()) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const approve = () => run(() => api.post(`/cms/registrations/${reg.id}/approve/`, link
    ? { member: link, status: form.status, notify: form.notify }
    : { ...form, branch: form.branch || null }))
  const reject = () => run(() => api.post(`/cms/registrations/${reg.id}/reject/`, { note }))

  const footer = !pending ? <button className="btn-secondary" onClick={onClose}>Close</button>
    : rejecting
      ? <><button className="btn-secondary" onClick={() => setRejecting(false)}>Back</button><button className="btn-danger" onClick={reject} disabled={busy}>Reject sign-up</button></>
      : <><button className="btn-secondary mr-auto" onClick={() => setRejecting(true)}>Reject…</button>
          <button className="btn-primary" onClick={approve} disabled={busy}><UserCheck className="h-4 w-4" /> {busy ? 'Saving…' : link ? 'Link to member' : 'Approve as member'}</button></>

  return (
    <Modal open wide onClose={onClose} title={reg.full_name} footer={footer}>
      <Alert>{error}</Alert>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Badge status={reg.status}>{REGISTRATION_STATUS[reg.status]}</Badge>
        <span>{reg.kind === 'visitor' ? 'Visitor' : 'Wants to become a member'} · signed up {dateTime(reg.created_at)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Detail label="Phone">{reg.phone_number}</Detail>
        <Detail label="Email">{reg.email}</Detail>
        <Detail label="Gender">{GENDERS[reg.gender]}</Detail>
        <Detail label="Date of birth">{reg.date_of_birth && date(reg.date_of_birth)}</Detail>
        <Detail label="Marital status">{MARITAL[reg.marital_status]}</Detail>
        <Detail label="Branch chosen">{reg.branch_name}</Detail>
        <Detail label="Lives in">{reg.address}</Detail>
        <Detail label="Previous church">{reg.previous_church}</Detail>
      </div>
      {reg.message && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">“{reg.message}”</p>}

      {!pending && (
        <p className="mt-4 text-sm text-slate-600">
          {reg.status === 'approved'
            ? <>Approved by {reg.reviewed_by_name} on {dateTime(reg.reviewed_at)}{reg.member && <> · <Link className="font-medium text-brand-700 hover:underline" to={`/members/${reg.member}`}>member {reg.member_number}</Link></>}</>
            : <>Rejected by {reg.reviewed_by_name} on {dateTime(reg.reviewed_at)}{reg.review_note && `: ${reg.review_note}`}</>}
        </p>
      )}

      {pending && rejecting && (
        <Field label="Reason (for your records; nothing is sent)" className="mt-4">
          <input className="input" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Duplicate, test entry" />
        </Field>
      )}

      {pending && !rejecting && (
        <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
          {reg.possible_matches.length > 0 && (
            <div>
              <p className="label">Already a member?</p>
              <div className="space-y-1.5">
                {[{ id: '', full_name: 'No, create a new member' }, ...reg.possible_matches].map((m) => (
                  <label key={m.id || 'new'} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${link === m.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}>
                    <input type="radio" checked={link === m.id} onChange={() => setLink(m.id)} className="accent-[var(--color-primary)]" />
                    <span className="flex-1">{m.id ? <><span className="font-medium">{m.full_name}</span> · <span className="font-mono text-xs">{m.membership_number}</span>{m.branch && ` · ${m.branch}`}</> : m.full_name}</span>
                    {m.reason && <span className="text-xs text-amber-700">{m.reason}</span>}
                  </label>
                ))}
              </div>
              {link && <p className="mt-1 text-xs text-slate-500">Their record keeps what it has; only empty details (email, date of birth…) are filled in.</p>}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {!link && (
              <>
                <Field label="Membership number" hint="Suggested: next in your series.">
                  <input className="input font-mono" value={form.membership_number} onChange={(e) => setForm({ ...form, membership_number: e.target.value })} />
                </Field>
                <Field label="Branch">
                  <Select value={form.branch} onChange={(v) => setForm({ ...form, branch: v })} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Church-wide" />
                </Field>
              </>
            )}
            <Field label="Add as">
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={{ active: 'Member (active)', visitor: 'Visitor' }} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} className="accent-[var(--color-primary)]" />
            Send a welcome SMS{!link && form.status === 'active' ? ' with their membership number' : ''}
          </label>
        </div>
      )}
    </Modal>
  )
}

export default function Registrations() {
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState('')
  const { data, loading, error, reload } = useApi('/cms/registrations/', { status: tab, search: useDebounced(search), page })
  const link = `${window.location.origin}/register`

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* no clipboard */ }
  }

  const columns = [
    { key: 'created_at', label: 'Signed up', render: (r) => dateTime(r.created_at) },
    { key: 'full_name', label: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.full_name}</span> },
    { key: 'phone_number', label: 'Phone' },
    { key: 'kind', label: 'Type', render: (r) => (r.kind === 'visitor' ? 'Visitor' : 'Member') },
    { key: 'branch_name', label: 'Branch', render: (r) => r.branch_name || '—' },
    { key: 'possible_matches', label: '', render: (r) => (r.possible_matches.length ? <span className="text-xs text-amber-700">May already be a member</span> : null) },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{REGISTRATION_STATUS[r.status]}</Badge> },
  ]

  return (
    <>
      <PageHeader title="Registrations" subtitle="People who signed up on your public registration page. Approve them to add them to Members."
        actions={<>
          <a href="/register" target="_blank" rel="noreferrer" className="btn-secondary"><ExternalLink className="h-4 w-4" /> Open the form</a>
          <button className="btn-primary" onClick={copy}><Copy className="h-4 w-4" /> {copied ? 'Link copied' : 'Copy registration link'}</button>
        </>} />
      <div className="card mb-4 flex items-center gap-3 p-4 text-sm text-slate-600">
        <UserPlus className="h-5 w-5 shrink-0 text-brand-700" />
        <span>Share <span className="font-mono text-slate-900">{link}</span> in church announcements, on WhatsApp or as a QR code. Sign-ups wait here until you review them.</span>
      </div>
      <Alert tone="green">{notice}</Alert>
      <Alert>{error?.message}</Alert>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex border-b border-slate-200">
          {TABS.map(([k, label]) => (
            <button key={k || 'all'} onClick={() => { setTab(k); setPage(1) }}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search name or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>
      <Table columns={columns} rows={data?.results} loading={loading} onRowClick={setOpen}
        empty={tab === 'pending' ? 'No sign-ups waiting. Share your registration link to get started.' : 'Nothing here yet.'} />
      <Pagination page={page} count={data?.count} onChange={setPage} />
      {open && <Review reg={open} onClose={() => setOpen(null)} onDone={(updated) => {
        setOpen(null)
        setNotice(updated.status === 'approved' ? `${updated.full_name} is now member ${updated.member_number}.` : `${updated.full_name}'s sign-up was rejected.`)
        reload()
        window.dispatchEvent(new Event('cms:registrations-changed'))
      }} />}
    </>
  )
}
