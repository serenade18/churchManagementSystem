import { Alert, Field, Modal, Select } from './ui'
import { useOptions } from '../lib/hooks'
import { api } from '../lib/api'
import { GENDERS, MARITAL, MEMBER_STATUS } from '../lib/format'
import { clean, useForm } from '../lib/useForm'

const EMPTY = {
  membership_number: '', first_name: '', last_name: '', other_names: '', gender: '', date_of_birth: '',
  phone_number: '', email: '', national_id: '', address: '', marital_status: '', branch: '', status: 'active',
  date_joined: '', is_baptized: false, is_confirmed: false, notes: '',
}
const BLANKABLE = ['other_names', 'gender', 'phone_number', 'email', 'national_id', 'address', 'marital_status', 'notes']

export default function MemberForm({ member, onClose, onSaved }) {
  const branches = useOptions('/cms/branches/')
  const initial = member ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, member[k] ?? EMPTY[k]])) : EMPTY
  const { values, set, errors, error, busy, submit } = useForm(initial)

  const save = async (e) => {
    e.preventDefault()
    const payload = clean(values)
    BLANKABLE.forEach((k) => { if (payload[k] === null) payload[k] = '' })
    const saved = await submit(() => (member ? api.patch(`/cms/members/${member.id}/`, payload) : api.post('/cms/members/', payload))).catch(() => null)
    if (saved) onSaved(saved)
  }

  const input = (key, label, props = {}) => (
    <Field label={label} error={errors[key]}>
      <input className="input" value={values[key] ?? ''} onChange={set(key)} {...props} />
    </Field>
  )

  return (
    <Modal open onClose={onClose} title={member ? 'Edit member' : 'Add member'} wide
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="member-form" disabled={busy}>{busy ? 'Saving…' : 'Save member'}</button></>}>
      <Alert>{error}</Alert>
      <form id="member-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {input('membership_number', 'Membership number *', { required: true })}
        {input('first_name', 'First name *', { required: true })}
        {input('last_name', 'Last name *', { required: true })}
        {input('other_names', 'Other names')}
        <Field label="Gender" error={errors.gender}><Select value={values.gender} onChange={set('gender')} options={GENDERS} placeholder="—" /></Field>
        {input('date_of_birth', 'Date of birth', { type: 'date' })}
        {input('phone_number', 'Phone number', { placeholder: '2547XXXXXXXX' })}
        {input('email', 'Email', { type: 'email' })}
        {input('national_id', 'National ID')}
        <Field label="Branch" error={errors.branch}>
          <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="— None —" />
        </Field>
        <Field label="Marital status" error={errors.marital_status}><Select value={values.marital_status} onChange={set('marital_status')} options={MARITAL} placeholder="—" /></Field>
        <Field label="Membership status" error={errors.status}><Select value={values.status} onChange={set('status')} options={MEMBER_STATUS} /></Field>
        {input('date_joined', 'Date joined', { type: 'date' })}
        {input('address', 'Address / Residence')}
        <div className="flex items-end gap-6 pb-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.is_baptized} onChange={set('is_baptized')} /> Baptized</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.is_confirmed} onChange={set('is_confirmed')} /> Confirmed</label>
        </div>
        <Field label="Notes" error={errors.notes} className="sm:col-span-2 lg:col-span-3">
          <textarea className="input" rows={2} value={values.notes} onChange={set('notes')} />
        </Field>
      </form>
    </Modal>
  )
}
