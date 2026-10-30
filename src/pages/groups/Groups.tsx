import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Star, Users } from 'lucide-react'
import { Alert, Field, Modal, PageHeader, Select, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useCan } from '../../lib/access'
import { useApi, useDebounced, useOptions } from '../../lib/hooks'
import { clean, useForm } from '../../lib/useForm'
import type { Branch, Group, GroupKind, Id, LeadOption, Page } from '../../types'

// Departments (choir, ushering, finance...) and groups (youth, women's guild, home fellowships),
// each with its members and team leads. Team leads see only the ones they lead.

export const KINDS: Record<GroupKind, string> = { department: 'Department', group: 'Group' }

/** Create or edit a department or group, and choose its team leads. */
export function GroupForm({ group, onClose, onSaved }: { group?: Group; onClose: () => void; onSaved: (group: Group) => void }) {
  const can = useCan()
  const runs = can('groups', true)
  const branches = useOptions<Branch>('/cms/branches/')
  const leadOptions = useApi<LeadOption[]>(runs ? '/cms/groups/lead-options/' : null).data || []
  const [leads, setLeads] = useState<Id[]>(group?.leads || [])
  const { values, set, errors, error, busy, submit } = useForm({
    name: group?.name || '', kind: group?.kind || 'department' as GroupKind, description: group?.description || '',
    branch: group?.branch || '' as Id | string, is_active: group?.is_active ?? true,
  })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    // A team lead (not running groups) may change only the name and description.
    const payload = runs
      ? { ...clean(values), description: values.description, branch: values.branch || null, is_active: values.is_active, leads }
      : { name: values.name, description: values.description }
    const saved = await submit(() => (group ? api.patch<Group>(`/cms/groups/${group.id}/`, payload) : api.post<Group>('/cms/groups/', payload))).catch(() => null)
    if (saved) onSaved(saved)
  }
  const toggleLead = (id: Id) => setLeads((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  return (
    <Modal open onClose={onClose} title={group ? `Edit ${group.name}` : 'New department or group'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="group-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error}</Alert>
      <form id="group-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" error={errors.name} className="sm:col-span-2"><input className="input" required value={values.name} onChange={set('name')} placeholder="e.g. Choir, Youth fellowship" /></Field>
        {runs && <>
          <Field label="Kind" error={errors.kind}><Select value={values.kind} onChange={set('kind')} options={KINDS} /></Field>
          <Field label="Branch" error={errors.branch}>
            <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Church-wide" />
          </Field>
        </>}
        <Field label="Description" error={errors.description} className="sm:col-span-2">
          <textarea className="input min-h-20" value={values.description} onChange={set('description')} placeholder="What it does, when it meets" />
        </Field>
        {runs && (
          <fieldset className="sm:col-span-2">
            <legend className="label">Team leads</legend>
            <p className="mb-2 text-[13px] text-mk-muted">Staff accounts who lead it. They can add and remove its members, even with no other role. Add accounts on Staff &amp; roles.</p>
            {leadOptions.length ? (
              <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-xl border border-mk-border p-2">
                {leadOptions.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-mk-ivory">
                    <input type="checkbox" checked={leads.includes(u.id)} onChange={() => toggleLead(u.id)} />
                    {u.name}{u.name !== u.username && <span className="text-mk-muted">({u.username})</span>}
                  </label>
                ))}
              </div>
            ) : <p className="text-sm text-mk-muted">No staff accounts yet.</p>}
          </fieldset>
        )}
        {group && runs && (
          <label className="flex items-center gap-2 text-sm text-mk-slate sm:col-span-2">
            <input type="checkbox" checked={values.is_active} onChange={set('is_active')} /> Active. Untick to archive it; its members are kept.
          </label>
        )}
      </form>
    </Modal>
  )
}

function GroupCard({ group }: { group: Group }) {
  const navigate = useNavigate()
  return (
    <li>
      <button onClick={() => navigate(`/groups/${group.id}`)} aria-label={group.name}
        className="flex h-full w-full flex-col gap-3 rounded-2xl border border-mk-border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_16px_32px_-20px_rgba(16,43,39,0.35)]">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-semibold text-mk-forest">{group.name}</span>
            <span className="block text-[13px] text-mk-muted">{KINDS[group.kind]} · {group.branch_name || 'Church-wide'}{!group.is_active && ' · Archived'}</span>
          </span>
          {group.i_lead && <span className="flex flex-none items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700"><Star className="h-3 w-3" aria-hidden="true" /> You lead</span>}
        </span>
        {group.description && <span className="line-clamp-2 text-sm text-mk-slate">{group.description}</span>}
        <span className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-mk-muted">
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden="true" /> {group.member_count} {group.member_count === 1 ? 'member' : 'members'}</span>
          <span>{group.lead_names.length ? `Led by ${group.lead_names.join(', ')}` : 'No team lead yet'}</span>
        </span>
      </button>
    </li>
  )
}

export default function Groups() {
  const can = useCan()
  const navigate = useNavigate()
  const [kind, setKind] = useState<GroupKind | ''>('')
  const [search, setSearch] = useState('')
  const [archived, setArchived] = useState(false)
  const [adding, setAdding] = useState(false)
  const { data, loading, error } = useApi<Page<Group>>('/cms/groups/', { kind, search: useDebounced(search), active: archived ? 'all' : '', page_size: 200 })
  const runs = can('groups')

  return (
    <>
      <PageHeader
        title="Departments & groups"
        subtitle={runs ? 'Ministries and fellowships, who is in them, and who leads them.' : 'The departments and groups you lead.'}
        actions={can('groups', true) && <button className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New department or group</button>}
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {([['', 'All'], ['department', 'Departments'], ['group', 'Groups']] as const).map(([value, label]) => (
            <button key={value} onClick={() => setKind(value)}
              className={`rounded-full border px-3 py-1 text-sm ${kind === value ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700' : 'border-mk-border text-mk-slate hover:bg-mk-ivory'}`}>{label}</button>
          ))}
          {runs && <label className="ml-1 flex items-center gap-2 text-sm text-mk-slate"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Show archived</label>}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mk-muted" />
          <input className="input pl-9" placeholder="Search…" aria-label="Search departments and groups" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <Alert>{error?.message}</Alert>
      {loading && !data ? <Spinner className="mx-auto my-16 h-8 w-8" /> : data?.results.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.results.map((g) => <GroupCard key={g.id} group={g} />)}</ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-mk-border bg-white p-10 text-center text-mk-muted">
          {search || kind ? 'Nothing matches.' : can('groups', true) ? 'No departments or groups yet. Create the first: the choir, the ushers, the youth…' : 'No departments or groups yet.'}
        </p>
      )}
      {adding && <GroupForm onClose={() => setAdding(false)} onSaved={(g) => navigate(`/groups/${g.id}`)} />}
    </>
  )
}
