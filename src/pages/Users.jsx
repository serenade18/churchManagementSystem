import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Alert, Badge, ConfirmDialog, Field, Modal, PageHeader, Table } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useApi } from '../lib/hooks'
import { dateTime } from '../lib/format'
import { useForm } from '../lib/useForm'

function UserForm({ user, onClose, onSaved }) {
  const { values, set, errors, error, busy, submit } = useForm({
    username: user?.username || '', first_name: user?.first_name || '', last_name: user?.last_name || '',
    email: user?.email || '', password: '', is_active: user?.is_active ?? true, is_superuser: user?.is_superuser ?? false,
  })
  const save = async (e) => {
    e.preventDefault()
    const payload = { ...values }
    if (!payload.password) delete payload.password
    const saved = await submit(() => (user ? api.patch(`/cms/users/${user.id}/`, payload) : api.post('/cms/users/', payload))).catch(() => null)
    if (saved) onSaved()
  }
  return (
    <Modal open onClose={onClose} title={user ? 'Edit admin' : 'Add admin'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="user-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error}</Alert>
      <form id="user-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Username *" error={errors.username}><input className="input" required value={values.username} onChange={set('username')} /></Field>
        <Field label="Email" error={errors.email}><input className="input" type="email" value={values.email} onChange={set('email')} /></Field>
        <Field label="First name" error={errors.first_name}><input className="input" value={values.first_name} onChange={set('first_name')} /></Field>
        <Field label="Last name" error={errors.last_name}><input className="input" value={values.last_name} onChange={set('last_name')} /></Field>
        <Field label={user ? 'New password' : 'Password *'} error={errors.password} hint={user ? 'Leave blank to keep the current password.' : 'At least 8 characters.'} className="sm:col-span-2">
          <input className="input" type="password" autoComplete="new-password" required={!user} value={values.password} onChange={set('password')} />
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.is_active} onChange={set('is_active')} /> Account active</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.is_superuser} onChange={set('is_superuser')} /> Super admin (can manage admins)</label>
      </form>
    </Modal>
  )
}

const STATUS = {
  active: ['green', 'Active'],
  disabled: ['slate', 'Disabled'],
  pending: ['amber', 'Awaiting approval'],
  rejected: ['red', 'Rejected'],
}

function PendingApprovals({ onChanged }) {
  const { data, reload } = useApi('/cms/users/', { status: 'pending' })
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const pending = data?.results || []
  if (!pending.length) return null

  const review = async (u, decision) => {
    setBusy(u.id); setError('')
    try {
      await api.post(`/cms/users/${u.id}/${decision}/`)
      reload(); onChanged()
      window.dispatchEvent(new Event('cms:users-changed'))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="card mb-6 border-amber-200 p-5">
      <h2 className="font-semibold">Awaiting approval <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{pending.length}</span></h2>
      <p className="mb-4 text-sm text-slate-500">People who requested admin access. Approve only those you know should see member and giving data.</p>
      <Alert>{error}</Alert>
      <ul className="divide-y divide-slate-100">
        {pending.map((u) => (
          <li key={u.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="font-medium text-slate-900">{`${u.first_name} ${u.last_name}`.trim()} <span className="font-normal text-slate-500">· {u.username}</span></p>
              <p className="text-slate-500">{u.email} · {u.phone_number} · requested {dateTime(u.date_joined)}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-red-600" disabled={busy === u.id} onClick={() => review(u, 'reject')}>Reject</button>
              <button className="btn-primary" disabled={busy === u.id} onClick={() => review(u, 'approve')}>{busy === u.id ? 'Saving…' : 'Approve'}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Users() {
  const { user: me } = useAuth()
  const { data, loading, error, reload } = useApi('/cms/users/')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [actionError, setActionError] = useState('')

  const remove = async () => {
    try { await api.del(`/cms/users/${deleting.id}/`); reload() } catch (e) { setActionError(e.message) }
    setDeleting(null)
  }

  return (
    <>
      <PageHeader title="Admin users" subtitle="People who can sign in to this portal."
        actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add admin</button>} />
      <Alert>{error?.message || actionError}</Alert>
      <PendingApprovals onChanged={reload} />
      <Table loading={loading} rows={data?.results} onRowClick={setEditing} columns={[
        { key: 'username', label: 'Username', render: (u) => <span className="font-medium">{u.username}</span> },
        { key: 'name', label: 'Name', render: (u) => `${u.first_name} ${u.last_name}`.trim() || '—' },
        { key: 'email', label: 'Email', render: (u) => u.email || '—' },
        { key: 'role', label: 'Role', render: (u) => <Badge tone={u.is_superuser ? 'purple' : 'blue'}>{u.is_superuser ? 'Super admin' : 'Admin'}</Badge> },
        { key: 'status', label: 'Status', render: (u) => <Badge tone={STATUS[u.status][0]}>{STATUS[u.status][1]}</Badge> },
        { key: 'last_login', label: 'Last login', render: (u) => dateTime(u.last_login) },
        { key: 'actions', label: '', render: (u) => u.id !== me.id && (
          <button className="text-sm text-red-600 hover:underline" onClick={(e) => { e.stopPropagation(); setDeleting(u) }}>Remove</button>
        ) },
      ]} />
      {editing && <UserForm user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Remove admin"
        message={deleting && `Remove ${deleting.username}? They will no longer be able to sign in.`} />
    </>
  )
}
