import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { AuthAlert, AuthField, MemberAuthLayout, MemberFooter, authInput, authLabel, authPrimary, churchPhoto } from '../../components/AuthShell'
import { Spinner } from '../../components/ui'
import { ApiError, errorMessage, request } from '../../lib/api'

// What members see after scanning a check-in QR code (/checkin/<code>): their phone number, then
// they're marked present. The number is remembered on the phone, so next time it's one tap.

const PHONE_KEY = 'mk-checkin-phone'
const remembered = () => { try { return localStorage.getItem(PHONE_KEY) || '' } catch { return '' } }
const remember = (phone: string) => { try { localStorage.setItem(PHONE_KEY, phone) } catch { /* private window */ } }

const longDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const names = (list: string[]) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] || '')

interface About { church: string; name: string; branch: string | null; date: string }
interface Result { service: string; date: string; checked_in: { name: string; already: boolean }[] }
type Reply = Result | (About & { choose: { id: number; name: string }[] })

/** The check mark, a heading and what happened: shared by the QR and SMS-link pages. */
export function Done({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-start gap-4">
      <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-brand-600 text-white"><Check className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" /></span>
      <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest">{title}</h1>
      <div className="text-[17px] text-mk-slate">{children}</div>
      <Link to="/" className="min-h-11 font-semibold text-brand-700 hover:underline">Go to the church page</Link>
    </div>
  )
}

export default function CheckIn() {
  const { code = '' } = useParams()
  const url = `/public/checkin/${code}/`
  const [about, setAbout] = useState<About | null>(null)
  const [closed, setClosed] = useState('')
  const [phone, setPhone] = useState(remembered)
  const [choose, setChoose] = useState<{ id: number; name: string }[] | null>(null)
  const [picked, setPicked] = useState(new Set<number>())
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    request<About>(url, { auth: false }).then(setAbout).catch((e) => setClosed(errorMessage(e)))
  }, [url])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(''); setNotFound(false)
    try {
      const res = await request<Reply>(url, { method: 'POST', auth: false, body: { phone_number: phone, member_ids: [...picked] } })
      remember(phone)
      if ('choose' in res) { setChoose(res.choose); setPicked(new Set()) } else setResult(res)
    } catch (err) {
      const data = err instanceof ApiError ? (err.data as { not_found?: boolean; phone_number?: string[] } | null) : null
      setNotFound(Boolean(data?.not_found))
      setError(data?.phone_number?.[0] || errorMessage(err))
    } finally { setBusy(false) }
  }

  const toggle = (id: number) => setPicked((s) => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next })

  let body: ReactNode
  if (closed) body = <AuthAlert>{closed}</AuthAlert>
  else if (!about) body = <Spinner className="mx-auto my-16 h-8 w-8" />
  else if (result) {
    const fresh = result.checked_in.filter((c) => !c.already).map((c) => c.name)
    const before = result.checked_in.filter((c) => c.already).map((c) => c.name)
    body = (
      <Done title={fresh.length ? `You’re checked in, ${names(fresh)}!` : `Already checked in, ${names(before)}`}>
        <p>{result.service} · {longDate(result.date)}{fresh.length > 0 && ` · ${new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false })}`}</p>
        {fresh.length > 0 && before.length > 0 && <p className="mt-1 text-mk-muted">{names(before)} {before.length === 1 ? 'was' : 'were'} already checked in today.</p>}
        {!fresh.length && <p className="mt-1 text-mk-muted">You only need to check in once a day.</p>}
      </Done>
    )
  } else {
    body = (
      <>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-mk-muted">Check in</p>
          <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest">{about.name}</h1>
          <p className="text-mk-muted">{longDate(about.date)}{about.branch && ` · ${about.branch}`}</p>
        </div>
        {error && (
          <AuthAlert>
            {error}
            {notFound && <> Not a member yet? <Link to="/register" className="font-semibold underline">Register with the church</Link>.</>}
          </AuthAlert>
        )}
        <form onSubmit={send} className="flex flex-col gap-[18px]">
          {choose ? (
            <fieldset className="flex flex-col gap-2.5">
              <legend className={`${authLabel} mb-2`}>Who’s here? Tick everyone who came.</legend>
              {choose.map((m) => (
                <label key={m.id} className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl px-4 ${picked.has(m.id) ? 'border-2 border-brand-600 bg-brand-50 font-semibold text-mk-forest' : 'border border-mk-border bg-white text-mk-slate'}`}>
                  <input type="checkbox" checked={picked.has(m.id)} onChange={() => toggle(m.id)} className="h-5 w-5 accent-[var(--color-primary)]" />
                  {m.name}
                </label>
              ))}
            </fieldset>
          ) : (
            <AuthField label="Your phone number" hint="The number the church has for you. This phone remembers it for next time.">
              <input className={authInput} type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </AuthField>
          )}
          <button className={authPrimary} disabled={busy || (choose !== null && !picked.size)}>{busy ? 'Checking in…' : choose ? 'Check us in' : 'I’m here'}</button>
          {choose && <button type="button" onClick={() => setChoose(null)} className="min-h-11 font-semibold text-brand-700 hover:underline">Use another number</button>}
        </form>
      </>
    )
  }

  return (
    <MemberAuthLayout photo={churchPhoto('/landing/community.jpg')} compact back="/">
      {body}
      <div className="mt-auto pt-4"><MemberFooter /></div>
    </MemberAuthLayout>
  )
}
