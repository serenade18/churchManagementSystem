import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FileText, HeartHandshake, IdCard, LogOut, Receipt, UserRound } from 'lucide-react'
import Logo from '../../components/Logo'
import { Alert, Field, Modal, Spinner } from '../../components/ui'
import { errorMessage, request } from '../../lib/api'
import { currencyMoney, date, money } from '../../lib/format'
import { portalGet, portalRequest, portalToken } from '../../lib/portal'
import { branding } from '../../lib/theme'
import type { PortalGift, PortalGiving, PortalMe } from '../../types'

/** The frame of the member pages: the church's colours, with links to give and to the admin sign-in. */
function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-sidebar via-sidebar to-primary-hover">
      <header className="flex items-center justify-between gap-3 px-4 py-4 text-white sm:px-8">
        <span className="flex items-center gap-3 font-semibold"><Logo tile className="h-11 w-11" /> {branding.name}</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/give" className="text-brand-100 hover:text-white">Give</Link>
          <Link to="/" className="text-brand-100 hover:text-white">Admin login</Link>
        </nav>
      </header>
      <main className="flex flex-1 justify-center p-4 sm:items-start sm:pt-8">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  )
}

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
      <h1 className="text-center text-xl font-semibold">Member sign-in</h1>
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
        <p className="text-xs text-slate-500">{date(g.date)} · {g.channel}</p>
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

function MembershipTab({ me }: { me: PortalMe }) {
  const memberships = me.churches.flatMap((c) => c.memberships)
  if (!memberships.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        This phone number isn't on {branding.name}'s member list yet. Ask the church office to add it to your member record,
        and your membership shows here.
      </p>
    )
  }
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {memberships.map((m) => (
        <div key={m.membership_number} className="grid grid-cols-2 gap-2 px-4 py-3 text-sm sm:grid-cols-4">
          <p><span className="block text-xs text-slate-500">Name</span>{m.full_name}</p>
          <p><span className="block text-xs text-slate-500">Membership no.</span><span className="font-mono">{m.membership_number}</span></p>
          <p><span className="block text-xs text-slate-500">Branch</span>{m.branch || '—'}</p>
          <p><span className="block text-xs text-slate-500">Member since</span>{date(m.date_joined)}</p>
        </div>
      ))}
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
        <p className="text-xs text-slate-500">This changes your sign-in profile only. To update your church records, contact the church office.</p>
      </div>
    </Modal>
  )
}

/** Member sign-in at /me: everything linked to the signed-in phone number. */
export default function Portal() {
  const [signedIn, setSignedIn] = useState(Boolean(portalToken.get()))
  const [me, setMe] = useState<PortalMe | null>(null)
  const [tab, setTab] = useState<'overview' | 'giving' | 'membership'>('overview')
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => portalGet<PortalMe>('/portal/me/').then(setMe).catch(() => setSignedIn(Boolean(portalToken.get()))), [])
  useEffect(() => { if (signedIn) load() }, [signedIn, load])
  useEffect(() => {
    const out = () => { setSignedIn(false); setMe(null) }
    window.addEventListener('cms:portal-signed-out', out)
    return () => window.removeEventListener('cms:portal-signed-out', out)
  }, [])

  const signOut = async () => {
    await portalRequest('/portal/logout/', { method: 'POST' }).catch(() => {})
    portalToken.clear()
    setSignedIn(false)
    setMe(null)
  }

  if (!signedIn) return <MemberLayout><SignIn onSignedIn={() => setSignedIn(true)} /></MemberLayout>
  if (!me) return <MemberLayout><Spinner className="mx-auto mt-20 h-8 w-8 text-white" /></MemberLayout>

  const first = (me.person.name || '').split(' ')[0]
  const tabs = [['overview', 'Overview'], ['giving', 'Giving'], ['membership', 'Membership']] as const
  const action = 'flex flex-col items-center gap-2 rounded-xl border border-slate-200 py-4 text-sm font-medium text-slate-800 hover:bg-slate-50'
  return (
    <MemberLayout>
      <div className="card p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:h-16 sm:w-16"><UserRound className="h-6 w-6 sm:h-8 sm:w-8" /></span>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-semibold text-slate-900 sm:text-2xl">Welcome{first ? `, ${first}` : ''}!</h1>
            <p className="text-slate-500">Your giving with {branding.name}, in one place.</p>
          </div>
          <button onClick={signOut} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Sign out" aria-label="Sign out"><LogOut className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="My giving this year" value={money(me.giving.year_total)} />
          <Stat label="Gifts this year" value={me.giving.year_count} />
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
              <div className="grid grid-cols-3 gap-3">
                <Link className={action} to="/give"><HeartHandshake className="h-6 w-6 text-brand-700" />Give</Link>
                <Link className={action} to={`/me/statement?year=${me.giving.year}`} target="_blank"><FileText className="h-6 w-6 text-brand-700" />Statement</Link>
                <button className={action} onClick={() => setEditing(true)}><IdCard className="h-6 w-6 text-brand-700" />My profile</button>
              </div>
              {me.giving.last_gift && (
                <>
                  <h2 className="mb-1 mt-6 text-lg font-semibold text-slate-900">Latest gift</h2>
                  <Gift g={me.giving.last_gift} />
                </>
              )}
              <h2 className="mb-3 mt-6 text-lg font-semibold text-slate-900">My membership</h2>
              <MembershipTab me={me} />
            </>
          )}
          {tab === 'giving' && <GivingTab />}
          {tab === 'membership' && <MembershipTab me={me} />}
        </div>
      </div>
      {editing && <ProfileDialog me={me} onClose={() => setEditing(false)} onSaved={(data) => { setMe(data); setEditing(false) }} />}
    </MemberLayout>
  )
}
