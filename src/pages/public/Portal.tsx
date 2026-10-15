import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { type LucideIcon, Church, ChevronRight, FileText, HeartHandshake, LogOut, Receipt, UserRound } from 'lucide-react'
import { Alert, Field, Modal, Spinner } from '../../components/ui'
import { errorMessage, request } from '../../lib/api'
import { currencyMoney, date, money } from '../../lib/format'
import { portalGet, portalRequest, portalToken } from '../../lib/portal'
import PublicLayout from './PublicLayout'
import type { PortalChurch, PortalGift, PortalGiving, PortalMe } from '../../types'

type QuickAction = [LucideIcon, string, { to: string; target?: string; onClick?: undefined } | { onClick: () => void; to?: undefined; target?: undefined }]

/** Sign in with a phone number and the code we SMS to it. */
function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [phone, setPhone] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try { await action() } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  const send = (e?: FormEvent) => {
    e?.preventDefault()
    run(async () => {
      const res = await request<{ detail: string; phone_number: string }>('/portal/login/', { method: 'POST', body: { phone_number: phone }, auth: false })
      setSentTo(res.phone_number)
      setNote(res.detail)
    })
  }
  const verify = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const res = await request<{ token: string }>('/portal/verify/', { method: 'POST', body: { phone_number: sentTo, code }, auth: false })
      portalToken.set(res.token)
      onSignedIn()
    })
  }

  return (
    <div className="card mx-auto max-w-sm p-6 sm:p-8">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700"><UserRound className="h-6 w-6" /></span>
      <h1 className="text-center text-xl font-semibold">My member portal</h1>
      <p className="mb-5 text-center text-sm text-slate-500">Your giving, receipts and statements in one place. No password needed.</p>
      <Alert>{error}</Alert>
      {sentTo ? (
        <form onSubmit={verify} className="space-y-4">
          <Alert tone="green">{note}</Alert>
          <Field label="6-digit code">
            <input className="input text-center font-mono text-lg tracking-[0.4em]" required autoFocus inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <button className="btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Sign in'}</button>
          <div className="flex justify-between text-sm">
            <button type="button" className="text-slate-500 hover:underline" onClick={() => { setSentTo(null); setCode('') }}>Change number</button>
            <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => send()} disabled={busy}>Send a new code</button>
          </div>
        </form>
      ) : (
        <form onSubmit={send} className="space-y-4">
          <Field label="Your phone number" hint="The number the church has for you, or the one you give with.">
            <input className="input" required autoFocus inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send me a code'}</button>
          <p className="text-center text-sm text-slate-500">Not registered yet? <Link to="/register" className="font-medium text-brand-700 hover:underline">Join the church</Link></p>
        </form>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-100 px-4 py-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{value}</p>
    </div>
  )
}

function Gift({ g }: { g: PortalGift }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><HeartHandshake className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{g.project || g.donation_type}</p>
        <p className="text-xs text-slate-500">{date(g.date)} · {g.channel} · {g.church}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-slate-900">{g.paid_currency ? currencyMoney(g.paid_amount, g.paid_currency) : money(g.amount)}</p>
        <Link to={`/me/receipt/${g.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"><Receipt className="h-3 w-3" /> Receipt</Link>
      </div>
    </div>
  )
}

function GivingTab() {
  const [year, setYear] = useState('')
  const [data, setData] = useState<PortalGiving | null>(null)
  useEffect(() => { portalGet<PortalGiving>('/portal/giving/', { year }).then(setData).catch(() => setData({ years: [], results: [] })) }, [year])
  if (!data) return <Spinner className="mx-auto my-10 h-6 w-6" />
  const shownYear = year || data.years[0] || new Date().getFullYear()
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select className="input w-auto" aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All years</option>
          {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <Link to={`/me/statement?year=${shownYear}`} target="_blank" className="btn-secondary ml-auto"><FileText className="h-4 w-4" /> {shownYear} statement</Link>
      </div>
      {data.results.length
        ? <div className="divide-y divide-slate-200">{data.results.map((g) => <Gift key={g.id} g={g} />)}</div>
        : <p className="py-10 text-center text-sm text-slate-500">No gifts found yet. Gifts made with your phone number or membership number show here.</p>}
    </>
  )
}

function ChurchRow({ church }: { church: PortalChurch }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Church className="h-6 w-6 shrink-0 text-brand-700" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{church.name}</p>
        <p className="text-sm text-slate-500">{church.relationship} · {church.status}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-400" />
    </div>
  )
}

function ProfileDialog({ me, onClose, onSaved }: { me: PortalMe; onClose: () => void; onSaved: (me: PortalMe) => void }) {
  const [values, setValues] = useState({ name: me.person.name, email: me.person.email })
  const [error, setError] = useState('')
  const save = async () => {
    try { onSaved(await portalRequest<PortalMe>('/portal/me/', { method: 'PATCH', body: values })) } catch (e) { setError(errorMessage(e)) }
  }
  return (
    <Modal open onClose={onClose} title="My profile"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></>}>
      <Alert>{error}</Alert>
      <div className="space-y-4">
        <Field label="Phone number" hint="This is how you sign in."><input className="input bg-slate-50" disabled value={me.person.phone_number} /></Field>
        <Field label="Name"><input className="input" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} /></Field>
        <p className="text-xs text-slate-500">This changes your portal profile only. To update your church records, contact the church office.</p>
      </div>
    </Modal>
  )
}

/** The member portal at /me (MKanisa ID): everything linked to the signed-in phone number. */
export default function Portal() {
  const [signedIn, setSignedIn] = useState(Boolean(portalToken.get()))
  const [me, setMe] = useState<PortalMe | null>(null)
  const [tab, setTab] = useState<'overview' | 'giving' | 'churches'>('overview')
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => portalGet<PortalMe>('/portal/me/').then(setMe).catch(() => setSignedIn(Boolean(portalToken.get()))), [])
  useEffect(() => { if (signedIn) load() }, [signedIn, load])
  useEffect(() => {
    const out = () => { setSignedIn(false); setMe(null) }
    window.addEventListener('mk:portal-signed-out', out)
    return () => window.removeEventListener('mk:portal-signed-out', out)
  }, [])

  const signOut = async () => {
    await portalRequest('/portal/logout/', { method: 'POST' }).catch(() => {})
    portalToken.clear()
    setSignedIn(false)
    setMe(null)
  }

  if (!signedIn) return <PublicLayout><SignIn onSignedIn={() => setSignedIn(true)} /></PublicLayout>
  if (!me) return <PublicLayout><Spinner className="mx-auto mt-20 h-8 w-8" /></PublicLayout>

  const first = (me.person.name || '').split(' ')[0]
  const tabs = [['overview', 'Overview'], ['giving', 'Giving'], ['churches', 'Churches']] as const
  return (
    <PublicLayout>
      <div className="card p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:h-16 sm:w-16"><UserRound className="h-6 w-6 sm:h-8 sm:w-8" /></span>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-semibold text-slate-900 sm:text-2xl">Welcome{first ? `, ${first}` : ''}!</h1>
            <p className="text-slate-500">Your faith community, in one place.</p>
          </div>
          <button onClick={signOut} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Sign out" aria-label="Sign out"><LogOut className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="My giving this year" value={money(me.giving.year_total)} />
          <Stat label="My churches" value={me.churches.length} />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-1 rounded-full bg-slate-100 p-1" role="tablist">
          {tabs.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`rounded-full py-2 text-sm font-medium ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
          ))}
        </div>

        <div className="mt-5">
          {tab === 'overview' && (
            <>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Quick actions</h2>
              <div className="grid grid-cols-3 gap-3">
                {([
                  [HeartHandshake, 'Give', { to: '/give' }],
                  [FileText, 'Statement', { to: `/me/statement?year=${me.giving.year}`, target: '_blank' }],
                  [UserRound, 'My Profile', { onClick: () => setEditing(true) }],
                ] satisfies QuickAction[]).map(([Icon, label, props]: QuickAction) => {
                  const cls = 'flex flex-col items-center gap-2 rounded-xl border border-slate-200 py-4 text-sm font-medium text-slate-800 hover:bg-slate-50'
                  return props.to
                    ? <Link key={label} className={cls} to={props.to} target={props.target}><Icon className="h-6 w-6 text-brand-700" />{label}</Link>
                    : <button key={label} className={cls} onClick={props.onClick}><Icon className="h-6 w-6 text-brand-700" />{label}</button>
                })}
              </div>
              <h2 className="mb-3 mt-6 text-lg font-semibold text-slate-900">My churches</h2>
              {me.churches.length
                ? <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">{me.churches.map((c) => <button key={c.name} className="block w-full text-left hover:bg-slate-50" onClick={() => setTab('churches')}><ChurchRow church={c} /></button>)}</div>
                : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                    This phone number isn't on a church's member list yet. <Link to="/register" className="font-medium text-brand-700 hover:underline">Register with the church</Link> and, once approved, it shows here.
                  </p>}
              {me.giving.last_gift && (
                <>
                  <h2 className="mb-1 mt-6 text-lg font-semibold text-slate-900">Latest gift</h2>
                  <Gift g={me.giving.last_gift} />
                </>
              )}
            </>
          )}
          {tab === 'giving' && <GivingTab />}
          {tab === 'churches' && (
            me.churches.length ? me.churches.map((c) => (
              <div key={c.name} className="rounded-xl border border-slate-200">
                <ChurchRow church={c} />
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {c.memberships.map((m) => (
                    <div key={m.membership_number} className="grid grid-cols-2 gap-2 px-4 py-3 text-sm sm:grid-cols-4">
                      <p><span className="block text-xs text-slate-500">Name</span>{m.full_name}</p>
                      <p><span className="block text-xs text-slate-500">Membership no.</span><span className="font-mono">{m.membership_number}</span></p>
                      <p><span className="block text-xs text-slate-500">Branch</span>{m.branch || '—'}</p>
                      <p><span className="block text-xs text-slate-500">Member since</span>{date(m.date_joined)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )) : <p className="py-10 text-center text-sm text-slate-500">No church memberships linked to this phone number yet.</p>
          )}
        </div>
      </div>
      {editing && <ProfileDialog me={me} onClose={() => setEditing(false)} onSaved={(data) => { setMe(data); setEditing(false) }} />}
    </PublicLayout>
  )
}
