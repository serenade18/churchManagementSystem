import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { PasswordInput } from '../../components/ui'
import { AuthAlert, AuthField, AuthTitle, CodeInput, ResendCode, StaffAuthLayout, authInput, authLabel, authPassword, authPrimary } from '../../components/AuthShell'
import { errorMessage, request } from '../../lib/api'
import { homeFor, useAuth } from '../../lib/auth'
import { branding } from '../../lib/theme'
import { useForm } from '../../lib/useForm'
import type { Tokens } from '../../types'

const RESEND_SECONDS = 60

/** Reset a forgotten password: ask for an SMS code, then enter it with a new password. */
export default function ForgotPassword() {
  const { user, acceptTokens } = useAuth()
  const location = useLocation()
  const [sentTo, setSentTo] = useState<string | null>(null) // the username / phone the code was requested for
  const [notice, setNotice] = useState('')

  if (user) return <Navigate to={homeFor(user)} replace />

  const aside = (
    <div className="flex flex-col gap-3.5">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/80">{branding.platform ? 'Platform admin' : 'Church office'}</p>
      <p className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.015em] sm:text-[40px]">A code to your phone, and you're back in.</p>
    </div>
  )

  return (
    <StaffAuthLayout aside={aside}>
      <AuthTitle title={sentTo ? 'Choose a new password' : 'Reset your password'}>
        {sentTo ? null : "Enter your username or phone number. We'll SMS a 6-digit code to the phone on your account."}
      </AuthTitle>
      {sentTo
        ? <ResetStep username={sentTo} notice={notice} onBack={() => setSentTo(null)}
            onReset={async (tokens) => { await acceptTokens(tokens) /* redirect above follows the role */ }} />
        : <RequestStep initial={(location.state as { username?: string } | null)?.username || ''} onSent={(username, detail) => { setNotice(detail); setSentTo(username) }} />}
      <p className="text-center text-[15px] text-mk-muted">
        Remembered it? <Link to="/admin" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
      </p>
    </StaffAuthLayout>
  )
}

function RequestStep({ initial, onSent }: { initial: string; onSent: (username: string, detail: string) => void }) {
  const { values, set, errors, error, busy, submit } = useForm({ username: initial })
  const send = async (e: FormEvent) => {
    e.preventDefault()
    const res = await submit((v) => request<{ detail: string }>('/auth/password-reset/', { method: 'POST', body: v, auth: false })).catch(() => null)
    if (res) onSent(values.username.trim(), res.detail)
  }
  return (
    <>
      <AuthAlert>{error}</AuthAlert>
      <form onSubmit={send} className="flex flex-col gap-[18px]">
        <AuthField label="Username or phone number" error={errors.username}>
          <input className={authInput} autoComplete="username" autoFocus required value={values.username} onChange={set('username')} />
        </AuthField>
        <button className={authPrimary} disabled={busy}>{busy ? 'Sending code…' : 'Send code'}</button>
      </form>
    </>
  )
}

interface ResetStepProps {
  username: string
  notice: string
  onBack: () => void
  onReset: (tokens: Tokens) => Promise<void>
}

function ResetStep({ username, notice: initialNotice, onBack, onReset }: ResetStepProps) {
  const { values, setValues, set, errors, error, busy, submit } = useForm({ code: '', new_password: '', confirm_password: '' })
  const [notice, setNotice] = useState(initialNotice)
  const [resendError, setResendError] = useState('')
  const [wait, setWait] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const reset = async (e: FormEvent) => {
    e.preventDefault()
    setNotice('')
    const res = await submit((v) => request<Tokens>('/auth/password-reset/confirm/', { method: 'POST', body: { username, ...v }, auth: false })).catch(() => null)
    if (res) await onReset(res)
  }

  const resend = async () => {
    setResendError(''); setNotice('')
    try {
      const res = await request<{ detail: string }>('/auth/password-reset/', { method: 'POST', body: { username }, auth: false })
      setNotice(res.detail); setWait(RESEND_SECONDS); setValues((v) => ({ ...v, code: '' }))
    } catch (err) {
      setResendError(errorMessage(err))
    }
  }

  return (
    <>
      <p role="status" className="-mt-3 text-mk-muted">{notice || 'Enter the 6-digit code we sent to your phone.'} The code expires in 10 minutes.</p>
      <AuthAlert>{error || resendError}</AuthAlert>
      <form onSubmit={reset} className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reset-code" className={authLabel}>Code</label>
          <CodeInput id="reset-code" label="Code" value={values.code} onChange={(code) => set('code')(code)} autoFocus invalid={!!errors.code} />
          {errors.code && <span className="text-[13px] text-[#8E2F22]">{errors.code}</span>}
        </div>
        {/* Lets password managers save the new password against the right account */}
        <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
        <AuthField label="New password" error={errors.new_password} hint="At least 8 characters, not too common or too similar to your name.">
          <PasswordInput className={authPassword} autoComplete="new-password" required value={values.new_password} onChange={set('new_password')} />
        </AuthField>
        <AuthField label="Confirm new password" error={errors.confirm_password}>
          <PasswordInput className={authPassword} autoComplete="new-password" required value={values.confirm_password} onChange={set('confirm_password')} />
        </AuthField>
        <button className={authPrimary} disabled={busy || values.code.length !== 6}>{busy ? 'Resetting…' : 'Reset password and sign in'}</button>
      </form>
      <div className="flex flex-col items-center gap-1">
        <ResendCode seconds={wait} onResend={resend} />
        <button type="button" className="min-h-11 text-[15px] font-semibold text-brand-700 hover:underline" onClick={onBack}>Use a different account</button>
      </div>
    </>
  )
}
