import { useEffect, useState, type FormEvent } from 'react'
import { AuthAlert, AuthField, MemberAuthLayout, MemberFooter, authInput, authPrimary, churchPhoto } from '../../components/AuthShell'
import { request } from '../../lib/api'
import { branding } from '../../lib/theme'
import { useForm } from '../../lib/useForm'
import { Done } from './CheckIn'

// The church's /pray page: anyone sends a prayer request to its leaders, with their name or without.

const EMPTY = { request: '', name: '', phone_number: '', branch: '', confidential: false, wants_contact: false }

export default function Pray() {
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([])
  const [done, setDone] = useState('')
  const { values, setValues, set, errors, error, busy, submit } = useForm(EMPTY)

  useEffect(() => {
    request<{ branches: { id: number; name: string }[] }>('/public/prayer/', { auth: false }).then((d) => setBranches(d.branches)).catch(() => {})
  }, [])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const body = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ''))
    const res = await submit(() => request<{ detail: string }>('/public/prayer/', { method: 'POST', body, auth: false })).catch(() => null)
    if (res) { setDone(res.detail); window.scrollTo(0, 0) }
  }

  return (
    <MemberAuthLayout photo={churchPhoto('/landing/community.jpg')} compact back="/">
      {done ? (
        <Done title="Your request is with us">
          <p>{done}</p>
          <button type="button" onClick={() => { setValues(EMPTY); setDone('') }} className="mt-3 min-h-11 font-semibold text-brand-700 hover:underline">Send another request</button>
        </Done>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-mk-muted">{branding.name}</p>
            <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest">Send a prayer request</h1>
            <p className="text-mk-muted">Our pastors and leaders will pray with you. Your name and number are optional.</p>
          </div>
          <AuthAlert>{error}</AuthAlert>
          <form onSubmit={send} className="flex flex-col gap-[18px]">
            <AuthField label="What would you like us to pray for?" error={errors.request}>
              <textarea className={`${authInput} h-auto min-h-36 py-3`} required value={values.request} onChange={set('request')} />
            </AuthField>
            <AuthField label="Your name" optional error={errors.name}>
              <input className={authInput} autoComplete="name" value={values.name} onChange={set('name')} />
            </AuthField>
            <AuthField label="Phone number" optional error={errors.phone_number} hint="So someone can reach you, if you'd like.">
              <input className={authInput} type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={values.phone_number} onChange={set('phone_number')} />
            </AuthField>
            {branches.length > 1 && (
              <AuthField label="Branch" optional error={errors.branch}>
                <select className={authInput} value={values.branch} onChange={set('branch')}>
                  <option value="">Choose…</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </AuthField>
            )}
            <label className="flex items-start gap-3 text-[15px] text-mk-slate">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-primary)]" checked={values.wants_contact} onChange={set('wants_contact')} />
              I’d like someone to call or visit me
            </label>
            <label className="flex items-start gap-3 text-[15px] text-mk-slate">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-primary)]" checked={values.confidential} onChange={set('confidential')} />
              Keep it confidential: only the pastors see it
            </label>
            <button className={authPrimary} disabled={busy}>{busy ? 'Sending…' : 'Send my request'}</button>
          </form>
        </>
      )}
      <div className="mt-auto pt-4"><MemberFooter /></div>
    </MemberAuthLayout>
  )
}
