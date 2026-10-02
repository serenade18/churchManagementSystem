import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle2, MessageSquare, Send, Users, X } from 'lucide-react'
import MemberPicker from '../../components/MemberPicker'
import { Alert, Badge, Field, Modal, PageHeader, Pagination, Select, Table } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi, useDebounced, useOptions } from '../../lib/hooks'
import { GENDERS, MEMBER_STATUS, dateTime } from '../../lib/format'

const PLACEHOLDERS = [
  ['{first_name}', 'First name'],
  ['{name}', 'Full name'],
  ['{membership_number}', 'Member no.'],
]
const MAX_LENGTH = 918
const SMS_STATUS = { sent: 'Sent', partial: 'Partially sent', failed: 'Failed' }
const SMS_TONE = { sent: 'green', partial: 'amber', failed: 'red' }

// GSM SMS: 160 chars for one message, 153 per part when split.
const segments = (text) => (text.length <= 160 ? 1 : Math.ceil(text.length / 153))

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition ${active ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
      {children}
    </button>
  )
}

function SmsDetail({ sms, onClose }) {
  const [status, setStatus] = useState(sms.failed_count ? 'failed' : '')
  const [page, setPage] = useState(1)
  const { data, loading } = useApi(`/cms/sms/${sms.id}/recipients/`, { status, page })
  return (
    <Modal open onClose={onClose} title="SMS details" wide>
      <p className="mb-1 text-xs text-slate-500">{dateTime(sms.created_at)} · {sms.sent_by_name} · {sms.audience_label}</p>
      <p className="mb-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{sms.message}</p>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm"><strong>{sms.sent_count}</strong> sent · <strong>{sms.failed_count}</strong> failed · <strong>{sms.skipped_count}</strong> skipped (no valid phone)</p>
        <div className="w-40"><Select value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={{ sent: 'Sent', failed: 'Failed' }} placeholder="All" /></div>
      </div>
      <Table loading={loading} rows={data?.results} empty="No recipients." columns={[
        { key: 'name', label: 'Name' },
        { key: 'phone_number', label: 'Phone' },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'sent' ? 'green' : 'red'}>{r.status === 'sent' ? 'Sent' : 'Failed'}</Badge> },
        { key: 'error', label: 'Error', render: (r) => r.error || '—' },
      ]} />
      <Pagination page={page} count={data?.count} onChange={setPage} />
    </Modal>
  )
}

export default function Sms() {
  const location = useLocation()
  const preset = location.state || {}
  const branches = useOptions('/cms/branches/')
  const [mode, setMode] = useState(preset.members ? 'members' : 'filter')
  const [audience, setAudience] = useState({
    branches: preset.branches || [],
    statuses: preset.statuses || ['active'],
    gender: preset.gender || '',
  })
  const [selected, setSelected] = useState(preset.members || [])
  const [message, setMessage] = useState('')
  const textarea = useRef(null)
  const [preview, setPreview] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [page, setPage] = useState(1)
  const history = useApi('/cms/sms/', { page })

  const payload = mode === 'members'
    ? { member_ids: selected.map((m) => m.id) }
    : { branches: audience.branches, statuses: audience.statuses, gender: audience.gender }
  const previewKey = useDebounced(JSON.stringify({ ...payload, message }), 400)

  useEffect(() => {
    const body = JSON.parse(previewKey)
    if (mode === 'members' && !body.member_ids.length) { setPreview({ recipient_count: 0, skipped_count: 0, sample: [] }); return }
    let cancelled = false
    api.post('/cms/sms/preview/', body).then((d) => !cancelled && setPreview(d)).catch((e) => !cancelled && setError(e.message))
    return () => { cancelled = true }
  }, [previewKey, mode])

  const toggle = (key, value) => setAudience((a) => ({
    ...a, [key]: a[key].includes(value) ? a[key].filter((v) => v !== value) : [...a[key], value],
  }))

  // Insert a placeholder at the cursor and leave the cursor just after it.
  const insert = (token) => {
    const el = textarea.current
    const start = el?.selectionStart ?? message.length
    const end = el?.selectionEnd ?? message.length
    const next = (message.slice(0, start) + token + message.slice(end)).slice(0, MAX_LENGTH)
    setMessage(next)
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const send = async () => {
    setSending(true)
    setError('')
    try {
      const sms = await api.post('/cms/sms/', { ...payload, message })
      setResult(sms)
      setMessage('')
      setPage(1)
      history.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
      setConfirming(false)
    }
  }

  const count = preview?.recipient_count ?? 0
  const parts = segments(message)

  return (
    <>
      <PageHeader title="Bulk SMS" subtitle="Send announcements and reminders to your members by SMS." />

      {result && (
        <div className={`mb-6 flex items-start justify-between gap-4 rounded-xl border p-4 ${result.failed_count ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex gap-3">
            <CheckCircle2 className={`mt-0.5 h-5 w-5 ${result.failed_count ? 'text-amber-600' : 'text-emerald-600'}`} />
            <div className="text-sm">
              <p className="font-medium">SMS sent to {result.sent_count} member{result.sent_count === 1 ? '' : 's'}.</p>
              {result.failed_count > 0 && <p>{result.failed_count} failed. <button className="font-medium underline" onClick={() => setViewing(result)}>See which</button></p>}
            </div>
          </div>
          <button onClick={() => setResult(null)} aria-label="Dismiss"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="card p-5 xl:col-span-3">
          <h2 className="mb-4 font-semibold">Compose</h2>
          <Alert>{error}</Alert>

          <span className="label">Recipients</span>
          <div className="mb-4 flex gap-2">
            <Chip active={mode === 'filter'} onClick={() => setMode('filter')}>Groups of members</Chip>
            <Chip active={mode === 'members'} onClick={() => setMode('members')}>Specific members</Chip>
          </div>

          {mode === 'filter' ? (
            <div className="mb-5 space-y-4 rounded-lg border border-slate-200 p-4">
              <div>
                <p className="mb-2 text-sm text-slate-600">Branches <span className="text-slate-400">(none selected = all branches)</span></p>
                <div className="flex flex-wrap gap-2">
                  {branches.map((b) => <Chip key={b.id} active={audience.branches.includes(b.id)} onClick={() => toggle('branches', b.id)}>{b.name}</Chip>)}
                  {!branches.length && <span className="text-sm text-slate-400">No branches yet.</span>}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm text-slate-600">Membership status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(MEMBER_STATUS).map(([k, v]) => <Chip key={k} active={audience.statuses.includes(k)} onClick={() => toggle('statuses', k)}>{v}</Chip>)}
                </div>
              </div>
              <Field label="Gender" className="max-w-xs">
                <Select value={audience.gender} onChange={(v) => setAudience((a) => ({ ...a, gender: v }))} options={GENDERS} placeholder="Everyone" />
              </Field>
            </div>
          ) : (
            <div className="mb-5 space-y-3 rounded-lg border border-slate-200 p-4">
              <MemberPicker key={selected.length} value={null} onChange={(m) => m && !selected.some((s) => s.id === m.id) && setSelected([...selected, m])} />
              <div className="flex flex-wrap gap-2">
                {selected.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-sm text-brand-800">
                    {m.full_name}
                    <button onClick={() => setSelected(selected.filter((s) => s.id !== m.id))} className="rounded-full p-0.5 hover:bg-brand-100" aria-label={`Remove ${m.full_name}`}><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
                {!selected.length && <span className="text-sm text-slate-400">Search above to add members.</span>}
              </div>
            </div>
          )}

          <Field label="Message">
            <textarea ref={textarea} className="input" rows={5} maxLength={MAX_LENGTH} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Dear {first_name}, join us this Sunday at 9am for the harvest service. God bless!" />
          </Field>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-slate-500">Insert:</span>
              {PLACEHOLDERS.map(([token, label]) => (
                <button key={token} type="button" onClick={() => insert(token)} className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50">{label}</button>
              ))}
            </div>
            <span className="text-xs text-slate-500">{message.length} characters · {parts} SMS{parts > 1 ? ' each' : ''}</span>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="h-4 w-4 text-slate-400" />
              <span><strong className="text-slate-900">{count}</strong> recipient{count === 1 ? '' : 's'}
                {preview?.skipped_count > 0 && <span className="text-amber-700"> · {preview.skipped_count} skipped (no valid phone)</span>}</span>
            </p>
            <button className="btn-primary" disabled={!message.trim() || !count} onClick={() => setConfirming(true)}>
              <Send className="h-4 w-4" /> Send SMS
            </button>
          </div>
        </div>

        <div className="card p-5 xl:col-span-2">
          <h2 className="mb-4 font-semibold">Preview</h2>
          {preview?.sample?.length && message ? (
            <ul className="space-y-3">
              {preview.sample.map((s) => (
                <li key={s.phone_number}>
                  <p className="mb-1 text-xs text-slate-500">To {s.name} · {s.phone_number}</p>
                  <p className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2 text-sm">{s.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center text-sm text-slate-400">
              <MessageSquare className="mx-auto mb-2 h-8 w-8" />
              {count ? 'Type a message to see how it will look.' : 'Choose who should receive the message.'}
            </div>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Sent messages</h2>
      <Table loading={history.loading} rows={history.data?.results} onRowClick={setViewing} empty="No SMS sent yet." columns={[
        { key: 'created_at', label: 'Date', render: (s) => dateTime(s.created_at) },
        { key: 'message', label: 'Message', className: 'max-w-xs', render: (s) => <span className="block truncate">{s.message}</span> },
        { key: 'audience_label', label: 'To', render: (s) => <span className="block max-w-[14rem] truncate">{s.audience_label}</span> },
        { key: 'counts', label: 'Sent / Failed', render: (s) => `${s.sent_count} / ${s.failed_count}` },
        { key: 'status', label: 'Status', render: (s) => <Badge tone={SMS_TONE[s.status]}>{SMS_STATUS[s.status]}</Badge> },
        { key: 'sent_by_name', label: 'By' },
      ]} />
      <Pagination page={page} count={history.data?.count} onChange={setPage} />

      <Modal open={confirming} onClose={() => !sending && setConfirming(false)} title="Send SMS?"
        footer={<><button className="btn-secondary" onClick={() => setConfirming(false)} disabled={sending}>Cancel</button>
          <button className="btn-primary" onClick={send} disabled={sending}>{sending ? 'Sending…' : `Send to ${count}`}</button></>}>
        <p className="text-sm text-slate-600">
          This will send <strong>{count}</strong> SMS{parts > 1 && <> ({parts} parts each, {count * parts} in total)</>} to {preview?.audience_label}. This can't be undone.
        </p>
      </Modal>
      {viewing && <SmsDetail sms={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}
