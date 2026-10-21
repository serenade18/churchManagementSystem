import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Download, Pencil, Search, Trash2, UserCheck } from 'lucide-react'
import ServiceForm from '../../components/ServiceForm'
import { Alert, ConfirmDialog, Spinner } from '../../components/ui'
import { api, downloadCsv, errorMessage } from '../../lib/api'
import { useApi, useDebounced } from '../../lib/hooks'
import { SERVICE_TYPES, date } from '../../lib/format'
import type { Member, RosterMember, Service } from '../../types'

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-mk-ivory px-4 py-3">
      <p className="text-[13px] text-mk-muted">{label}</p>
      <p className="font-display text-[22px] font-semibold text-mk-forest">{value}</p>
    </div>
  )
}

export default function ServiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: service, error, reload } = useApi<Service>(`/cms/services/${id}/`)
  const [showAll, setShowAll] = useState(false)
  const roster = useApi<RosterMember[]>(`/cms/services/${id}/roster/`, { all: showAll ? 'true' : '' })
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all')
  const [search, setSearch] = useState('')
  const term = useDebounced(search, 150).toLowerCase()
  const [checkIn, setCheckIn] = useState('')
  const [notice, setNotice] = useState<{ tone: 'green' | 'amber' | 'red'; text: string } | null>(null)
  const [busy, setBusy] = useState(new Set<number>())
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

  const setPresent = (ids: number[], present: boolean) => roster.setData((list) => list && list.map((m) => (ids.includes(m.id) ? { ...m, present } : m)))

  const mark = async (ids: number[], present: boolean) => {
    setPresent(ids, present) // optimistic
    setBusy((b) => new Set([...b, ...ids]))
    try {
      await api.post(`/cms/services/${id}/mark/`, { member_ids: ids, present })
      setActionError('')
    } catch (e) {
      setPresent(ids, !present)
      setActionError(errorMessage(e))
    } finally {
      setBusy((b) => new Set([...b].filter((x) => !ids.includes(x))))
    }
  }

  const doCheckIn = async (e: FormEvent) => {
    e.preventDefault()
    const number = checkIn.trim()
    if (!number) return
    // A name works too: one match is checked in; several narrow the list below.
    const exact = members.find((m) => m.membership_number.toLowerCase() === number.toLowerCase())
    if (!exact && /[a-z]{2}/i.test(number) && !/\d/.test(number)) {
      const words = number.toLowerCase().split(/\s+/)
      const found = members.filter((m) => words.every((w) => m.full_name.toLowerCase().includes(w)))
      if (found.length === 1) {
        const [m] = found
        if (!m.present) await mark([m.id], true)
        setNotice({ tone: 'green', text: m.present ? `${m.full_name} is already checked in.` : `${m.full_name} checked in.` })
        setCheckIn('')
      } else if (found.length > 1) {
        setSearch(number); setFilter('all'); setCheckIn('')
        setNotice({ tone: 'amber', text: `${found.length} members match “${number}”. Tap the right one below.` })
      } else {
        setNotice({ tone: 'red', text: `No one on this list matches “${number}”.` })
      }
      return
    }
    try {
      const res = await api.post<{ member: Member }>(`/cms/services/${id}/mark/`, { membership_number: number })
      setNotice({ tone: 'green', text: `${res.member.full_name} checked in.` })
      setCheckIn('')
      if (members.some((m) => m.id === res.member.id)) setPresent([res.member.id], true)
      else roster.reload()
    } catch (err) {
      setNotice({ tone: 'red', text: errorMessage(err) })
    }
  }

  const remove = async () => {
    try { await api.del(`/cms/services/${id}/`); navigate('/attendance') } catch (e) { setActionError(errorMessage(e)); setDeleting(false) }
  }

  const absentShown = shown.filter((m) => !m.present).map((m) => m.id)

  return (
    <>
      <Link to="/attendance" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-mk-muted hover:text-mk-forest"><ArrowLeft className="h-4 w-4" /> Attendance</Link>
      <div className="card mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-mk-forest sm:text-[34px]">{service.name}</h1>
            <p className="mt-1 text-[15px] text-mk-muted">
              {SERVICE_TYPES[service.service_type]} · {date(service.date)}{service.start_time && ` · ${service.start_time.slice(0, 5)}`} · {service.branch_name || 'Church-wide'}
            </p>
            {service.notes && <p className="mt-2 text-sm text-mk-slate">{service.notes}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => downloadCsv(`/cms/services/${id}/export/`, {}, `attendance-${service.date}.csv`)}><Download className="h-4 w-4" /> Export</button>
            <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</button>
            <button className="btn-secondary text-red-600" onClick={() => setDeleting(true)} aria-label="Delete service"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Members present" value={presentCount} />
          <Stat label="Visitors" value={service.first_timers ? `${service.visitor_count} (${service.first_timers} new)` : service.visitor_count} />
          <Stat label="Total attendance" value={presentCount + service.visitor_count} />
          <Stat label="Of expected members" value={members.length ? `${Math.round((presentCount / members.length) * 100)}%` : '—'} />
        </div>
      </div>

      <Alert>{actionError}</Alert>
      <div className="card p-5">
        <form onSubmit={doCheckIn} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <UserCheck className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mk-muted" />
            <input className="input pl-9" placeholder="Check in: type a membership number or a name, then Enter" aria-label="Check in" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <button className="btn-primary">Check in</button>
        </form>
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {([['all', `All (${members.length})`], ['present', `Present (${presentCount})`], ['absent', `Absent (${members.length - presentCount})`]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`rounded-full border px-3 py-1 text-sm ${filter === k ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700' : 'border-mk-border text-mk-slate hover:bg-mk-ivory'}`}>{label}</button>
            ))}
            <label className="ml-1 flex items-center gap-2 text-sm text-mk-slate">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Include inactive members
            </label>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mk-muted" />
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
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${m.present ? 'border-brand-200 bg-brand-50' : 'border-mk-border bg-white hover:bg-mk-ivory'}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${m.present ? 'border-brand-600 bg-brand-600 text-white' : 'border-mk-border'}`}>
                    {m.present && <Check className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-mk-forest">{m.full_name}</span>
                    <span className="block truncate text-xs text-mk-muted">{m.membership_number}{m.status !== 'active' && ` · ${m.status}`}{service.branch && m.branch_name && m.branch_name !== service.branch_name && ` · ${m.branch_name}`}</span>
                  </span>
                </button>
              </li>
            ))}
            {!shown.length && <li className="col-span-full py-10 text-center text-sm text-mk-muted">No members match.</li>}
          </ul>
        )}
      </div>

      {editing && <ServiceForm service={service} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); roster.reload() }} />}
      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} onConfirm={remove} title="Delete service"
        message={`Delete ${service.name} on ${date(service.date)} and its attendance records?`} />
    </>
  )
}
