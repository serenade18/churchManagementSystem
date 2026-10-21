import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { type LucideIcon, Check, Church, ChevronRight, FileText, HeartHandshake, LogOut, MessageSquareMore, Receipt, UserRound } from 'lucide-react'
import { Alert, Field, Modal, Spinner } from '../../components/ui'
import { AuthAlert, CodeInput, MemberAuthLayout, MemberFooter, ResendCode, authLabel, authPrimary, churchPhoto, maskPhone, useCountdown } from '../../components/AuthShell'
import { errorMessage, request } from '../../lib/api'
import { currencyMoney, date, money } from '../../lib/format'
import { portalGet, portalRequest, portalToken } from '../../lib/portal'
import PublicLayout from './PublicLayout'
import type { PortalChurch, PortalGift, PortalGiving, PortalMe } from '../../types'

type QuickAction = [LucideIcon, string, { to: string; target?: string; onClick?: undefined } | { onClick: () => void; to?: undefined; target?: undefined }]

const RESEND_SECONDS = 60

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
  const [wait, restartWait] = useCountdown(RESEND_SECONDS)
  const send = (e?: FormEvent) => {
    e?.preventDefault()
    run(async () => {
      const res = await request<{ detail: string; phone_number: string }>('/portal/login/', { method: 'POST', body: { phone_number: phone }, auth: false })
      setSentTo(res.phone_number)
      setNote(res.detail)
      restartWait()
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

  const changeNumber = () => { setSentTo(null); setCode(''); setError('') }
  const photo = churchPhoto('/landing/member-giving.jpg')

  if (sentTo) return (
    <MemberAuthLayout photo={photo} compact back={changeNumber}>
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><MessageSquareMore className="h-6 w-6" aria-hidden="true" /></span>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest">Enter the code</h1>
        <p className="text-mk-muted">We sent a 6-digit code by SMS to <span className="whitespace-nowrap font-semibold text-mk-forest">{maskPhone(sentTo)}</span>.</p>
      </div>
      {note && <p role="status" className="sr-only">{note}</p>}
      <AuthAlert>{error}</AuthAlert>
      <form onSubmit={verify} className="flex flex-col gap-[18px]">
        <CodeInput id="portal-code" label="6-digit code" value={code} onChange={setCode} autoFocus invalid={!!error} />
        <button className={authPrimary} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Sign in'}</button>
      </form>
      <div className="flex flex-col items-center gap-1">
        <ResendCode seconds={wait} onResend={() => { setCode(''); send() }} busy={busy} />
        <button type="button" className="min-h-11 text-[15px] font-semibold text-brand-700 hover:underline" onClick={changeNumber}>Use a different number</button>
      </div>
      <p className="mt-auto rounded-[14px] border border-mk-border bg-white px-4 py-3.5 text-[13px] text-mk-muted">The code works once and expires in 10 minutes. The church will never ask you for it.</p>
    </MemberAuthLayout>
  )

  return (
    <MemberAuthLayout photo={photo}>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest">My giving</h1>
        <p className="text-mk-muted">Sign in with your phone. No password needed.</p>
      </div>
      <AuthAlert>{error}</AuthAlert>
      <form onSubmit={send} className="flex flex-col gap-3.5">
        <label htmlFor="portal-phone" className={authLabel}>Your phone number</label>
        <div className="flex h-14 overflow-hidden rounded-[14px] border border-mk-border bg-white focus-within:border-2 focus-within:border-brand-600">
          <span className="flex items-center border-r border-mk-border bg-mk-ivory px-3.5 font-semibold text-mk-forest" aria-hidden="true">+254</span>
          <input id="portal-phone" type="tel" required autoFocus inputMode="tel" autoComplete="tel" placeholder="712 345 678" aria-describedby="portal-phone-hint"
            value={phone} onChange={(e) => setPhone(e.target.value)} className="min-w-0 flex-1 bg-transparent px-3.5 text-lg text-mk-forest outline-none" />
        </div>
        <span id="portal-phone-hint" className="text-[13px] text-mk-muted">The number the church has for you, or the one you give with.</span>
        <button className={`${authPrimary} mt-1`} disabled={busy}>{busy ? 'Sending…' : 'Send me a code'}</button>
      </form>
      <ul className="flex flex-col gap-2 text-sm text-mk-slate">
        {['Every gift, with its receipt', 'Your yearly giving statement', 'Every church you belong to, in one place'].map((perk) => (
          <li key={perk} className="flex items-center gap-2.5"><Check className="h-4 w-4 flex-none text-brand-700" strokeWidth={2.5} aria-hidden="true" />{perk}</li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-3.5">
        <Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-full border border-mk-border bg-white px-5 text-[15px] font-semibold text-mk-forest hover:border-brand-200">Not a member yet? Join the church</Link>
        <MemberFooter />
      </div>
    </MemberAuthLayout>
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

  if (!signedIn) return <SignIn onSignedIn={() => setSignedIn(true)} />
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
                ? <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">{me.churches.map((c) => <button key={c.id} className="block w-full text-left hover:bg-slate-50" onClick={() => setTab('churches')}><ChurchRow church={c} /></button>)}</div>
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
              <div key={c.id} className="mb-3 rounded-xl border border-slate-200">
                <ChurchRow church={c} />
                <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2.5 text-sm">
                  <a href={c.url} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">Visit the church's site</a>
                  <span className="text-slate-300">·</span>
                  <Link to={`/me/statement?year=${me.giving.year}&church=${c.id}`} target="_blank" className="font-medium text-brand-700 hover:underline">{me.giving.year} statement</Link>
                </div>
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
