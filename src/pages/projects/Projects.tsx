import { useState, type FormEvent } from 'react'
import { CalendarDays, EyeOff, ImageUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Alert, Badge, ConfirmDialog, Field, Modal, PageHeader, Progress, Select, Spinner } from '../../components/ui'
import { api, errorMessage, request } from '../../lib/api'
import { assetUrl } from '../../lib/theme'
import { useApi, useOptions } from '../../lib/hooks'
import { PROJECT_STATUS, date, money } from '../../lib/format'
import { clean, useForm } from '../../lib/useForm'
import type { Branch, Page, Project } from '../../types'
import { useCan } from '../../lib/access'

function ProjectForm({ project, onClose, onSaved }: { project: Project | null; onClose: () => void; onSaved: () => void }) {
  const branches = useOptions<Branch>('/cms/branches/')
  const { values, set, errors, error, busy, submit } = useForm({
    name: project?.name || '', description: project?.description || '', branch: project?.branch || '' as number | string,
    target_amount: project?.target_amount || '', start_date: project?.start_date || '', end_date: project?.end_date || '',
    status: project?.status || 'planned', show_on_site: project?.show_on_site ?? true,
  })
  const [photo, setPhoto] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const shownPhoto = photo ? URL.createObjectURL(photo) : removePhoto ? null : assetUrl(project?.image_url)
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const payload = { ...clean(values), description: values.description, target_amount: values.target_amount || 0 }
    const saved = await submit(async () => {
      const row = await (project ? api.patch<Project>(`/cms/projects/${project.id}/`, payload) : api.post<Project>('/cms/projects/', payload))
      if (photo || removePhoto) {
        const body = new FormData()
        if (photo) body.append('image', photo)
        else body.append('remove_image', 'true')
        await request(`/cms/projects/${row.id}/`, { method: 'PATCH', body })
      }
      return row
    }).catch(() => null)
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
        <Field label="Branch" error={errors.branch} hint="Leave empty for a church-wide project.">
          <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Church-wide" />
        </Field>
        <div />
        <Field label="Start date" error={errors.start_date}><input className="input" type="date" value={values.start_date} onChange={set('start_date')} /></Field>
        <Field label="End date" error={errors.end_date}><input className="input" type="date" value={values.end_date} onChange={set('end_date')} /></Field>
        <Field label="Photo" className="sm:col-span-2" hint="Shown on your public home page. JPG, PNG or WebP under 3 MB.">
          <div className="flex items-center gap-3">
            {shownPhoto
              ? <img src={shownPhoto} alt="" className="h-16 w-16 rounded-lg object-cover" />
              : <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">None</span>}
            <label className="btn-secondary cursor-pointer"><ImageUp className="h-4 w-4" /> Choose photo
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { setPhoto(e.target.files?.[0] || null); setRemovePhoto(false) }} />
            </label>
            {shownPhoto && <button type="button" className="btn-secondary" onClick={() => { setPhoto(null); setRemovePhoto(true) }}>Remove</button>}
          </div>
        </Field>
        <label className="flex items-start gap-2 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" className="mt-0.5 accent-[var(--color-primary)]" checked={values.show_on_site} onChange={set('show_on_site')} />
          <span>Show on the public home and give pages while it's planned or ongoing<span className="block text-xs text-slate-500">Untick to keep it internal: it stops taking gifts from the public give page.</span></span>
        </label>
      </form>
    </Modal>
  )
}

export default function Projects() {
  const can = useCan()
  const [status, setStatus] = useState('')
  const { data, loading, error, reload } = useApi<Page<Project>>('/cms/projects/', { status, page_size: 500 })
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const [actionError, setActionError] = useState('')

  const remove = async () => {
    try { await api.del(`/cms/projects/${deleting!.id}/`); reload() } catch (e) { setActionError(errorMessage(e)) }
    setDeleting(null)
  }

  return (
    <>
      <PageHeader title="Projects" subtitle="Track church projects and how much has been raised for each."
        actions={<>
          <div className="w-44"><Select value={status} onChange={setStatus} options={PROJECT_STATUS} placeholder="All statuses" /></div>
          {can('projects', true) && <button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New project</button>}
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
                  {p.image_url && <img src={assetUrl(p.image_url) ?? undefined} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">{p.name}</h3>
                    <p className="flex items-center gap-1 text-xs text-slate-500">{p.branch_name || 'Church-wide'}
                      {!p.show_on_site && <span className="inline-flex items-center gap-1 text-slate-400"> · <EyeOff className="h-3 w-3" /> Not on public page</span>}</p>
                  </div>
                  <Badge status={p.status}>{PROJECT_STATUS[p.status]}</Badge>
                </div>
                {p.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
                <div className="mt-4 flex-1">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{money(p.amount_raised)}</span>
                    <span className="text-slate-500">{target > 0 ? `${pct}% of ${money(target)}` : 'No target set'}</span>
                  </div>
                  <Progress value={p.amount_raised ?? 0} max={target} />
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
