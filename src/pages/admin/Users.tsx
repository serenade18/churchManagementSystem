import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Alert, Badge, ConfirmDialog, Field, Modal, PageHeader, PasswordInput, Table } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useApi } from '../../lib/hooks'
import { dateTime } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import { ROLES, roleLabel } from '../../lib/access'
import { branding } from '../../lib/theme'
import type { AccountStatus, Branch, Id, Page, RoleAssignment, RoleKey, Tone, User } from '../../types'

type RoleState = Partial<Record<RoleKey, { whole: boolean; branches: Id[] }>>

const toState = (roles: RoleAssignment[] = []): RoleState =>
  Object.fromEntries(roles.map((r) => [r.role, { whole: r.branches.length === 0, branches: r.branches }]))

/** Which roles this person holds, and for which branches (or the whole church). */
function RolePicker({ value, onChange, branches }: { value: RoleState; onChange: (v: RoleState) => void; branches: Branch[] }) {
  const toggle = (key: RoleKey) => {
    const next = { ...value }
    if (next[key]) delete next[key]
    else next[key] = { whole: true, branches: [] }
    onChange(next)
  }
  const update = (key: RoleKey, change: Partial<{ whole: boolean; branches: Id[] }>) =>
    onChange({ ...value, [key]: { ...value[key]!, ...change } })
  return (
    <div className="space-y-2 sm:col-span-2" role="group" aria-label="Roles">
      <p className="label">Roles</p>
      {ROLES.map(({ key, label, description }) => {
        const held = value[key]
        return (
          <div key={key} className={`rounded-lg border px-3 py-2 text-sm ${held ? 'border-brand-600 bg-brand-50' : 'border-mk-border'}`}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-0.5 accent-[var(--color-primary)]" checked={Boolean(held)} onChange={() => toggle(key)} />
              <span><span className="font-medium text-mk-forest">{label}</span><span className="block text-xs text-mk-muted">{description}</span></span>
            </label>
            {held && (
              <div className="mt-2 pl-7">
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-1.5"><input type="radio" checked={held.whole} onChange={() => update(key, { whole: true })} /> Whole church</label>
                  <label className="flex items-center gap-1.5"><input type="radio" checked={!held.whole} onChange={() => update(key, { whole: false })} /> Chosen branches</label>
                </div>
                {!held.whole && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {branches.length === 0 && <span className="text-xs text-mk-muted">Add branches first (Branches page).</span>}
                    {branches.map((b) => {
                      const on = held.branches.includes(b.id)
                      return (
                        <button type="button" key={b.id} aria-pressed={on}
                          className={`rounded-full border px-3 py-1 text-xs ${on ? 'border-brand-600 bg-white font-medium text-brand-800' : 'border-mk-border text-mk-slate'}`}
                          onClick={() => update(key, { branches: on ? held.branches.filter((id) => id !== b.id) : [...held.branches, b.id] })}>
                          {b.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function UserForm({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const platform = Boolean(branding.platform)
  const { data: branchData } = useApi<Page<Branch> | Branch[]>(platform ? null : '/cms/branches/', { page_size: 500 })
  const branches = (Array.isArray(branchData) ? branchData : branchData?.results) || []
  const [roles, setRoles] = useState<RoleState>(toState(user?.roles))
  const [rolesError, setRolesError] = useState('')
  const { values, set, errors, error, busy, submit } = useForm({
    username: user?.username || '', first_name: user?.first_name || '', last_name: user?.last_name || '',
    email: user?.email || '', password: '', is_active: user?.is_active ?? true, is_superuser: user?.is_superuser ?? platform,
  })
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const chosen = Object.entries(roles).map(([role, r]) => ({ role, branches: r!.whole ? [] : r!.branches }))
    if (!platform && !values.is_superuser && chosen.some((r) => r.branches.length === 0 && !roles[r.role as RoleKey]!.whole)) {
      setRolesError('Choose at least one branch for each role limited to branches.')
      return
    }
    setRolesError('')
    const payload: Record<string, unknown> = { ...values, ...(platform ? {} : { roles: values.is_superuser ? [] : chosen }) }
    if (!payload.password) delete payload.password
    const saved = await submit(() => (user ? api.patch(`/cms/users/${user.id}/`, payload) : api.post('/cms/users/', payload))).catch(() => null)
    if (saved) onSaved()
  }
  return (
    <Modal open wide={!platform} onClose={onClose} title={user ? (platform ? 'Edit platform admin' : 'Edit staff member') : (platform ? 'Add platform admin' : 'Add staff member')}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="user-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error || rolesError || (errors as Record<string, string>).roles}</Alert>
      <form id="user-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Username *" error={errors.username}><input className="input" required value={values.username} onChange={set('username')} /></Field>
        <Field label="Email" error={errors.email}><input className="input" type="email" value={values.email} onChange={set('email')} /></Field>
        <Field label="First name" error={errors.first_name}><input className="input" value={values.first_name} onChange={set('first_name')} /></Field>
        <Field label="Last name" error={errors.last_name}><input className="input" value={values.last_name} onChange={set('last_name')} /></Field>
        <Field label={user ? 'New password' : 'Password *'} error={errors.password} hint={user ? 'Leave blank to keep the current password.' : 'At least 8 characters.'} className="sm:col-span-2">
          <PasswordInput autoComplete="new-password" required={!user} value={values.password} onChange={set('password')} />
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.is_active} onChange={set('is_active')} /> Account active</label>
        {!platform && (
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-0.5" checked={values.is_superuser} onChange={set('is_superuser')} />
            <span><span className="font-medium">Church owner</span><span className="block text-xs text-mk-muted">Everything, in every branch: staff and roles, branches, settings and the public page.</span></span>
          </label>
        )}
        {!platform && !values.is_superuser && <RolePicker value={roles} onChange={setRoles} branches={branches} />}
      </form>
    </Modal>
  )
}

/** "Branch admin (East) · Treasurer", for the staff list. */
function rolesText(u: User, branches: Map<Id, string>) {
  if (u.is_superuser) return null
  return u.roles.map((r) => `${roleLabel(r.role)}${r.branches.length ? ` (${r.branches.map((id) => branches.get(id) || '?').join(', ')})` : ''}`).join(' · ')
}

const STATUS: Record<AccountStatus, [Tone, string]> = {
  active: ['green', 'Active'],
  disabled: ['slate', 'Disabled'],
  unverified: ['amber', 'Phone not verified'],
}

export default function Users() {
  const { user: me } = useAuth()
  const platform = Boolean(branding.platform)
  const { data, loading, error, reload } = useApi<Page<User>>('/cms/users/')
  const { data: branchData } = useApi<Page<Branch> | Branch[]>(platform ? null : '/cms/branches/', { page_size: 500 })
  const branchNames = new Map(((Array.isArray(branchData) ? branchData : branchData?.results) || []).map((b) => [b.id, b.name] as [Id, string]))
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [actionError, setActionError] = useState('')

  const remove = async () => {
    try { await api.del(`/cms/users/${deleting!.id}/`); reload() } catch (e) { setActionError(errorMessage(e)) }
    setDeleting(null)
  }

  return (
    <>
      <PageHeader title={platform ? 'Platform admins' : 'Staff & roles'}
        subtitle={platform ? 'People who run mKanisa.' : 'Who can sign in, and what each person looks after: the whole church or chosen branches.'}
        actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> {platform ? 'Add platform admin' : 'Add staff member'}</button>} />
      <Alert>{error?.message || actionError}</Alert>
      <Table loading={loading} rows={data?.results} onRowClick={setEditing} columns={[
        { key: 'username', label: 'Username', render: (u) => <span className="font-medium">{u.username}</span> },
        { key: 'name', label: 'Name', render: (u) => `${u.first_name} ${u.last_name}`.trim() || '—' },
        { key: 'email', label: 'Email', render: (u) => u.email || '—' },
        { key: 'role', label: 'Role', render: (u) => (u.is_superuser
          ? <Badge tone="purple">{platform ? 'Platform admin' : 'Owner'}</Badge>
          : u.roles.length ? <span className="text-sm text-mk-slate">{rolesText(u, branchNames)}</span> : <Badge tone="amber">No role yet</Badge>) },
        { key: 'status', label: 'Status', render: (u) => <Badge tone={STATUS[u.status][0]}>{STATUS[u.status][1]}</Badge> },
        { key: 'last_login', label: 'Last login', render: (u) => dateTime(u.last_login) },
        { key: 'actions', label: '', render: (u) => u.id !== me?.id && (
          <button className="text-sm text-red-600 hover:underline" onClick={(e) => { e.stopPropagation(); setDeleting(u) }}>Remove</button>
        ) },
      ]} />
      {editing && <UserForm user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Remove admin"
        message={deleting && `Remove ${deleting.username}? They will no longer be able to sign in.`} />
    </>
  )
}
