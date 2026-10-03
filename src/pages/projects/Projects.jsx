import { useState } from 'react'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { Alert, Badge, ConfirmDialog, Field, Modal, PageHeader, Progress, Select, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi, useOptions } from '../../lib/hooks'
import { PROJECT_STATUS, date, money } from '../../lib/format'
import { clean, useForm } from '../../lib/useForm'

function ProjectForm({ project, onClose, onSaved }) {
  const branches = useOptions('/cms/branches/')
  const { values, set, errors, error, busy, submit } = useForm({
    name: project?.name || '', description: project?.description || '', branch: project?.branch || '',
    target_amount: project?.target_amount || '', start_date: project?.start_date || '', end_date: project?.end_date || '',
    status: project?.status || 'planned',
  })
  const save = async (e) => {
    e.preventDefault()
    const payload = { ...clean(values), description: values.description, target_amount: values.target_amount || 0 }
    const saved = await submit(() => (project ? api.patch(`/cms/projects/${project.id}/`, payload) : api.post('/cms/projects/', payload))).catch(() => null)
    if (saved) onSaved()
  }
  return (
    <Modal open onClose={onClose} title={project ? 'Edit project' : 'New project'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="project-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error}</Alert>
      <form id="project-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" error={errors.name} className="sm:col-span-2"><input className="input" required value={values.name} onChange={set('name')} /></Field>
        <Field label="Description" error={errors.description} className="sm:col-span-2"><textarea className="input" rows={3} value={values.description} onChange={set('description')} /></Field>
        <Field label="Fundraising target (KES)" error={errors.target_amount}><input className="input" type="number" min="0" step="1" value={values.target_amount} onChange={set('target_amount')} /></Field>
        <Field label="Status" error={errors.status}><Select value={values.status} onChange={set('status')} options={PROJECT_STATUS} /></Field>
        <Field label="Branch" error={errors.branch} hint="Leave empty for an organisation-wide project.">
          <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Organisation-wide" />
        </Field>
        <div />
        <Field label="Start date" error={errors.start_date}><input className="input" type="date" value={values.start_date} onChange={set('start_date')} /></Field>
        <Field label="End date" error={errors.end_date}><input className="input" type="date" value={values.end_date} onChange={set('end_date')} /></Field>
      </form>
    </Modal>
  )
}

export default function Projects() {
  const [status, setStatus] = useState('')
  const { data, loading, error, reload } = useApi('/cms/projects/', { status, page_size: 500 })
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [actionError, setActionError] = useState('')

  const remove = async () => {
    try { await api.del(`/cms/projects/${deleting.id}/`); reload() } catch (e) { setActionError(e.message) }
    setDeleting(null)
  }

  return (
    <>
      <PageHeader title="Projects" subtitle="Track projects and how much has been raised for each."
        actions={<>
          <div className="w-44"><Select value={status} onChange={setStatus} options={PROJECT_STATUS} placeholder="All statuses" /></div>
          <button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New project</button>
        </>} />
      <Alert>{error?.message || actionError}</Alert>
      {loading && !data ? <Spinner className="mx-auto mt-10 h-8 w-8" /> : data?.results.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-500">No projects yet.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data?.results.map((p) => {
            const target = Number(p.target_amount)
            const pct = target > 0 ? Math.round((Number(p.amount_raised) / target) * 100) : null
            return (
              <div key={p.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500">{p.branch_name || 'Organisation-wide'}</p>
                  </div>
                  <Badge status={p.status}>{PROJECT_STATUS[p.status]}</Badge>
                </div>
                {p.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
                <div className="mt-4 flex-1">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{money(p.amount_raised)}</span>
                    <span className="text-slate-500">{target > 0 ? `${pct}% of ${money(target)}` : 'No target set'}</span>
                  </div>
                  <Progress value={p.amount_raised} max={target} />
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" /> {p.start_date ? date(p.start_date) : 'No start date'} – {p.end_date ? date(p.end_date) : 'open'} · {p.donation_count} contribution{p.donation_count === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary flex-1" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /> Edit</button>
                  <button className="btn-secondary text-red-600" onClick={() => setDeleting(p)} aria-label="Delete project"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {editing && <ProjectForm project={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete project"
        message={deleting && `Delete ${deleting.name}? Donations made to it are kept but unlinked.`} />
    </>
  )
}
