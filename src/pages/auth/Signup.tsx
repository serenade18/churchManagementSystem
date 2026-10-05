import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Smartphone } from 'lucide-react'
import Logo from '../../components/Logo'
import { Alert, Field, PasswordInput } from '../../components/ui'
import { errorMessage, request } from '../../lib/api'
import { homeFor, useAuth } from '../../lib/auth'
import { branding } from '../../lib/theme'
import { useForm } from '../../lib/useForm'
import type { Tokens } from '../../types'

/** An account waiting for its phone to be verified. */
interface Pending {
  username: string
  phone: string
  fresh: boolean // just created here (not sent over from the login page)
  notice?: string
  smsFailed?: boolean
}

interface SignupResponse {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sidebar via-sidebar to-primary-hover p-4">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-3 h-20" />
          <h1 className="text-xl font-semibold">{branding.name}</h1>
          <p className="text-sm text-slate-500">{pending ? 'Verify your phone number' : superadmin ? 'Create a super admin account' : 'Create an admin account'}</p>
        </div>
        {pending
          ? <VerifyStep pending={pending} onBack={() => setPending(null)}
              onVerified={async (tokens) => { await acceptTokens(tokens) /* redirect above follows the role */ }} />
          : <DetailsStep superadmin={superadmin} onCreated={(res) => setPending({ username: res.username, phone: res.phone, fresh: true, notice: res.detail, smsFailed: !res.sms_sent })} />}
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account? <Link to="/" className="font-medium text-brand-700 hover:underline">Sign in</Link>
        </p>
        {!pending && (
          <p className="mt-2 text-center text-xs text-slate-400">
            {superadmin
              ? <Link to="/signup" className="hover:underline">Create a regular admin account instead</Link>
              : <>Setting up the system? <Link to="/signup/superadmin" className="hover:underline">Create a super admin account</Link></>}
          </p>
        )}
      </div>
    </div>
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
    <Field label={label} error={errors[key]}>
      {type === 'password'
        ? <PasswordInput required value={values[key]} onChange={set(key)} {...props} />
        : <input className="input" type={type} required value={values[key]} onChange={set(key)} {...props} />}
    </Field>
  )
  return (
    <>
      <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
        {superadmin
          ? <>Super admins manage all admin accounts and system settings. You need the <strong>setup key</strong> from whoever runs the server. We'll also send a 6-digit code to your phone.</>
          : "We'll send a 6-digit code to your phone to confirm it's yours."}
      </p>
      <Alert>{error}</Alert>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {superadmin && <div className="sm:col-span-2">{input('setup_key', 'Setup key', { type: 'password', autoComplete: 'off', autoFocus: true })}</div>}
        {input('first_name', 'First name', { autoComplete: 'given-name', autoFocus: !superadmin })}
        {input('last_name', 'Last name', { autoComplete: 'family-name' })}
        {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {input('phone_number', 'Phone number', { inputMode: 'tel', placeholder: '0712 345 678', autoComplete: 'tel' })}
        <div className="sm:col-span-2">{input('username', 'Username', { autoComplete: 'username' })}</div>
        {input('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
        {input('confirm_password', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}
        <p className="-mt-2 text-xs text-slate-500 sm:col-span-2">At least 8 characters, not too common or too similar to your name.</p>
        <button className="btn-primary w-full sm:col-span-2" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </>
  )
}

function VerifyStep({ pending, onBack, onVerified }: { pending: Pending; onBack: () => void; onVerified: (tokens: Tokens) => Promise<void> }) {
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState(pending.phone)
  const [error, setError] = useState(pending.smsFailed ? pending.notice : '')
  const [notice, setNotice] = useState(pending.smsFailed ? '' : pending.notice || '')
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
      const res = await request<Tokens>('/auth/signup/verify/', { method: 'POST', body: { username: pending.username, code }, auth: false })
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
      const res = await request<{ detail: string; phone: string }>('/auth/signup/resend/', { method: 'POST', body: { username: pending.username }, auth: false })
      setNotice(res.detail); setPhone(res.phone); setWait(RESEND_SECONDS); setCode('')
    } catch (err) {
      setError(errorMessage(err))
      const seconds = Number(errorMessage(err).match(/wait (\d+) seconds/)?.[1])
      if (seconds) setWait(seconds)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-start gap-3 rounded-lg bg-brand-50 px-3 py-3 text-sm text-brand-800">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          {phone ? <>Enter the 6-digit code we sent to <strong>{phone}</strong>.</> : <>Your phone number isn't verified yet. Tap <strong>Send code</strong> to get a code by SMS.</>}
          {' '}It expires in 10 minutes.
        </p>
      </div>
      <Alert tone="green">{notice}</Alert>
      <Alert>{error}</Alert>
      <form onSubmit={verify} className="space-y-4">
        <input className="input text-center font-mono text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code"
          autoFocus maxLength={6} placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Verification code" />
        <button className="btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify and sign in'}</button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        {pending.fresh ? <button type="button" className="text-slate-500 hover:underline" onClick={onBack}>Change details</button> : <span />}
        <button type="button" className="font-medium text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline" disabled={wait > 0} onClick={resend}>
          {wait > 0 ? `Resend code in ${wait}s` : phone ? 'Resend code' : 'Send code'}
        </button>
      </div>
    </div>
  )
}
