import { useState } from 'react'
import { MapPin, Pencil, Phone, Plus, Trash2, User } from 'lucide-react'
import { Alert, Badge, ConfirmDialog, Field, Modal, PageHeader, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi } from '../../lib/hooks'
import { money } from '../../lib/format'
import { useForm } from '../../lib/useForm'

function BranchForm({ branch, onClose, onSaved }) {
  const { values, set, errors, error, busy, submit } = useForm({
    name: branch?.name || '', code: branch?.code || '', location: branch?.location || '', leader_name: branch?.leader_name || '',
    phone_number: branch?.phone_number || '', email: branch?.email || '', is_active: branch?.is_active ?? true,
  })
  const save = async (e) => {
    e.preventDefault()
    const saved = await submit((v) => (branch ? api.patch(`/cms/branches/${branch.id}/`, v) : api.post('/cms/branches/', v))).catch(() => null)
    if (saved) onSaved()
  }
  const input = (key, label, props) => (
    <Field label={label} error={errors[key]}><input className="input" value={values[key]} onChange={set(key)} {...props} /></Field>
  )
  return (
    <Modal open onClose={onClose} title={branch ? 'Edit branch' : 'Add branch'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="branch-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error}</Alert>
      <form id="branch-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {input('name', 'Name *', { required: true })}
        {input('code', 'Code', { placeholder: 'e.g. MLC' })}
        {input('location', 'Location')}
        {input('leader_name', 'Leader / Minister')}
        {input('phone_number', 'Phone')}
        {input('email', 'Email', { type: 'email' })}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.is_active} onChange={set('is_active')} /> Active</label>
      </form>
    </Modal>
  )
}

export default function Branches() {
  const { data, loading, error, reload } = useApi('/cms/branches/', { page_size: 500 })
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [actionError, setActionError] = useState('')

  const remove = async () => {
    try { await api.del(`/cms/branches/${deleting.id}/`); reload() } catch (e) { setActionError(e.message) }
    setDeleting(null)
  }

  return (
    <>
      <PageHeader title="Branches" subtitle="Congregations and outreach centres under your parish."
        actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add branch</button>} />
      <Alert>{error?.message || actionError}</Alert>
      {loading && !data ? <Spinner className="mx-auto mt-10 h-8 w-8" /> : data?.results.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-500">No branches yet. Add your first branch to start grouping members.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.results.map((b) => (
            <div key={b.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{b.name}</h3>
                  {b.code && <p className="font-mono text-xs text-slate-500">{b.code}</p>}
                </div>
                {!b.is_active && <Badge status="inactive">Inactive</Badge>}
              </div>
              <ul className="mt-3 flex-1 space-y-1 text-sm text-slate-600">
                {b.location && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{b.location}</li>}
                {b.leader_name && <li className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" />{b.leader_name}</li>}
                {b.phone_number && <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{b.phone_number}</li>}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div><p className="text-xs text-slate-500">Members</p><p className="font-semibold">{b.member_count}</p></div>
                <div><p className="text-xs text-slate-500">Total giving</p><p className="font-semibold">{money(b.total_donations)}</p></div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setEditing(b)}><Pencil className="h-4 w-4" /> Edit</button>
                <button className="btn-secondary text-red-600" onClick={() => setDeleting(b)} aria-label="Delete branch"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <BranchForm branch={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete branch"
        message={deleting && `Delete ${deleting.name}? Its ${deleting.member_count} member(s), projects and donations are kept but will no longer be linked to a branch.`} />
    </>
  )
}
