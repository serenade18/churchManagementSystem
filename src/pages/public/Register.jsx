import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, UserPlus } from 'lucide-react'
import { Alert, Field, Select } from '../../components/ui'
import { request } from '../../lib/api'
import { GENDERS, MARITAL } from '../../lib/format'
import { branding } from '../../lib/theme'
import { useForm } from '../../lib/useForm'
import PublicLayout from './PublicLayout'

const EMPTY = {
  kind: 'member', first_name: '', last_name: '', other_names: '', phone_number: '', email: '', gender: '',
  date_of_birth: '', marital_status: '', address: '', branch: '', previous_church: '', message: '', consent: false,
}

/** The church's /register page: members and visitors send their details for the church office to review. */
export default function Register() {
  const [branches, setBranches] = useState([])
  const [done, setDone] = useState('')
  const { values, setValues, set, errors, error, busy, submit } = useForm(EMPTY)

  useEffect(() => {
    request('/public/register/', { auth: false }).then((d) => setBranches(d.branches)).catch(() => {})
  }, [])

  const send = async (e) => {
    e.preventDefault()
    const body = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ''))
    const res = await submit(() => request('/public/register/', { method: 'POST', body, auth: false })).catch(() => null)
    if (res) {
      setDone(res.detail)
      window.scrollTo(0, 0)
    }
  }

  if (done) {
    return (
      <PublicLayout width="max-w-xl">
        <div className="card p-6 text-center sm:p-8">
          <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-500" />
          <h1 className="text-xl font-semibold">Details received</h1>
          <p className="mt-2 text-sm text-slate-600">{done}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/" className="btn-secondary">Back to home</Link>
            <button className="btn-primary" onClick={() => { setValues(EMPTY); setDone('') }}>Register someone else</button>
          </div>
        </div>
      </PublicLayout>
    )
  }

  const member = values.kind === 'member'
  return (
    <PublicLayout width="max-w-xl">
      <div className="card p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Join {branding.name}</h1>
            <p className="text-sm text-slate-500">Share your details and the church office will be in touch. It takes two minutes.</p>
          </div>
          <UserPlus className="h-7 w-7 shrink-0 text-brand-700" />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="I am">
          {[['member', 'I want to become a member'], ['visitor', "I'm visiting"]].map(([key, label]) => (
            <button key={key} type="button" role="radio" aria-checked={values.kind === key} onClick={() => set('kind')(key)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${values.kind === key ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>

        <Alert>{error}</Alert>
        <form onSubmit={send} className="grid gap-4 sm:grid-cols-2">
          <Field label="First name *" error={errors.first_name}><input className="input" required autoComplete="given-name" value={values.first_name} onChange={set('first_name')} /></Field>
          <Field label="Last name *" error={errors.last_name}><input className="input" required autoComplete="family-name" value={values.last_name} onChange={set('last_name')} /></Field>
          <Field label="Phone number *" error={errors.phone_number} hint="We'll SMS you here.">
            <input className="input" required inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" value={values.phone_number} onChange={set('phone_number')} />
          </Field>
          <Field label="Email" error={errors.email}><input className="input" type="email" autoComplete="email" value={values.email} onChange={set('email')} /></Field>
          {member && (
            <>
              <Field label="Other names" error={errors.other_names}><input className="input" value={values.other_names} onChange={set('other_names')} /></Field>
              <Field label="Gender" error={errors.gender}><Select value={values.gender} onChange={set('gender')} options={GENDERS} placeholder="Prefer not to say" /></Field>
              <Field label="Date of birth" error={errors.date_of_birth}><input className="input" type="date" value={values.date_of_birth} onChange={set('date_of_birth')} /></Field>
              <Field label="Marital status" error={errors.marital_status}><Select value={values.marital_status} onChange={set('marital_status')} options={MARITAL} placeholder="Prefer not to say" /></Field>
              {branches.length > 0 && (
                <Field label="Branch / congregation" error={errors.branch}>
                  <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Not sure yet" />
                </Field>
              )}
              <Field label="Where you live (estate / area)" error={errors.address}><input className="input" value={values.address} onChange={set('address')} /></Field>
              <Field label="Previous church" error={errors.previous_church} className="sm:col-span-2"><input className="input" value={values.previous_church} onChange={set('previous_church')} /></Field>
            </>
          )}
          <Field label={member ? 'Anything you would like us to know?' : 'How did you hear about us? Anything we can pray for?'} error={errors.message} className="sm:col-span-2">
            <textarea className="input" rows={3} maxLength={1000} value={values.message} onChange={set('message')} />
          </Field>
          <label className="flex items-start gap-3 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" checked={values.consent} onChange={set('consent')} required />
            <span>I agree that {branding.name} may keep these details to stay in touch with me. They are never shared with other churches.
              {errors.consent && <span className="block text-red-600">{errors.consent}</span>}</span>
          </label>
          <button className="btn-primary py-3 sm:col-span-2" disabled={busy}>{busy ? 'Sending…' : 'Send my details'}</button>
        </form>
      </div>
    </PublicLayout>
  )
}
