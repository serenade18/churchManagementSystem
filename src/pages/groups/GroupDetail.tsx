import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, MessageSquare, Pencil, Search, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { Alert, ConfirmDialog, PageHeader, Spinner } from '../../components/ui'
import { api, downloadCsv, errorMessage } from '../../lib/api'
import { useCan } from '../../lib/access'
import { date } from '../../lib/format'
import { useApi, useDebounced } from '../../lib/hooks'
import type { Group, GroupMember, Id } from '../../types'
import { GroupForm, KINDS } from './Groups'

interface Candidate { id: Id; full_name: string; membership_number: string; branch_name: string | null }

/** Search for members to add: only what's needed to pick them, so team leads don't see the whole register. */
function AddMembers({ group, onAdded }: { group: Group; onAdded: (text: string) => void }) {
  const [term, setTerm] = useState('')
  const query = useDebounced(term, 250)
  const [found, setFound] = useState<Candidate[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (query.trim().length < 2) { setFound([]); return }
    let cancelled = false
    api.get<Candidate[]>(`/cms/groups/${group.id}/candidates/`, { search: query.trim() })
      .then((d) => !cancelled && setFound(d)).catch((e) => !cancelled && setError(errorMessage(e)))
    return () => { cancelled = true }
  }, [query, group.id])

  const add = async (m: Candidate) => {
    try {
      await api.post(`/cms/groups/${group.id}/add-members/`, { member_ids: [m.id] })
      setFound((list) => list.filter((x) => x.id !== m.id))
      onAdded(`${m.full_name} added to ${group.name}.`)
    } catch (e) { setError(errorMessage(e)) }
  }

  return (
    <div className="card mb-6 p-5">
      <label htmlFor="add-member" className="mb-2 block font-semibold text-mk-forest">Add members</label>
      <div className="relative">
        <UserPlus className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mk-muted" />
        <input id="add-member" className="input pl-9" autoComplete="off" value={term} onChange={(e) => setTerm(e.target.value)}
          placeholder={`Name, number or phone${group.branch_name ? ` (members of ${group.branch_name})` : ''}`} />
      </div>
      <Alert>{error}</Alert>
      {found.length > 0 && (
        <ul className="mt-2 flex flex-col divide-y divide-mk-mist rounded-xl border border-mk-border">
          {found.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 text-sm">
                <span className="font-medium text-mk-forest">{m.full_name}</span>
                <span className="text-mk-muted"> · <span className="font-mono text-xs">{m.membership_number}</span>{m.branch_name && ` · ${m.branch_name}`}</span>
              </span>
              <button className="btn-secondary min-h-8! px-3! text-sm!" onClick={() => add(m)} aria-label={`Add ${m.full_name}`}>Add</button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && !found.length && !error && <p className="mt-2 text-sm text-mk-muted">No one else matches “{query.trim()}”.</p>}
    </div>
  )
}

export default function GroupDetail() {
  const { id } = useParams()
  const can = useCan()
  const navigate = useNavigate()
  const { data: group, error, reload } = useApi<Group>(`/cms/groups/${id}/`)
  const members = useApi<GroupMember[]>(`/cms/groups/${id}/members/`)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [removing, setRemoving] = useState<GroupMember | null>(null)

  if (error) return <Alert>{error.message}</Alert>
  if (!group) return <div className="py-20"><Spinner className="mx-auto h-8 w-8" /></div>

  const runs = can('groups', true)
  const manages = runs || group.i_lead
  const term = search.trim().toLowerCase()
  const shown = (members.data || []).filter((m) => !term || `${m.full_name} ${m.membership_number} ${m.phone_number}`.toLowerCase().includes(term))
  const changed = (text: string) => { setNotice(text); setActionError(''); members.reload(); reload() }

  const remove = async () => {
    if (!removing) return
    try {
      await api.post(`/cms/groups/${group.id}/remove-members/`, { member_ids: [removing.id] })
      changed(`${removing.full_name} removed from ${group.name}.`)
    } catch (e) { setActionError(errorMessage(e)) }
    setRemoving(null)
  }
  const destroy = async () => {
    try { await api.del(`/cms/groups/${group.id}/`); navigate('/groups') } catch (e) { setActionError(errorMessage(e)); setDeleting(false) }
  }

  return (
    <>
      <Link to="/groups" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-mk-muted hover:text-mk-forest"><ArrowLeft className="h-4 w-4" /> Departments &amp; groups</Link>
      <PageHeader
        title={group.name}
        subtitle={<>{KINDS[group.kind]} · {group.branch_name || 'Church-wide'} · {group.lead_names.length ? `Led by ${group.lead_names.join(', ')}` : 'No team lead yet'}{!group.is_active && ' · Archived'}</>}
        actions={<>
          {can('sms', true) && (members.data?.length || 0) > 0 && (
            <button className="btn-secondary" onClick={() => navigate('/sms', { state: { members: members.data } })}><MessageSquare className="h-4 w-4" /> SMS the group</button>
          )}
          <button className="btn-secondary" onClick={() => downloadCsv(`/cms/groups/${group.id}/export/`, {}, `${group.name}.csv`)}><Download className="h-4 w-4" /> Export</button>
          {manages && <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</button>}
          {runs && <button className="btn-secondary text-danger" onClick={() => setDeleting(true)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>}
        </>}
      />
      {group.description && <p className="-mt-2 mb-6 max-w-3xl whitespace-pre-line text-[15px] text-mk-slate">{group.description}</p>}
      <Alert tone="green">{notice}</Alert>
      <Alert>{actionError}</Alert>
      {manages && group.is_active && <AddMembers group={group} onAdded={changed} />}

      <section aria-labelledby="members-title" className="card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="members-title" className="font-semibold text-mk-forest">Members ({members.data?.length ?? '…'})</h2>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mk-muted" />
            <input className="input pl-9" placeholder="Search members…" aria-label="Search members" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {members.loading && !members.data ? <Spinner className="mx-auto my-8" /> : shown.length ? (
          <ul className="flex flex-col divide-y divide-mk-mist">
            {shown.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  {can('members')
                    ? <Link to={`/members/${m.id}`} className="block truncate font-medium text-mk-forest hover:underline">{m.full_name}</Link>
                    : <span className="block truncate font-medium text-mk-forest">{m.full_name}</span>}
                  <span className="block truncate text-[13px] text-mk-muted">
                    <span className="font-mono">{m.membership_number}</span>{m.phone_number && ` · ${m.phone_number}`}{m.branch_name && ` · ${m.branch_name}`}
                    {` · joined ${date(m.joined_at)}`}{m.status === 'visitor' && ' · visitor'}
                  </span>
                </span>
                {manages && (
                  <button className="btn-secondary min-h-8! px-3! text-sm!" onClick={() => setRemoving(m)} aria-label={`Remove ${m.full_name}`}><UserMinus className="h-4 w-4" /></button>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="py-8 text-center text-sm text-mk-muted">{term ? 'No members match.' : 'No members yet.'}</p>}
      </section>

      {editing && <GroupForm group={group} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); changed('Saved.') }} />}
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} onConfirm={remove} title="Remove member"
        message={removing ? `Remove ${removing.full_name} from ${group.name}? They stay a member of the church.` : ''} />
      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} onConfirm={destroy} title={`Delete ${group.name}`}
        message="Delete it and its member list? The members themselves are kept. To keep its history, archive it instead (Edit)." />
    </>
  )
}
