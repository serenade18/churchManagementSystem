import { Alert, Field, Modal, Select } from './ui'
import { api } from '../lib/api'
import { useOptions } from '../lib/hooks'
import { SERVICE_TYPES, today } from '../lib/format'
import { clean, useForm } from '../lib/useForm'

export default function ServiceForm({ service, onClose, onSaved }) {
  const branches = useOptions('/cms/branches/')
  const { values, set, errors, error, busy, submit } = useForm({
    name: service?.name || 'Sunday Service',
    service_type: service?.service_type || 'sunday_service',
    date: service?.date || today(),
    start_time: service?.start_time?.slice(0, 5) || '',
    branch: service?.branch || '',
    visitor_count: service?.visitor_count ?? 0,
    notes: service?.notes || '',
  })

  const onType = (type) => {
    // Keep the name in step with the type unless the admin has typed their own.
    if (!values.name || Object.values(SERVICE_TYPES).includes(values.name)) set('name')(SERVICE_TYPES[type])
    set('service_type')(type)
  }

  const save = async (e) => {
    e.preventDefault()
    const payload = { ...clean(values), notes: values.notes, visitor_count: Number(values.visitor_count) || 0 }
    const saved = await submit(() => (service ? api.patch(`/cms/services/${service.id}/`, payload) : api.post('/cms/services/', payload))).catch(() => null)
    if (saved) onSaved(saved)
  }

  return (
    <Modal open onClose={onClose} title={service ? 'Edit service' : 'New service'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="service-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error}</Alert>
      <form id="service-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" error={errors.service_type}><Select value={values.service_type} onChange={onType} options={SERVICE_TYPES} /></Field>
        <Field label="Name *" error={errors.name}><input className="input" required value={values.name} onChange={set('name')} /></Field>
        <Field label="Date *" error={errors.date}><input className="input" type="date" required value={values.date} onChange={set('date')} /></Field>
        <Field label="Start time" error={errors.start_time}><input className="input" type="time" value={values.start_time} onChange={set('start_time')} /></Field>
        <Field label="Branch" error={errors.branch} hint="Members of this branch make up the attendance list.">
          <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Organisation-wide" />
        </Field>
        <Field label="Visitors (head count)" error={errors.visitor_count}><input className="input" type="number" min="0" value={values.visitor_count} onChange={set('visitor_count')} /></Field>
        <Field label="Notes" error={errors.notes} className="sm:col-span-2"><textarea className="input" rows={2} value={values.notes} onChange={set('notes')} /></Field>
      </form>
    </Modal>
  )
}
