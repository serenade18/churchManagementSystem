import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Smartphone } from 'lucide-react'
import { PasswordInput } from '../../components/ui'
import { AuthAlert, AuthField, AuthTitle, SignupSteps, StaffAuthLayout, authInput, authPassword, authPrimary } from '../../components/AuthShell'
import { request } from '../../lib/api'
import { COUNTRIES, DEFAULT_COUNTRY } from '../../lib/countries'
import { useForm } from '../../lib/useForm'
import { PhoneTile, VerifyStep, type Pending, type SignupResponse } from '../auth/Signup'

interface Registered {
  name: string
  url: string
  sign_in: string
  username: string
}

const STEPS: [string, string][] = [
  ['Your church', "Its name, its address on mKanisa and you, its owner."],
  ['Confirm your phone', 'Enter the 6-digit code we SMS you. Your church opens straight away.'],
  ['Set it up', 'Sign in at your church\'s address: add your Paybill, branches, staff and members.'],
]

const PATHS = { verify: '/platform/register/verify/', resend: '/platform/register/resend/' }

// Churches live at <slug>.<this domain> (mkanisa.com when running locally); the backend says the
// final address once it's created.
const host = window.location.hostname.replace(/^www\./, '')
const DOMAIN = host === 'localhost' || host === '127.0.0.1' ? 'mkanisa.com' : host
const toSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 40)

/** mkanisa.com/start: a church registers itself, its owner confirms their phone, and it opens. */
export default function RegisterChurch() {
  const [params] = useSearchParams()
  // Sent here from sign in with an unverified owner: straight to the code step.
  const [pending, setPending] = useState<Pending | null>(params.get('verify') ? { username: params.get('verify')!, phone: '', fresh: false } : null)
  const [done, setDone] = useState<Registered | null>(null)
  const step = done ? 3 : pending ? 2 : 1

  return (
    <StaffAuthLayout aside={<SignupSteps current={step} title="Bringing your church to mKanisa" steps={STEPS} />} width={step === 1 ? 'max-w-[520px]' : 'max-w-[420px]'}>
      {done ? (
        <>
          <AuthTitle step="Step 3 of 3" title={`${done.name} is ready`}>
            Your church's address is <span className="font-semibold text-mk-forest">{done.url.replace(/^https?:\/\//, '')}</span>. Sign in there to set up giving, branches and your team.
          </AuthTitle>
          <a href={`${done.sign_in}?username=${encodeURIComponent(done.username)}`} className={authPrimary}>Sign in to {done.name}</a>
        </>
      ) : pending ? (
        <>
          <PhoneTile />
          <AuthTitle step="Step 2 of 3" title="Check your phone" />
          <VerifyStep<Registered> pending={pending} paths={PATHS} onBack={() => setPending(null)} onVerified={setDone} />
        </>
      ) : (
        <>
          <AuthTitle step="Step 1 of 3" title="Bring your church">
            Free to start. Members <Link to="/me" className="font-semibold text-brand-700 hover:underline">sign in to My giving</Link> with their phone instead.
          </AuthTitle>
          <DetailsStep onCreated={(res) => setPending({ username: res.username, phone: res.phone, fresh: true, notice: res.detail, smsFailed: !res.sms_sent })} />
        </>
      )}
      {!done && (
        <p className="text-center text-[15px] text-mk-muted">
          Already on mKanisa? <Link to="/admin" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
        </p>
      )}
    </StaffAuthLayout>
  )
}

function DetailsStep({ onCreated }: { onCreated: (res: SignupResponse) => void }) {
  const { values, set, errors, error, busy, submit } = useForm<Record<string, string>>({
    church_name: '', slug: '', location: '', country: DEFAULT_COUNTRY,
    first_name: '', last_name: '', username: '', email: '', phone_number: '', password: '', confirm_password: '',
  })
  const [slugEdited, setSlugEdited] = useState(false)
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const res = await submit((v) => request<SignupResponse>('/platform/register/', { method: 'POST', body: v, auth: false })).catch(() => null)
    if (res) onCreated(res)
  }
  const input = (key: string, label: string, { type, ...props }: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <AuthField label={label} error={errors[key]}>
      {type === 'password'
        ? <PasswordInput className={authPassword} required value={values[key]} onChange={set(key)} {...props} />
        : <input className={authInput} type={type} required value={values[key]} onChange={set(key)} {...props} />}
    </AuthField>
  )
  return (
    <>
      <AuthAlert>{error}</AuthAlert>
      <form onSubmit={save} className="grid gap-[18px] sm:grid-cols-2">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-brand-700 sm:col-span-2">Your church</p>
        <div className="sm:col-span-2">
          <AuthField label="Church name" error={errors.church_name}>
            <input className={authInput} required autoFocus value={values.church_name} placeholder="PCEA Kiambu"
              onChange={(e) => { set('church_name')(e); if (!slugEdited) set('slug')(toSlug(e.target.value)) }} />
          </AuthField>
        </div>
        <div className="sm:col-span-2">
          <AuthField label="Address" error={errors.slug} hint="Members open your church's site here. It can't change later.">
            <div className="flex h-[52px] items-center overflow-hidden rounded-xl border border-mk-border bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
              <input className="h-full min-w-0 flex-1 bg-transparent pl-4 text-base text-mk-forest outline-none" required value={values.slug}
                aria-label="Address" autoCapitalize="none" spellCheck={false} placeholder="pceakiambu"
                onChange={(e) => { setSlugEdited(true); set('slug')(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }} />
              <span className="flex-none pr-4 text-mk-muted">.{DOMAIN}</span>
            </div>
          </AuthField>
        </div>
        <AuthField label="Location" optional error={errors.location}>
          <input className={authInput} value={values.location} onChange={set('location')} placeholder="Kiambu town" />
        </AuthField>
        <AuthField label="Country" error={errors.country}>
          <select className={authInput} value={values.country} onChange={set('country')} autoComplete="country">
            {Object.entries(COUNTRIES).map(([code, c]) => <option key={code} value={code}>{c.name}</option>)}
          </select>
        </AuthField>

        <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-brand-700 sm:col-span-2">You, the church's owner</p>
        {input('first_name', 'First name', { autoComplete: 'given-name' })}
        {input('last_name', 'Last name', { autoComplete: 'family-name' })}
        {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {input('phone_number', 'Phone number', { type: 'tel', inputMode: 'tel', placeholder: COUNTRIES[values.country]?.example, autoComplete: 'tel' })}
        <div className="sm:col-span-2">{input('username', 'Username', { autoComplete: 'username' })}</div>
        {input('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
        {input('confirm_password', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}
        <p className="-mt-2 text-[13px] text-mk-muted sm:col-span-2">At least 8 characters, not too common or too similar to your name.</p>
        <p className="flex gap-3 rounded-[14px] border border-mk-border bg-white px-4 py-3.5 text-sm text-mk-slate sm:col-span-2">
          <Smartphone className="mt-0.5 h-5 w-5 flex-none text-brand-700" aria-hidden="true" />
          <span>We'll SMS a 6-digit code to confirm your phone. As the owner you can do everything in your church, including adding your team.</span>
        </p>
        <button className={`${authPrimary} sm:col-span-2`} disabled={busy}>{busy ? 'Registering…' : 'Register my church'}</button>
      </form>
    </>
  )
}
