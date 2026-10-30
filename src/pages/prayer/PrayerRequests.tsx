import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Lock, Phone, Search } from 'lucide-react'
import { Alert, Badge, Field, Modal, PageHeader, Pagination, Select, Spinner } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useCan } from '../../lib/access'
import { PRAYER_STATUS, ago, dateTime } from '../../lib/format'
import { useApi, useDebounced, useOptions } from '../../lib/hooks'
import type { Branch, Page, PrayerRequest, PrayerStatus } from '../../types'

// Prayer requests sent from the church's public /pray page. Leaders mark how each is going and keep
// a note of what was done; confidential ones reach only the owner and pastors.

const TABS: [string, string][] = [['new', 'New'], ['praying', 'Praying'], ['answered', 'Answered'], ['closed', 'Closed'], ['', 'All']]
export const prayLink = () => `${window.location.origin}/pray`

const who = (r: PrayerRequest) => r.member_name || r.name || 'Anonymous'

/** One request: read it, then move it along with a note. */
function PrayerPanel({ req, onClose, onSaved }: { req: PrayerRequest; onClose: () => void; onSaved: () => void }) {
  const can = useCan()
  const [status, setStatus] = useState<PrayerStatus>(req.status === 'new' ? 'praying' : req.status)
  const [note, setNote] = useState(req.note)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const canEdit = can('prayer', true)

  const save = async () => {
    setBusy(true); setError('')
    try {
      await api.patch(`/cms/prayer-requests/${req.id}/`, { status, note })
      window.dispatchEvent(new Event('cms:prayer-changed'))
      onSaved()
    } catch (e) { setError(errorMessage(e)); setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={`From ${who(req)}`} wide
      footer={canEdit ? <><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>
        : <button className="btn-secondary" onClick={onClose}>Close</button>}>
      <Alert>{error}</Alert>
      <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-mk-muted">
        <span>{dateTime(req.created_at)}</span>
        {req.branch_name && <span>· {req.branch_name}</span>}
        {req.confidential && <Badge tone="purple">Confidential</Badge>}
        {req.wants_contact && <Badge tone="amber">Would like a call</Badge>}
      </p>
      <blockquote className="mb-5 whitespace-pre-line rounded-xl bg-mk-ivory px-5 py-4 text-[16px] leading-relaxed text-mk-forest">{req.request}</blockquote>
      {(req.phone_number || req.member) && (
        <p className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {req.phone_number && <a href={`tel:+${req.phone_number}`} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"><Phone className="h-4 w-4" /> +{req.phone_number}</a>}
          {req.member && can('members') && <Link to={`/members/${req.member}`} className="font-semibold text-brand-700 hover:underline">{req.member_name}’s member record</Link>}
        </p>
      )}
      {canEdit ? (
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <Field label="Status"><Select value={status} onChange={(v) => setStatus(v as PrayerStatus)} options={PRAYER_STATUS} /></Field>
          <Field label="Note for the leaders" hint="What was done: who prayed, called or visited.">
            <textarea className="input min-h-24" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      ) : req.note && <p className="text-sm text-mk-slate"><strong>Note:</strong> {req.note}</p>}
      {req.handled_by_name && <p className="mt-3 text-[13px] text-mk-muted">Last updated by {req.handled_by_name}{req.handled_at && `, ${ago(req.handled_at)}`}.</p>}
    </Modal>
  )
}

export default function PrayerRequests() {
  const branches = useOptions<Branch>('/cms/branches/')
  const [tab, setTab] = useState('new')
  const [branch, setBranch] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<PrayerRequest | null>(null)
  const [copied, setCopied] = useState(false)
  const { data, loading, error, reload } = useApi<Page<PrayerRequest>>('/cms/prayer-requests/', { status: tab, branch, search: useDebounced(search), page })

  const copy = async () => {
    try { await navigator.clipboard.writeText(prayLink()); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* no clipboard */ }
  }

  return (
    <>
      <PageHeader
        title="Prayer requests"
        subtitle={<>Sent from your church’s prayer page, <a href={prayLink()} target="_blank" rel="noreferrer" className="font-mono text-brand-700 hover:underline">{prayLink().replace(/^https?:\/\//, '')}</a>. Share it in the bulletin, by SMS or on screen.</>}
        actions={<button className="btn-secondary" onClick={copy}><Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy the link'}</button>}
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status">
          {TABS.map(([value, label]) => (
            <button key={value} role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setPage(1) }}
              className={`rounded-full border px-3 py-1 text-sm ${tab === value ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700' : 'border-mk-border text-mk-slate hover:bg-mk-ivory'}`}>{label}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
          <Select value={branch} onChange={(v) => { setBranch(v); setPage(1) }} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="All branches" />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mk-muted" />
            <input className="input pl-9" placeholder="Search…" aria-label="Search prayer requests" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>
      </div>
      <Alert>{error?.message}</Alert>
      {loading && !data ? <Spinner className="mx-auto my-16 h-8 w-8" /> : data?.results.length ? (
        <ul className="flex flex-col gap-3">
          {data.results.map((r) => (
            <li key={r.id}>
              <button onClick={() => setOpen(r)} className="flex w-full flex-col gap-2 rounded-2xl border border-mk-border bg-white p-5 text-left transition hover:border-brand-300">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-mk-forest">{who(r)}</span>
                  <span className="text-[13px] text-mk-muted">{ago(r.created_at)}{r.branch_name && ` · ${r.branch_name}`}</span>
                  <span className="ml-auto flex gap-1.5">
                    {r.confidential && <span title="Confidential: only the owner and pastors see it"><Lock className="h-4 w-4 text-mk-muted" aria-label="Confidential" /></span>}
                    {r.wants_contact && <Badge tone="amber">Would like a call</Badge>}
                    <Badge status={r.status}>{PRAYER_STATUS[r.status]}</Badge>
                  </span>
                </span>
                <span className="line-clamp-3 whitespace-pre-line text-[15px] text-mk-slate">{r.request}</span>
                {r.note && <span className="text-[13px] text-mk-muted">Note: {r.note}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-mk-border bg-white p-10 text-center text-mk-muted">
          {tab === 'new' ? 'No new prayer requests.' : 'Nothing here.'}
        </p>
      )}
      <Pagination page={page} count={data?.count} onChange={setPage} />
      {open && <PrayerPanel req={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload() }} />}
    </>
  )
}
