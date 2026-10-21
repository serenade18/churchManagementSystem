import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Smartphone } from 'lucide-react'
import { PasswordInput } from '../../components/ui'
import { AuthAlert, AuthField, AuthTitle, CodeInput, ResendCode, SignupSteps, StaffAuthLayout, authInput, authPassword, authPrimary, maskPhone } from '../../components/AuthShell'
import { errorMessage, request } from '../../lib/api'
import { homeFor, useAuth } from '../../lib/auth'
import { branding } from '../../lib/theme'
import { useForm } from '../../lib/useForm'
import type { Tokens } from '../../types'

/** An account waiting for its phone to be verified. */
export interface Pending {
  username: string
  phone: string
  fresh: boolean // just created here (not sent over from the login page)
  notice?: string
  smsFailed?: boolean
}

export interface SignupResponse {
  username: string
  phone: string
  detail: string
  sms_sent: boolean
}

const RESEND_SECONDS = 60

/**
 * Create an account: fill in details, then confirm the phone with the SMS code.
 * ``superadmin`` mode adds the server's setup key and creates a super admin.
 */
export default function Signup({ superadmin = false }: { superadmin?: boolean }) {
  const { user, acceptTokens } = useAuth()
  const [params] = useSearchParams()
  // Coming from the login page with an unverified account: go straight to the code step.
  const [pending, setPending] = useState<Pending | null>(params.get('verify') ? { username: params.get('verify')!, phone: '', fresh: false } : null)

  if (user) return <Navigate to={homeFor(user)} replace />

  const title = pending ? 'Check your phone' : branding.platform ? 'Create a platform admin account' : superadmin ? 'Create a super admin account' : 'Create a staff account'
  const aside = superadmin
    ? (
      <div className="flex flex-col gap-3.5">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/80">{branding.platform ? 'Platform admin' : 'Super admin'}</p>
        <p className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.015em] sm:text-[40px]">You'll need the setup key from whoever runs the server.</p>
      </div>
    )
    : <SignupSteps current={pending ? 2 : 1} />

  return (
    <StaffAuthLayout aside={aside} width={pending ? 'max-w-[420px]' : 'max-w-[480px]'}>
      {pending && <PhoneTile />}
      <AuthTitle step={superadmin ? undefined : pending ? 'Step 2 of 3' : 'Step 1 of 3'} title={title}>
        {!pending && !superadmin && <>For people who work in the church office. Members don't need an account: they <Link to="/me" className="font-semibold text-brand-700 hover:underline">sign in with their phone</Link>.</>}
      </AuthTitle>
      {pending
        ? <VerifyStep pending={pending} onBack={() => setPending(null)}
            onVerified={async (tokens: Tokens) => { await acceptTokens(tokens) /* redirect above follows the role */ }} />
        : <DetailsStep superadmin={superadmin} onCreated={(res) => setPending({ username: res.username, phone: res.phone, fresh: true, notice: res.detail, smsFailed: !res.sms_sent })} />}
      <p className="text-center text-[15px] text-mk-muted">
        Already have an account? <Link to="/admin" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
      </p>
    </StaffAuthLayout>
  )
}

function DetailsStep({ onCreated, superadmin }: { onCreated: (res: SignupResponse) => void; superadmin: boolean }) {
  const { values, set, errors, error, busy, submit } = useForm<Record<string, string>>({
    first_name: '', last_name: '', username: '', email: '', phone_number: '', password: '', confirm_password: '',
    ...(superadmin ? { setup_key: '' } : {}),
  })
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const endpoint = superadmin ? '/auth/superadmin-signup/' : '/auth/signup/'
    const res = await submit((v) => request<SignupResponse>(endpoint, { method: 'POST', body: v, auth: false })).catch(() => null)
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
        {superadmin && <div className="sm:col-span-2">{input('setup_key', 'Setup key', { type: 'password', autoComplete: 'off', autoFocus: true })}</div>}
        {input('first_name', 'First name', { autoComplete: 'given-name', autoFocus: !superadmin })}
        {input('last_name', 'Last name', { autoComplete: 'family-name' })}
        {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {input('phone_number', 'Phone number', { type: 'tel', inputMode: 'tel', placeholder: '0712 345 678', autoComplete: 'tel' })}
        <div className="sm:col-span-2">{input('username', 'Username', { autoComplete: 'username' })}</div>
        {input('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
        {input('confirm_password', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}
        <p className="-mt-2 text-[13px] text-mk-muted sm:col-span-2">At least 8 characters, not too common or too similar to your name.</p>
        <p className="flex gap-3 rounded-[14px] border border-mk-border bg-white px-4 py-3.5 text-sm text-mk-slate sm:col-span-2">
          <Smartphone className="mt-0.5 h-5 w-5 flex-none text-brand-700" aria-hidden="true" />
          <span>
            {superadmin
              ? branding.platform
                ? "Platform admins add churches and manage mKanisa. We'll SMS a 6-digit code to confirm your phone."
                : "Super admins manage every admin account and the church's settings. We'll SMS a 6-digit code to confirm your phone."
              : "We'll send a 6-digit code to your phone to confirm it's yours. Then the church's owner chooses your role."}
          </span>
        </p>
        <button className={`${authPrimary} sm:col-span-2`} disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </>
  )
}

/** The phone mark above "Check your phone". */
export function PhoneTile() {
  return (
    <span className="-mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
      <Smartphone className="h-6 w-6" aria-hidden="true" />
    </span>
  )
}

const SIGNUP_PATHS = { verify: '/auth/signup/verify/', resend: '/auth/signup/resend/' }

/** Step 2 of a signup: the SMS code. ``paths`` lets another signup (a church registering) use it. */
export function VerifyStep<R = Tokens>({ pending, onBack, onVerified, paths = SIGNUP_PATHS }:
  { pending: Pending; onBack: () => void; onVerified: (res: R) => Promise<void> | void; paths?: typeof SIGNUP_PATHS }) {
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState(pending.phone)
  const [error, setError] = useState(pending.smsFailed ? pending.notice : '')
  const [notice, setNotice] = useState('') // the sentence above already says a code was sent; this is for resends
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(pending.fresh && !pending.smsFailed ? RESEND_SECONDS : 0)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await request<R>(paths.verify, { method: 'POST', body: { username: pending.username, code }, auth: false })
      await onVerified(res)
    } catch (err) {
      setNotice('')
      setError(errorMessage(err).replace(/^code: /, ''))
      setBusy(false)
    }
  }

  const resend = async () => {
    setError(''); setNotice('')
    try {
      const res = await request<{ detail: string; phone: string }>(paths.resend, { method: 'POST', body: { username: pending.username }, auth: false })
      setNotice(res.detail); setPhone(res.phone); setWait(RESEND_SECONDS); setCode('')
    } catch (err) {
      setError(errorMessage(err))
      const seconds = Number(errorMessage(err).match(/wait (\d+) seconds/)?.[1])
      if (seconds) setWait(seconds)
    }
  }

  return (
    <>
      <p className="-mt-3 text-mk-muted">
        {phone
          ? <>We sent a 6-digit code by SMS to <span className="whitespace-nowrap font-semibold text-mk-forest">{maskPhone(phone)}</span>. It expires in 10 minutes.</>
          : <>Your phone number isn't verified yet. Tap <span className="font-semibold text-mk-forest">Send code</span> to get a code by SMS.</>}
      </p>
      {notice && <p role="status" className="rounded-[14px] border border-brand-200 bg-brand-50 px-4 py-3 text-[15px] text-brand-800">{notice}</p>}
      <AuthAlert>{error}</AuthAlert>
      <form onSubmit={verify} className="flex flex-col gap-[18px]">
        <CodeInput id="signup-code" label="Verification code" value={code} onChange={setCode} autoFocus invalid={!!error} />
        <button className={authPrimary} disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify and continue'}</button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        {phone
          ? <ResendCode seconds={wait} onResend={resend} />
          : <button type="button" onClick={resend} className="min-h-11 font-semibold text-brand-700 hover:underline">Send code</button>}
        {pending.fresh && <button type="button" className="min-h-11 text-[15px] font-semibold text-brand-700 hover:underline" onClick={onBack}>Change number</button>}
      </div>
    </>
  )
}
