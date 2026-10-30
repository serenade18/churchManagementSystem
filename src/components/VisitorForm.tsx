import { useState, type FormEvent } from 'react'
import MemberPicker from './MemberPicker'
import { Alert, Field, Modal, Select } from './ui'
import { api } from '../lib/api'
import { FOLLOW_UP, GENDERS, HOW_HEARD } from '../lib/format'
import { useOptions } from '../lib/hooks'
import { clean, useForm } from '../lib/useForm'
import type { Branch, Id, MemberRef, Visitor } from '../types'

const BLANKABLE = ['last_name', 'gender', 'phone_number', 'email', 'address', 'how_heard', 'follow_up', 'notes'] as const

interface VisitorFormProps {
  visitor?: Visitor
  /** Adding someone at a service: they're marked present at it, in its branch. */
  service?: { id: Id; name: string; branch: Id | null }
  onClose: () => void
  onSaved: (visitor: Visitor) => void
}

/** Add or edit a visitor. New visitors get the next V-number and are marked "to follow up". */
export default function VisitorForm({ visitor, service, onClose, onSaved }: VisitorFormProps) {
  const branches = useOptions<Branch>('/cms/branches/')
  const [invitedBy, setInvitedBy] = useState<MemberRef | null>(
    visitor?.invited_by ? { id: visitor.invited_by, full_name: visitor.invited_by_name, membership_number: '' } : null)
  const { values, set, errors, error, busy, submit } = useForm({
    first_name: visitor?.first_name || '', last_name: visitor?.last_name || '', gender: visitor?.gender || '',
    phone_number: visitor?.phone_number || '', email: visitor?.email || '', address: visitor?.address || '',
    branch: visitor?.branch || service?.branch || '' as Id | string, first_visit: visitor?.first_visit || '',
    how_heard: visitor?.how_heard || '', follow_up: visitor?.follow_up || 'new', notes: visitor?.notes || '',
  })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = { ...clean(values), invited_by: invitedBy?.id || null }
    BLANKABLE.forEach((k) => { if (payload[k] === null) payload[k] = '' })
    if (!visitor && service) payload.service = service.id
    const saved = await submit(() => (visitor
      ? api.patch<Visitor>(`/cms/visitors/${visitor.id}/`, payload)
      : api.post<Visitor>('/cms/visitors/', payload))).catch(() => null)
    if (saved) onSaved(saved)
  }

  return (
    <Modal open onClose={onClose} title={visitor ? 'Edit visitor' : 'Add visitor'} wide
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" form="visitor-form" disabled={busy}>{busy ? 'Saving…' : service && !visitor ? 'Add and mark present' : 'Save visitor'}</button></>}>
      <Alert>{error}</Alert>
      {service && !visitor && <p className="mb-4 text-sm text-mk-muted">They’ll be marked present at {service.name}.</p>}
      <form id="visitor-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="First name *" error={errors.first_name}><input className="input" required value={values.first_name} onChange={set('first_name')} /></Field>
        <Field label="Last name" error={errors.last_name}><input className="input" value={values.last_name} onChange={set('last_name')} /></Field>
        <Field label="Phone number" error={errors.phone_number} hint="For follow-up SMS, and so they can check in by QR next time.">
          <input className="input" type="tel" placeholder="0712 345 678" value={values.phone_number} onChange={set('phone_number')} />
        </Field>
        <Field label="Email" error={errors.email}><input className="input" type="email" value={values.email} onChange={set('email')} /></Field>
        <Field label="Gender" error={errors.gender}><Select value={values.gender} onChange={set('gender')} options={GENDERS} placeholder="—" /></Field>
        <Field label="Branch" error={errors.branch}>
          <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="— None —" />
        </Field>
        <Field label="How they heard of us" error={errors.how_heard}><Select value={values.how_heard} onChange={set('how_heard')} options={HOW_HEARD} placeholder="—" /></Field>
        <Field label="Invited by" hint="A member who brought them, if any."><MemberPicker value={invitedBy} onChange={setInvitedBy} /></Field>
        <Field label="First visit" error={errors.first_visit} hint={visitor ? undefined : 'Leave empty for today.'}>
          <input className="input" type="date" value={values.first_visit} onChange={set('first_visit')} />
        </Field>
        <Field label="Follow-up" error={errors.follow_up}><Select value={values.follow_up} onChange={set('follow_up')} options={FOLLOW_UP} /></Field>
        <Field label="Address" error={errors.address} className="sm:col-span-2"><input className="input" value={values.address} onChange={set('address')} /></Field>
        <Field label="Notes" error={errors.notes} className="sm:col-span-2">
          <textarea className="input min-h-20" value={values.notes} onChange={set('notes')} placeholder="Prayer needs, family, anything to remember when following up" />
        </Field>
      </form>
    </Modal>
  )
}
