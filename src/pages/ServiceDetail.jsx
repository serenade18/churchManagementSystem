import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Download, Pencil, Search, Trash2, UserCheck } from 'lucide-react'
import ServiceForm from '../components/ServiceForm'
import { Alert, ConfirmDialog, Spinner } from '../components/ui'
import { api, downloadCsv } from '../lib/api'
import { useApi, useDebounced } from '../lib/hooks'
import { SERVICE_TYPES, date } from '../lib/format'

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export default function ServiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: service, error, reload } = useApi(`/cms/services/${id}/`)
  const [showAll, setShowAll] = useState(false)
  const roster = useApi(`/cms/services/${id}/roster/`, { all: showAll ? 'true' : '' })
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const term = useDebounced(search, 150).toLowerCase()
  const [checkIn, setCheckIn] = useState('')
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(new Set())
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')

  const members = roster.data || []
  const presentCount = members.filter((m) => m.present).length
  const shown = useMemo(() => members.filter((m) =>
    (filter === 'all' || (filter === 'present') === m.present) &&
    (!term || m.full_name.toLowerCase().includes(term) || m.membership_number.toLowerCase().includes(term))), [members, filter, term])

  if (error) return <Alert>{error.message}</Alert>
  if (!service) return <div className="py-20"><Spinner className="mx-auto h-8 w-8" /></div>

  const setPresent = (ids, present) => roster.setData((list) => list.map((m) => (ids.includes(m.id) ? { ...m, present } : m)))

  const mark = async (ids, present) => {
    setPresent(ids, present) // optimistic
    setBusy((b) => new Set([...b, ...ids]))
    try {
      await api.post(`/cms/services/${id}/mark/`, { member_ids: ids, present })
      setActionError('')
    } catch (e) {
      setPresent(ids, !present)
      setActionError(e.message)
    } finally {
      setBusy((b) => new Set([...b].filter((x) => !ids.includes(x))))
    }
  }

  const doCheckIn = async (e) => {
    e.preventDefault()
    const number = checkIn.trim()
    if (!number) return
    try {
      const res = await api.post(`/cms/services/${id}/mark/`, { membership_number: number })
      setNotice({ tone: 'green', text: `${res.member.full_name} checked in.` })
      setCheckIn('')
      if (members.some((m) => m.id === res.member.id)) setPresent([res.member.id], true)
      else roster.reload()
    } catch (err) {
      setNotice({ tone: 'red', text: err.message })
    }
  }

  const remove = async () => {
    try { await api.del(`/cms/services/${id}/`); navigate('/attendance') } catch (e) { setActionError(e.message); setDeleting(false) }
  }

  const absentShown = shown.filter((m) => !m.present).map((m) => m.id)

  return (
    <>
      <Link to="/attendance" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Attendance</Link>
      <div className="card mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{service.name}</h1>
            <p className="text-sm text-slate-500">
              {SERVICE_TYPES[service.service_type]} · {date(service.date)}{service.start_time && ` · ${service.start_time.slice(0, 5)}`} · {service.branch_name || 'Church-wide'}
            </p>
            {service.notes && <p className="mt-2 text-sm text-slate-600">{service.notes}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => downloadCsv(`/cms/services/${id}/export/`, {}, `attendance-${service.date}.csv`)}><Download className="h-4 w-4" /> Export</button>
            <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</button>
            <button className="btn-secondary text-red-600" onClick={() => setDeleting(true)} aria-label="Delete service"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Members present" value={presentCount} />
          <Stat label="Visitors" value={service.visitor_count} />
          <Stat label="Total attendance" value={presentCount + service.visitor_count} />
          <Stat label="Of expected members" value={members.length ? `${Math.round((presentCount / members.length) * 100)}%` : '—'} />
        </div>
      </div>

      <Alert>{actionError}</Alert>
      <div className="card p-5">
        <form onSubmit={doCheckIn} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <UserCheck className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input pl-9" placeholder="Quick check-in: type a membership number and press Enter" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <button className="btn-primary">Check in</button>
        </form>
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[['all', `All (${members.length})`], ['present', `Present (${presentCount})`], ['absent', `Absent (${members.length - presentCount})`]].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`rounded-full border px-3 py-1 text-sm ${filter === k ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
            ))}
            <label className="ml-1 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Include inactive members
            </label>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className="input pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {absentShown.length > 0 && (
              <button className="btn-secondary whitespace-nowrap" onClick={() => mark(absentShown, true)}>Mark {absentShown.length} present</button>
            )}
          </div>
        </div>

        {roster.loading && !roster.data ? <Spinner className="mx-auto my-10" /> : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((m) => (
              <li key={m.id}>
                <button onClick={() => mark([m.id], !m.present)} disabled={busy.has(m.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${m.present ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${m.present ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                    {m.present && <Check className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{m.full_name}</span>
                    <span className="block truncate text-xs text-slate-500">{m.membership_number}{m.status !== 'active' && ` · ${m.status}`}{service.branch && m.branch_name && m.branch_name !== service.branch_name && ` · ${m.branch_name}`}</span>
                  </span>
                </button>
              </li>
            ))}
            {!shown.length && <li className="col-span-full py-10 text-center text-sm text-slate-500">No members match.</li>}
          </ul>
        )}
      </div>

      {editing && <ServiceForm service={service} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); roster.reload() }} />}
      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} onConfirm={remove} title="Delete service"
        message={`Delete ${service.name} on ${date(service.date)} and its attendance records?`} />
    </>
  )
}
