import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { KeyRound, Smartphone } from 'lucide-react'
import Logo from '../../components/Logo'
import { Alert, Field, PasswordInput } from '../../components/ui'
import { request } from '../../lib/api'
import { homeFor, useAuth } from '../../lib/auth'
import { CHURCH_NAME } from '../../lib/format'
import { useForm } from '../../lib/useForm'

const RESEND_SECONDS = 60

/** Reset a forgotten password: ask for an SMS code, then enter it with a new password. */
export default function ForgotPassword() {
  const { user, acceptTokens } = useAuth()
  const location = useLocation()
  const [sentTo, setSentTo] = useState(null) // the username / phone the code was requested for
  const [notice, setNotice] = useState('')

  if (user) return <Navigate to={homeFor(user)} replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink via-ink to-brand-800 p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-3 h-20" />
          <h1 className="text-xl font-semibold">{CHURCH_NAME}</h1>
          <p className="text-sm text-slate-500">{sentTo ? 'Choose a new password' : 'Reset your password'}</p>
        </div>
        {sentTo
          ? <ResetStep username={sentTo} notice={notice} onBack={() => setSentTo(null)}
              onReset={async (tokens) => { await acceptTokens(tokens) /* redirect above follows the role */ }} />
          : <RequestStep initial={location.state?.username || ''} onSent={(username, detail) => { setNotice(detail); setSentTo(username) }} />}
        <p className="mt-6 text-center text-sm text-slate-500">
          Remembered it? <Link to="/" className="font-medium text-brand-700 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

function RequestStep({ initial, onSent }) {
  const { values, set, errors, error, busy, submit } = useForm({ username: initial })
  const send = async (e) => {
    e.preventDefault()
    const res = await submit((v) => request('/auth/password-reset/', { method: 'POST', body: v, auth: false })).catch(() => null)
    if (res) onSent(values.username.trim(), res.detail)
  }
  return (
    <>
      <div className="mb-4 flex items-start gap-3 rounded-lg bg-brand-50 px-3 py-3 text-sm text-brand-800">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Enter your username or phone number. We'll text a 6-digit code to the phone number on your account.</p>
      </div>
      <Alert>{error}</Alert>
      <form onSubmit={send} className="space-y-4">
        <Field label="Username or phone number" error={errors.username}>
          <input className="input" autoComplete="username" autoFocus required value={values.username} onChange={set('username')} />
        </Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending code…' : 'Send code'}</button>
      </form>
    </>
  )
}

function ResetStep({ username, notice: initialNotice, onBack, onReset }) {
  const { values, setValues, set, errors, error, busy, submit } = useForm({ code: '', new_password: '', confirm_password: '' })
  const [notice, setNotice] = useState(initialNotice)
  const [resendError, setResendError] = useState('')
  const [wait, setWait] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const reset = async (e) => {
    e.preventDefault()
    setNotice('')
    const res = await submit((v) => request('/auth/password-reset/confirm/', { method: 'POST', body: { username, ...v }, auth: false })).catch(() => null)
    if (res) await onReset(res)
  }

  const resend = async () => {
    setResendError(''); setNotice('')
    try {
      const res = await request('/auth/password-reset/', { method: 'POST', body: { username }, auth: false })
      setNotice(res.detail); setWait(RESEND_SECONDS); setValues((v) => ({ ...v, code: '' }))
    } catch (err) {
      setResendError(err.message)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-start gap-3 rounded-lg bg-brand-50 px-3 py-3 text-sm text-brand-800">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{notice || 'Enter the 6-digit code we sent to your phone.'} The code expires in 10 minutes.</p>
      </div>
      <Alert>{error || resendError}</Alert>
      <form onSubmit={reset} className="space-y-4">
        <Field label="Code" error={errors.code}>
          <input className="input text-center font-mono text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code"
            autoFocus maxLength={6} placeholder="••••••" value={values.code} onChange={(e) => set('code')(e.target.value.replace(/\D/g, ''))} />
        </Field>
        {/* Lets password managers save the new password against the right account */}
        <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
        <Field label="New password" error={errors.new_password} hint="At least 8 characters, not too common or too similar to your name.">
          <PasswordInput autoComplete="new-password" required value={values.new_password} onChange={set('new_password')} />
        </Field>
        <Field label="Confirm new password" error={errors.confirm_password}>
          <PasswordInput autoComplete="new-password" required value={values.confirm_password} onChange={set('confirm_password')} />
        </Field>
        <button className="btn-primary w-full" disabled={busy || values.code.length !== 6}>{busy ? 'Resetting…' : 'Reset password and sign in'}</button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <button type="button" className="text-slate-500 hover:underline" onClick={onBack}>Use a different account</button>
        <button type="button" className="font-medium text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline" disabled={wait > 0} onClick={resend}>
          {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </button>
      </div>
    </div>
  )
}
