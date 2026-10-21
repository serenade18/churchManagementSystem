import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { type LucideIcon, Check, ChevronDown, Clock, FileText } from 'lucide-react'
import { AuthAlert, AuthField, MemberAuthLayout, MemberFooter, authInput, authLabel, authPrimary, churchPhoto, shade } from '../../components/AuthShell'
import { request } from '../../lib/api'
import { GENDERS, MARITAL } from '../../lib/format'
import { branding } from '../../lib/theme'
import { useForm } from '../../lib/useForm'
import type { RegisterPage } from '../../types'

const EMPTY = {
  kind: 'member', first_name: '', last_name: '', other_names: '', phone_number: '', email: '', gender: '',
  date_of_birth: '', marital_status: '', address: '', branch: '', previous_church: '', message: '', consent: false,
}

/** The church's /register page: members and visitors send their details for the church office to review. */
export default function Register() {
  const [branches, setBranches] = useState<RegisterPage['branches']>([])
  const [done, setDone] = useState<{ name: string; detail: string } | null>(null)
  const { values, setValues, set, errors, error, busy, submit } = useForm(EMPTY)
  const more = errors.marital_status || errors.address || errors.previous_church || errors.message // open the extras when one needs fixing

  useEffect(() => {
    request<RegisterPage>('/public/register/', { auth: false }).then((d) => setBranches(d.branches)).catch(() => {})
  }, [])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const body = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ''))
    const res = await submit(() => request<{ detail: string }>('/public/register/', { method: 'POST', body, auth: false })).catch(() => null)
    if (res) {
      setDone({ name: values.first_name.trim(), detail: res.detail.replace(/^Thank you, [^!]*!\s*/, '') }) // the heading says thank you
      window.scrollTo(0, 0)
    }
  }

  if (done) {
    const services = (branding.raw?.service_times || '').split('\n').map((line) => line.trim()).filter(Boolean)
    return (
      <div className="min-h-screen bg-mk-ivory font-body leading-relaxed sm:flex sm:items-start sm:justify-center sm:bg-mk-mist sm:px-4 sm:py-10">
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-sidebar text-white sm:min-h-[760px] sm:max-w-[440px] sm:rounded-[28px]">
          <img src={churchPhoto('/landing/hero-congregation.jpg')} alt="" className="absolute inset-0 h-full w-full object-cover object-[40%_50%]" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${shade(55)} 0%, ${shade(35)} 30%, ${shade(94)} 75%)` }} />
          <div className="relative flex flex-1 flex-col gap-6 px-[22px] pb-7 pt-[22px]">
            <Link to="/" className="font-display font-semibold">{branding.name}</Link>
            <div className="mt-auto flex flex-col gap-[18px]" role="status">
              <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white text-brand-700"><Check className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" /></span>
              <h1 className="font-display text-[36px] font-semibold leading-[1.08] tracking-[-0.015em]">Thank you, {done.name}!</h1>
              <p className="text-[17px] text-white/90">{done.detail}</p>
            </div>
            <div className="flex flex-col gap-3.5 rounded-[22px] bg-mk-ivory p-5 text-mk-slate">
              <p className="text-sm font-semibold text-mk-forest">While you wait</p>
              <WaitLink to="/me" icon={FileText} title="See your giving" text="Sign in with this phone, any time" />
              {services.length > 0 && <WaitLink to="/" icon={Clock} title="Service times" text={services.slice(0, 2).join(' · ')} />}
              <button type="button" onClick={() => { setValues(EMPTY); setDone(null) }} className="min-h-11 self-start text-[15px] font-semibold text-brand-700 hover:underline">Register someone else</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const member = values.kind === 'member'
  const field = (key: keyof typeof EMPTY & string, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <AuthField label={label} optional={!props.required} error={errors[key]} hint={hint}>
      <input className={authInput} value={values[key] as string} onChange={set(key)} {...props} />
    </AuthField>
  )
  return (
    <MemberAuthLayout photo={churchPhoto('/landing/community.jpg')} compact back="/">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest">Join the church</h1>
        <p className="text-mk-muted">Two minutes. The church office reviews your details and sends you an SMS.</p>
      </div>

      <AuthAlert>{error}</AuthAlert>
      <form onSubmit={send} className="flex flex-col gap-[18px]">
        <fieldset className="flex flex-col gap-2">
          <legend className={`${authLabel} mb-2`}>I'm joining as</legend>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-mk-mist p-1">
            {[['member', 'A member'], ['visitor', 'A visitor']].map(([key, label]) => (
              <label key={key} className={`relative flex min-h-11 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${values.kind === key ? 'bg-white font-semibold text-mk-forest shadow-[0_1px_3px_rgba(16,43,39,0.12)]' : 'font-medium text-mk-muted'}`}>
                <input type="radio" name="kind" value={key} checked={values.kind === key} onChange={() => set('kind')(key)} className="absolute h-px w-px opacity-0" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {field('first_name', 'First name', { required: true, autoComplete: 'given-name' })}
        {field('last_name', 'Last name', { required: true, autoComplete: 'family-name' })}
        {member && field('other_names', 'Other names', { autoComplete: 'additional-name' })}
        {field('phone_number', 'Phone number', { required: true, type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '0712 345 678' }, "We'll SMS you here.")}
        {field('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'you@example.com' })}

        {member && (
          <>
            {field('date_of_birth', 'Date of birth', { type: 'date', autoComplete: 'bday' })}
            <fieldset>
              <legend className={`${authLabel} mb-2`}>Gender <span className="font-normal text-mk-muted">(optional)</span></legend>
              <div className="flex gap-2.5">
                {Object.entries(GENDERS).map(([key, label]) => (
                  <label key={key} className={`flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${values.gender === key ? 'border-2 border-brand-600 bg-brand-50 font-semibold text-mk-forest' : 'border border-mk-border bg-white font-medium text-mk-slate'}`}>
                    <input type="radio" name="gender" value={key} checked={values.gender === key} onChange={() => set('gender')(key)} className="accent-[var(--color-primary)]" />
                    {label}
                  </label>
                ))}
              </div>
              {errors.gender && <span className="text-[13px] text-[#8E2F22]">{errors.gender}</span>}
            </fieldset>
            {branches.length > 0 && (
              <AuthField label="Which branch will you attend?" error={errors.branch}>
                <span className="relative block">
                  <select className={`${authInput} appearance-none pr-11`} value={values.branch} onChange={set('branch')}>
                    <option value="">Not sure yet</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-[17px] h-[18px] w-[18px] text-mk-muted" aria-hidden="true" />
                </span>
              </AuthField>
            )}
          </>
        )}

        <details className="group rounded-[14px] border border-mk-border bg-white" open={Boolean(more)}>
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold text-mk-forest [&::-webkit-details-marker]:hidden">
            {member ? 'More about you' : 'A note for the church'}
            <span className="flex items-center gap-1.5 text-sm font-normal text-mk-muted">Optional<ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" /></span>
          </summary>
          <div className="flex flex-col gap-[18px] border-t border-mk-border px-4 pb-4 pt-4">
            {member && (
              <>
                <AuthField label="Marital status" optional error={errors.marital_status}>
                  <span className="relative block">
                    <select className={`${authInput} appearance-none pr-11`} value={values.marital_status} onChange={set('marital_status')}>
                      <option value="">Prefer not to say</option>
                      {Object.entries(MARITAL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-[17px] h-[18px] w-[18px] text-mk-muted" aria-hidden="true" />
                  </span>
                </AuthField>
                {field('address', 'Where you live (estate / area)', { autoComplete: 'address-level3' })}
                {field('previous_church', 'Previous church')}
              </>
            )}
            <AuthField label={member ? 'Anything you would like us to know?' : 'How did you hear about us? Anything we can pray for?'} optional error={errors.message}>
              <textarea className={`${authInput} h-auto py-3`} rows={3} maxLength={1000} value={values.message} onChange={set('message')} />
            </AuthField>
          </div>
        </details>
        {member && <p className="-mt-2.5 text-[13px] text-mk-muted">Marital status, where you live, your previous church, and a note for the pastor.</p>}

        <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-mk-border bg-white px-4 py-3.5 text-sm text-mk-slate">
          <input type="checkbox" className="mt-0.5 h-5 w-5 flex-none accent-[var(--color-primary)]" checked={values.consent} onChange={set('consent')} required />
          <span>I agree to {branding.name} keeping these details to contact me and look after my membership. They are never shared with other churches.
            {errors.consent && <span className="mt-1 block text-[#8E2F22]">{errors.consent}</span>}</span>
        </label>
        <button className={`${authPrimary} h-14 text-[17px]`} disabled={busy}>{busy ? 'Sending…' : 'Send my details'}</button>
      </form>

      <p className="text-center text-[15px] text-mk-muted">Already a member? <Link to="/me" className="font-semibold text-brand-700 hover:underline">See your giving</Link></p>
      <MemberFooter />
    </MemberAuthLayout>
  )
}

function WaitLink({ to, icon: Icon, title, text }: { to: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link to={to} className="flex min-h-12 items-center gap-3.5 text-mk-forest hover:text-brand-800">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-col"><span className="font-semibold">{title}</span><span className="truncate text-[13px] text-mk-muted">{text}</span></span>
    </Link>
  )
}
