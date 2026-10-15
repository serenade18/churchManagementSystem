import { useState, type FormEvent } from 'react'
import { ExternalLink, KeyRound, Pencil, Plus, UserPlus } from 'lucide-react'
import { Alert, Badge, Field, Modal, PageHeader, Table, type Column } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi } from '../../lib/hooks'
import { date } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import type { Page, PlatformChurch } from '../../types'

const host = () => window.location.hostname.replace(/^www\./, '')

function ChurchForm({ church, onClose, onSaved }: { church: PlatformChurch | null; onClose: () => void; onSaved: (c: PlatformChurch) => void }) {
  const { values, set, errors, error, busy, submit } = useForm({
    name: church?.name || '', slug: church?.slug || '', custom_domain: church?.custom_domain || '',
    is_active: church?.is_active ?? true, is_listed: church?.is_listed ?? true,
    mpesa_shortcode: church?.mpesa_shortcode || '', mpesa_shortcode_type: church?.mpesa_shortcode_type || 'Paybill',
    mpesa_passkey: '', mpesa_consumer_key: '', mpesa_consumer_secret: '', sasapay_merchant_code: church?.sasapay_merchant_code || '',
  })
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const body = { ...values, custom_domain: values.custom_domain.trim() || null }
    const saved = await submit(() => (church
      ? api.patch<PlatformChurch>(`/platform/churches/${church.id}/`, body)
      : api.post<PlatformChurch>('/platform/churches/', body))).catch(() => null)
    if (saved) onSaved(saved)
  }
  const secret = church?.has_own_mpesa ? 'Saved. Leave empty to keep it.' : undefined
  return (
    <Modal open wide onClose={onClose} title={church ? `Edit ${church.name}` : 'Add a church'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="church-form" disabled={busy}>{busy ? 'Saving…' : church ? 'Save' : 'Add church'}</button></>}>
      <Alert>{error}</Alert>
      <form id="church-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Church name *" error={errors.name}><input className="input" required value={values.name} onChange={set('name')} /></Field>
        <Field label="Address *" error={errors.slug} hint={church ? "A church's address can't change." : 'Lowercase letters, digits and hyphens.'}>
          <div className="flex items-center">
            <input className="input rounded-r-none font-mono" required disabled={Boolean(church)} value={values.slug}
              onChange={(e) => set('slug')(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="pceasukari" />
            <span className="rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">.{host()}</span>
          </div>
        </Field>
        <Field label="Own domain (optional)" error={errors.custom_domain} hint="e.g. pceasukari.org: point its DNS at this server first." className="sm:col-span-2">
          <input className="input font-mono" value={values.custom_domain} onChange={set('custom_domain')} placeholder="pceasukari.org" />
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--color-primary)]" checked={values.is_active} onChange={set('is_active')} /> Open (its site and admin work)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--color-primary)]" checked={values.is_listed} onChange={set('is_listed')} /> Listed in the church directory</label>

        <h3 className="mt-2 font-semibold text-slate-900 sm:col-span-2">M-PESA (Daraja)</h3>
        <p className="-mt-3 text-xs text-slate-500 sm:col-span-2">The church's own Paybill. Leave empty to use the platform's.</p>
        <Field label="Paybill / till number" error={errors.mpesa_shortcode}><input className="input font-mono" value={values.mpesa_shortcode} onChange={set('mpesa_shortcode')} /></Field>
        <Field label="Type" error={errors.mpesa_shortcode_type}>
          <select className="input" value={values.mpesa_shortcode_type} onChange={set('mpesa_shortcode_type')}><option>Paybill</option><option>Till</option></select>
        </Field>
        <Field label="Passkey" error={errors.mpesa_passkey} hint={secret}><input className="input font-mono" type="password" autoComplete="off" value={values.mpesa_passkey} onChange={set('mpesa_passkey')} /></Field>
        <Field label="Consumer key" error={errors.mpesa_consumer_key} hint={secret}><input className="input font-mono" type="password" autoComplete="off" value={values.mpesa_consumer_key} onChange={set('mpesa_consumer_key')} /></Field>
        <Field label="Consumer secret" error={errors.mpesa_consumer_secret} hint={secret}><input className="input font-mono" type="password" autoComplete="off" value={values.mpesa_consumer_secret} onChange={set('mpesa_consumer_secret')} /></Field>
        <Field label="SasaPay merchant code" error={errors.sasapay_merchant_code}><input className="input font-mono" value={values.sasapay_merchant_code} onChange={set('sasapay_merchant_code')} /></Field>
      </form>
    </Modal>
  )
}

function FirstAdmin({ church, onClose, onDone }: { church: PlatformChurch; onClose: () => void; onDone: (signIn: string) => void }) {
  const { values, set, errors, error, busy, submit } = useForm({ role: 'admin', first_name: '', last_name: '', username: '', email: '', phone_number: '', password: '' })
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const res = await submit(() => api.post<{ sign_in: string }>(`/platform/churches/${church.id}/admins/`, values)).catch(() => null)
    if (res) onDone(res.sign_in)
  }
  return (
    <Modal open onClose={onClose} title={`Add an admin for ${church.name}`}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="admin-form" disabled={busy}>{busy ? 'Creating…' : 'Create admin'}</button></>}>
      <p className="mb-4 text-sm text-slate-600">They sign in at the church's address. A church usually needs one of each.</p>
      <Alert>{error}</Alert>
      <form id="admin-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2" role="radiogroup" aria-label="Role">
          {([['admin', 'Church admin', 'Runs the church: members, giving, Paybill, attendance, SMS.'],
            ['superadmin', 'Super admin', "Manages the church's admin accounts and sees system health."]] as const).map(([key, label, text]) => (
            <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm ${values.role === key ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}>
              <input type="radio" name="role" className="mt-0.5 accent-[var(--color-primary)]" checked={values.role === key} onChange={() => set('role')(key)} />
              <span><span className="font-medium text-slate-900">{label}</span><span className="block text-xs text-slate-500">{text}</span></span>
            </label>
          ))}
        </div>
        <Field label="First name" error={errors.first_name}><input className="input" required value={values.first_name} onChange={set('first_name')} /></Field>
        <Field label="Last name" error={errors.last_name}><input className="input" required value={values.last_name} onChange={set('last_name')} /></Field>
        <Field label="Username" error={errors.username}><input className="input" required autoComplete="off" value={values.username} onChange={set('username')} /></Field>
        <Field label="Phone" error={errors.phone_number}><input className="input" required inputMode="tel" value={values.phone_number} onChange={set('phone_number')} /></Field>
        <Field label="Email" error={errors.email} className="sm:col-span-2"><input className="input" required type="email" value={values.email} onChange={set('email')} /></Field>
        <Field label="Temporary password" error={errors.password} hint="Share it privately; they can change it in Settings." className="sm:col-span-2">
          <input className="input" required type="text" autoComplete="new-password" value={values.password} onChange={set('password')} />
        </Field>
      </form>
    </Modal>
  )
}

/** Platform admins: every church on mKanisa. */
export default function PlatformChurches() {
  const { data, loading, error, reload } = useApi<Page<PlatformChurch> | PlatformChurch[]>('/platform/churches/', { page_size: 500 })
  const rows = Array.isArray(data) ? data : data?.results
  const [editing, setEditing] = useState<PlatformChurch | 'new' | null>(null)
  const [adding, setAdding] = useState<PlatformChurch | null>(null)
  const [notice, setNotice] = useState('')

  const columns: Column<PlatformChurch>[] = [
    { key: 'name', label: 'Church', render: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
    { key: 'url', label: 'Address', render: (c) => <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-brand-700 hover:underline" onClick={(e) => e.stopPropagation()}>{c.domain || c.slug}<ExternalLink className="h-3 w-3" /></a> },
    { key: 'is_active', label: 'Status', render: (c) => <Badge tone={c.is_active ? 'green' : 'slate'}>{c.is_active ? 'Open' : 'Closed'}</Badge> },
    { key: 'has_own_mpesa', label: 'M-PESA', render: (c) => (c.has_own_mpesa ? <span className="inline-flex items-center gap-1 text-xs"><KeyRound className="h-3 w-3" /> Own Paybill {c.mpesa_shortcode}</span> : <span className="text-xs text-slate-500">Platform's</span>) },
    { key: 'member_count', label: 'Members', className: 'text-right' },
    { key: 'admin_count', label: 'Admins', className: 'text-right' },
    { key: 'created_at', label: 'Added', render: (c) => date(c.created_at) },
    { key: 'id', label: '', render: (c) => (
      <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setAdding(c)} title="Add an admin"><UserPlus className="h-4 w-4" /></button>
        <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditing(c)} title="Edit"><Pencil className="h-4 w-4" /></button>
      </span>
    ) },
  ]

  return (
    <>
      <PageHeader title="Churches" subtitle="Every church on the platform: its address, payment accounts and admins."
        actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add a church</button>} />
      <Alert tone="green">{notice}</Alert>
      <Alert>{error?.message}</Alert>
      <Table columns={columns} rows={rows} loading={loading} onRowClick={setEditing}
        empty="No churches yet. Add the first one." />
      {editing && <ChurchForm church={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={(c) => {
        setEditing(null)
        setNotice(editing === 'new' ? `${c.name} is live at ${c.url}. Next, add its first admin.` : `${c.name} saved.`)
        reload()
        if (editing === 'new') setAdding(c)
      }} />}
      {adding && <FirstAdmin church={adding} onClose={() => setAdding(null)} onDone={(signIn) => {
        setAdding(null)
        setNotice(`Admin created. They sign in at ${signIn}`)
        reload()
      }} />}
    </>
  )
}
