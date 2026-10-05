import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { Alert, Badge, ConfirmDialog, Field, Modal, PageHeader, Select, Table } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useApi, useOptions } from '../../lib/hooks'
import { PAYBILL_NUMBER, money } from '../../lib/format'
import { clean, useForm } from '../../lib/useForm'
import type { Branch, DonationType, Page, Project } from '../../types'

function TypeForm({ type, onClose, onSaved }: { type: DonationType | null; onClose: () => void; onSaved: () => void }) {
  const projects = useOptions<Project>('/cms/projects/')
  const branches = useOptions<Branch>('/cms/branches/')
  const { values, set, errors, error, busy, submit } = useForm({
    name: type?.name || '', code: type?.code || '', project: type?.project || '' as number | string, branch: type?.branch || '' as number | string,
    is_active: type?.is_active ?? true, show_on_give: type?.show_on_give ?? true, is_default: type?.is_default ?? false,
  })
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const payload = clean(values)
    const saved = await submit(() => (type ? api.patch(`/cms/donation-codes/${type.id}/`, payload) : api.post('/cms/donation-codes/', payload))).catch(() => null)
    if (saved) onSaved()
  }
  return (
    <Modal open onClose={onClose} title={type ? 'Edit donation type' : 'New donation type'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="type-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error}</Alert>
      {type && values.code !== type.code && (
        <Alert tone="amber">
          Givers who still type {type.code} on Paybill will land in Unallocated. Tell the congregation about the new code. Past gifts keep their type.
        </Alert>
      )}
      <form id="type-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" error={errors.name}><input className="input" required value={values.name} onChange={set('name')} placeholder="Tithe & First Fruit" /></Field>
        <Field label="Paybill code *" error={errors.code} hint="2-6 letters/digits, ideally 3. Avoid O and I: they look like 0 and 1.">
          <input className="input font-mono uppercase" required maxLength={6} value={values.code} onChange={(e) => set('code')(e.target.value.toUpperCase())} placeholder="TTH" />
        </Field>
        <Field label="Project" error={errors.project} hint="Gifts of this type count towards the project.">
          <Select value={values.project} onChange={set('project')} options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="— None —" />
        </Field>
        <Field label="Branch" error={errors.branch} hint="Leave empty to credit the giver's own branch.">
          <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Giver's branch" />
        </Field>
        <div className="space-y-2 text-sm sm:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={values.is_active} onChange={set('is_active')} /> Active (accepts new gifts)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={values.show_on_give} onChange={set('show_on_give')} /> Show on the public give page</label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={values.is_default} onChange={set('is_default')} disabled={type?.is_default} />
            Default type: used when a Paybill payment has no code (e.g. phone number only)
          </label>
          {(errors.is_active || errors.is_default) && <p className="text-xs text-red-600">{errors.is_active || errors.is_default}</p>}
        </div>
      </form>
    </Modal>
  )
}

export default function DonationTypes() {
  const [editing, setEditing] = useState<DonationType | 'new' | null>(null)
  const [deleting, setDeleting] = useState<DonationType | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const { data, loading, error, reload } = useApi<Page<DonationType>>('/cms/donation-codes/', { page_size: 500 })
  const types = data?.results || []

  const toggle = async (t: DonationType) => {
    setActionError('')
    try { await api.patch(`/cms/donation-codes/${t.id}/`, { is_active: !t.is_active }); reload() } catch (e) { setActionError(errorMessage(e)) }
  }
  const remove = async () => {
    setBusy(true)
    try { await api.del(`/cms/donation-codes/${deleting!.id}/`); setNotice(`${deleting!.name} deleted.`); reload() } catch (e) { setActionError(errorMessage(e)) }
    setBusy(false)
    setDeleting(null)
  }
  const inUse = (t: DonationType) => t.donation_count > 0 || t.payment_count > 0

  return (
    <>
      <PageHeader title="Donation types" subtitle={`What people give towards, and the code they add on Paybill ${PAYBILL_NUMBER}, e.g. 0712345678TTH.`}
        actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New type</button>} />
      {notice && <Alert tone="green">{notice}</Alert>}
      <Alert>{actionError || error?.message}</Alert>
      <Table loading={loading} rows={types} onRowClick={setEditing} empty="No donation types yet."
        columns={[
          { key: 'name', label: 'Type', render: (t) => (
            <span className="flex items-center gap-1.5 font-medium text-slate-900">
              {t.name}
              {t.is_default && <span title="Default type"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /></span>}
            </span>
          ) },
          { key: 'code', label: 'Paybill code', render: (t) => <span className="rounded bg-slate-100 px-2 py-0.5 font-mono font-semibold">{t.code}</span> },
          { key: 'links', label: 'Credits', render: (t) => [t.project_name, t.branch_name].filter(Boolean).join(' · ') || <span className="text-slate-400">—</span> },
          { key: 'example', label: 'Account example', render: (t) => <span className="font-mono text-xs text-slate-500">0712345678{t.code}</span> },
          { key: 'total_given', label: 'Given', className: 'text-right', render: (t) => <>{money(t.total_given)} <span className="text-xs text-slate-400">({t.donation_count})</span></> },
          { key: 'is_active', label: 'Status', render: (t) => (
            <div className="flex flex-col items-start gap-1">
              <button type="button" title={t.is_default ? 'The default type is always on' : t.is_active ? 'Turn off' : 'Turn on'} disabled={t.is_default}
                onClick={(e) => { e.stopPropagation(); toggle(t) }}>
                <Badge tone={t.is_active ? 'green' : 'slate'}>{t.is_active ? 'On' : 'Off'}</Badge>
              </button>
              {!t.show_on_give && <span className="text-xs text-slate-400">Hidden from give page</span>}
            </div>
          ) },
          { key: 'actions', label: '', render: (t) => (
            <div className="flex justify-end gap-1">
              <button type="button" className="btn-secondary px-2.5 py-1.5" onClick={(e) => { e.stopPropagation(); setEditing(t) }}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button type="button" className="btn-secondary px-2.5 py-1.5 text-red-600"
                title={t.is_default ? 'Make another type the default first' : inUse(t) ? 'Has gifts: turn it off instead' : 'Delete'}
                disabled={t.is_default || inUse(t)} onClick={(e) => { e.stopPropagation(); setDeleting(t) }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) },
        ]} />

      <ConfirmDialog open={!!deleting} busy={busy} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete donation type"
        message={`Delete ${deleting?.name} (${deleting?.code})? Paybill payments typed with this code will go to Unallocated.`} />
      {editing && <TypeForm type={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setNotice('Donation type saved.'); reload() }} />}
    </>
  )
}
