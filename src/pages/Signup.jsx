import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Smartphone } from 'lucide-react'
import Logo from '../components/Logo'
import { Alert, Field } from '../components/ui'
import { request } from '../lib/api'
import { useAuth } from '../lib/auth'
import { CHURCH_NAME } from '../lib/format'
import { useForm } from '../lib/useForm'

const RESEND_SECONDS = 60

/** Create an admin account: fill in details, then confirm the phone with the SMS code. */
export default function Signup() {
  const { user, acceptTokens } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Coming from the login page with an unverified account: go straight to the code step.
  const [pending, setPending] = useState(params.get('verify') ? { username: params.get('verify'), phone: '', fresh: false } : null)

  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 p-4">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-3 h-20" />
          <h1 className="text-xl font-semibold">{CHURCH_NAME}</h1>
          <p className="text-sm text-slate-500">{pending ? 'Verify your phone number' : 'Create an admin account'}</p>
        </div>
        {pending
          ? <VerifyStep pending={pending} onBack={() => setPending(null)}
              onVerified={async (tokens) => { await acceptTokens(tokens); navigate('/dashboard', { replace: true }) }} />
          : <DetailsStep onCreated={(res) => setPending({ username: res.username, phone: res.phone, fresh: true, notice: res.detail, smsFailed: !res.sms_sent })} />}
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account? <Link to="/" className="font-medium text-brand-700 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

function DetailsStep({ onCreated }) {
  const { values, set, errors, error, busy, submit } = useForm({
    first_name: '', last_name: '', username: '', email: '', phone_number: '', password: '', confirm_password: '',
  })
  const save = async (e) => {
    e.preventDefault()
    const res = await submit((v) => request('/auth/signup/', { method: 'POST', body: v, auth: false })).catch(() => null)
    if (res) onCreated(res)
  }
  const input = (key, label, props = {}) => (
    <Field label={label} error={errors[key]}>
      <input className="input" required value={values[key]} onChange={set(key)} {...props} />
    </Field>
  )
  return (
    <>
      <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
        We'll send a 6-digit code to your phone to confirm it's yours.
      </p>
      <Alert>{error}</Alert>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {input('first_name', 'First name', { autoComplete: 'given-name', autoFocus: true })}
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

function VerifyStep({ pending, onBack, onVerified }) {
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

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await request('/auth/signup/verify/', { method: 'POST', body: { username: pending.username, code }, auth: false })
      await onVerified(res)
    } catch (err) {
      setNotice('')
      setError(err.message.replace(/^code: /, ''))
      setBusy(false)
    }
  }

  const resend = async () => {
    setError(''); setNotice('')
    try {
      const res = await request('/auth/signup/resend/', { method: 'POST', body: { username: pending.username }, auth: false })
      setNotice(res.detail); setPhone(res.phone); setWait(RESEND_SECONDS); setCode('')
    } catch (err) {
      setError(err.message)
      const seconds = Number(err.message.match(/wait (\d+) seconds/)?.[1])
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
