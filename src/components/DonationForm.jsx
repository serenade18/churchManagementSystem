import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import MemberPicker from './MemberPicker'
import { Alert, Badge, Field, Modal, Select } from './ui'
import { api } from '../lib/api'
import { useOptions } from '../lib/hooks'
import { CHANNELS, DONATION_STATUS, DONATION_TYPES, money } from '../lib/format'
import { clean, useForm } from '../lib/useForm'

const MANUAL_CHANNELS = Object.fromEntries(Object.entries(CHANNELS).filter(([k]) => k !== 'mpesa'))

export default function DonationForm({ donation, onClose, onSaved, onResent }) {
  const isMpesa = donation?.channel === 'mpesa'
  const branches = useOptions('/cms/branches/')
  const projects = useOptions('/cms/projects/')
  const [member, setMember] = useState(
    donation?.member ? { id: donation.member, full_name: donation.member_name, membership_number: donation.membership_number } : null,
  )
  const { values, set, errors, error, busy, submit } = useForm({
    donation_type: donation?.donation_type || 'general',
    amount: donation?.amount || '',
    channel: donation?.channel || 'cash',
    status: donation?.status || 'success',
    reference: donation?.reference || '',
    phone_number: donation?.phone_number || '',
    membership_number: donation?.membership_number || '',
    branch: donation?.branch || '',
    project: donation?.project || '',
    notes: donation?.notes || '',
    send_receipt: true,
  })
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState('')

  const resend = async () => {
    setResending(true)
    setResent('')
    try {
      const d = await api.post(`/cms/donations/${donation.id}/send_receipt/`)
      setResent(d.receipt_sms_status === 'sent' ? 'Receipt SMS sent.' : d.receipt_sms_error || 'Could not send the SMS.')
      onResent?.(d)
    } catch (e) {
      setResent(e.message)
    } finally {
      setResending(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    let payload = clean({ ...values, member: member?.id ?? null })
    payload.reference ??= ''
    payload.notes ??= ''
    payload.phone_number ??= ''
    payload.membership_number = member ? member.membership_number : values.membership_number || ''
    if (isMpesa) {
      // Amount, status and channel come from Safaricom; only allocation fields are editable.
      const { member: m, membership_number, branch, project, notes, donation_type } = payload
      payload = { member: m, membership_number, branch, project, notes, donation_type, send_receipt: false }
    }
    const saved = await submit(() => (donation ? api.patch(`/cms/donations/${donation.id}/`, payload) : api.post('/cms/donations/', payload))).catch(() => null)
    if (saved) onSaved(saved)
  }

  return (
    <Modal open onClose={onClose} title={donation ? 'Edit donation' : 'Record donation'} wide
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="donation-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error}</Alert>
      {isMpesa && (
        <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          M-PESA donation of <strong>{money(donation.amount)}</strong> from {donation.phone_number}
          {donation.receipt && <> · receipt <span className="font-mono">{donation.receipt}</span></>}. You can re-assign the member, branch, project or type.
        </p>
      )}
      <form id="donation-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Member" className="sm:col-span-2" hint="Leave empty for visitors / anonymous giving.">
          <MemberPicker value={member} onChange={(m) => { setMember(m); if (m?.branch && !values.branch) set('branch')(m.branch) }} />
        </Field>
        {!member && (
          <Field label="Membership number (if not registered)" error={errors.membership_number}>
            <input className="input" value={values.membership_number} onChange={set('membership_number')} />
          </Field>
        )}
        <Field label="Type" error={errors.donation_type}><Select value={values.donation_type} onChange={set('donation_type')} options={DONATION_TYPES} /></Field>
        {!isMpesa && (
          <>
            <Field label="Amount (KES) *" error={errors.amount}><input className="input" type="number" min="1" step="0.01" required value={values.amount} onChange={set('amount')} /></Field>
            <Field label="Channel" error={errors.channel}><Select value={values.channel} onChange={set('channel')} options={MANUAL_CHANNELS} /></Field>
            <Field label="Receipt / reference" error={errors.reference}><input className="input" value={values.reference} onChange={set('reference')} placeholder="e.g. receipt book no., bank ref" /></Field>
            <Field label="Status" error={errors.status}><Select value={values.status} onChange={set('status')} options={DONATION_STATUS} /></Field>
            <Field label="Phone number" error={errors.phone_number}><input className="input" value={values.phone_number} onChange={set('phone_number')} /></Field>
          </>
        )}
        <Field label="Branch" error={errors.branch}>
          <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="— Member's branch / none —" />
        </Field>
        <Field label="Project" error={errors.project}>
          <Select value={values.project} onChange={set('project')} options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="— None —" />
        </Field>
        <Field label="Notes" error={errors.notes} className="sm:col-span-2"><textarea className="input" rows={2} value={values.notes} onChange={set('notes')} /></Field>
        {!donation && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={values.send_receipt} onChange={set('send_receipt')} />
            Send an SMS receipt to the giver (when the status is Success)
          </label>
        )}
      </form>
      {donation && donation.status === 'success' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            SMS receipt: <ReceiptSmsBadge donation={donation} />
            {resent && <span className="text-slate-600">{resent}</span>}
          </span>
          <button type="button" className="btn-secondary px-3 py-1.5" onClick={resend} disabled={resending}>
            {resending ? 'Sending…' : donation.receipt_sms_status ? 'Resend receipt' : 'Send receipt'}
          </button>
        </div>
      )}
    </Modal>
  )
}

const RECEIPT_SMS = {
  sent: ['green', 'Sent'],
  failed: ['red', 'Failed'],
  no_phone: ['amber', 'No phone'],
}

export function ReceiptSmsBadge({ donation }) {
  const [tone, label] = RECEIPT_SMS[donation.receipt_sms_status] || ['slate', 'Not sent']
  return <span title={donation.receipt_sms_error || ''}><Badge tone={tone}>{label}</Badge></span>
}
