import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, ListChecks, Pencil, Plus } from 'lucide-react'
import { Alert, Field, Modal, Select } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useCan } from '../../lib/access'
import { SERVICE_TYPES } from '../../lib/format'
import { useApi, useOptions } from '../../lib/hooks'
import { downloadPoster, drawQr } from '../../lib/qr'
import { branding } from '../../lib/theme'
import { clean, useForm } from '../../lib/useForm'
import type { Branch, CheckInPoint, Page } from '../../types'

// Check-in QR codes: members scan one at the door and type their phone number to be marked present.
// Each code fills one service a day (made by the first scan), so the reports below stay by day.

export const checkInLink = (point: CheckInPoint) => `${window.location.origin}/checkin/${point.code}`

function PointForm({ point, onClose, onSaved }: { point?: CheckInPoint; onClose: () => void; onSaved: () => void }) {
  const branches = useOptions<Branch>('/cms/branches/')
  const { values, set, errors, error, busy, submit } = useForm({
    name: point?.name || '',
    service_type: point?.service_type || 'sunday_service',
    branch: point?.branch || '' as number | string,
    is_active: point?.is_active ?? true,
  })
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const payload = { ...clean(values), branch: values.branch || null, is_active: values.is_active }
    const saved = await submit(() => (point ? api.patch(`/cms/check-in-points/${point.id}/`, payload) : api.post('/cms/check-in-points/', payload))).catch(() => null)
    if (saved) onSaved()
  }
  return (
    <Modal open onClose={onClose} title={point ? 'Edit check-in code' : 'New check-in code'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="point-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error}</Alert>
      <form id="point-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" error={errors.name} hint="Members see it when they scan, e.g. Kesha or Men’s meeting." className="sm:col-span-2">
          <input className="input" required value={values.name} onChange={set('name')} />
        </Field>
        <Field label="Type" error={errors.service_type}><Select value={values.service_type} onChange={set('service_type')} options={SERVICE_TYPES} /></Field>
        <Field label="Branch" error={errors.branch}>
          <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Church-wide" />
        </Field>
        {point && (
          <label className="flex items-center gap-2 text-sm text-mk-slate sm:col-span-2">
            <input type="checkbox" checked={values.is_active} onChange={set('is_active')} />
            In use. Untick to close this code: scanning it will no longer check anyone in.
          </label>
        )}
      </form>
    </Modal>
  )
}

function PointCard({ point, canEdit, onEdit }: { point: CheckInPoint; canEdit: boolean; onEdit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const link = checkInLink(point)

  useEffect(() => {
    if (canvas.current) drawQr(canvas.current, link, 112)
  }, [link])

  const openToday = async () => {
    if (point.today) return navigate(`/attendance/${point.today.id}`)
    try { navigate(`/attendance/${(await api.post<{ id: number }>(`/cms/check-in-points/${point.id}/today/`)).id}`) } catch (e) { setError(errorMessage(e)) }
  }

  return (
    <li aria-label={point.name} className={`flex flex-col gap-3 rounded-2xl border border-mk-border p-4 ${point.is_active ? 'bg-white' : 'bg-mk-ivory opacity-75'}`}>
      <div className="flex gap-4">
        <canvas ref={canvas} role="img" aria-label={`QR code to check in to ${point.name}`} className="h-28 w-28 flex-none rounded-lg border border-mk-mist" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-semibold text-mk-forest">{point.name}</span>
          <span className="text-[13px] text-mk-muted">{SERVICE_TYPES[point.service_type]} · {point.branch_name || 'Church-wide'}</span>
          <span className="text-[13px] text-mk-slate">
            {!point.is_active ? 'Closed' : point.today ? `${point.today.members_present} checked in today` : 'No one checked in yet today'}
          </span>
          <a href={link} target="_blank" rel="noreferrer" className="truncate font-mono text-xs text-brand-700 hover:underline">{link.replace(/^https?:\/\//, '')}</a>
        </div>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary min-h-9! px-3! text-sm!"
          onClick={() => downloadPoster(link, { title: branding.name, subtitle: `Scan to check in · ${point.name}`, shown: window.location.host }, `${point.name}-check-in`)}>
          <Download className="h-4 w-4" /> Download QR
        </button>
        {point.is_active && (point.today || canEdit) && (
          <button type="button" className="btn-secondary min-h-9! px-3! text-sm!" onClick={openToday}><ListChecks className="h-4 w-4" /> Today’s list</button>
        )}
        {canEdit && <button type="button" className="btn-secondary min-h-9! px-3! text-sm!" onClick={onEdit} aria-label={`Edit ${point.name}`}><Pencil className="h-4 w-4" /></button>}
      </div>
    </li>
  )
}

export default function CheckInCodes() {
  const can = useCan()
  const { data, error, reload } = useApi<Page<CheckInPoint>>('/cms/check-in-points/')
  const [editing, setEditing] = useState<CheckInPoint | 'new' | null>(null)
  const canEdit = can('attendance', true)

  return (
    <section aria-labelledby="codes-title" className="card mt-6 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 id="codes-title" className="font-semibold">Check-in QR codes</h2>
        {canEdit && <button className="btn-secondary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New check-in code</button>}
      </div>
      <p className="mb-4 text-sm text-mk-muted">
        Print a code at the door or show it on screen. Members scan it and type their phone number to check in, once a day, with the time recorded.
        Make one for each meeting you want counted separately.
      </p>
      <Alert>{error?.message}</Alert>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.results.map((p) => <PointCard key={p.id} point={p} canEdit={canEdit} onEdit={() => setEditing(p)} />)}
      </ul>
      {editing && <PointForm point={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </section>
  )
}
