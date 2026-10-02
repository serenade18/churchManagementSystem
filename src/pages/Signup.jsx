import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import Logo from '../components/Logo'
import { Alert, Field } from '../components/ui'
import { request } from '../lib/api'
import { useAuth } from '../lib/auth'
import { CHURCH_NAME } from '../lib/format'
import { useForm } from '../lib/useForm'

/** Public form to request an admin account. A super admin approves it before it can sign in. */
export default function Signup() {
  const { user } = useAuth()
  const [done, setDone] = useState('')
  const { values, set, errors, error, busy, submit } = useForm({
    first_name: '', last_name: '', username: '', email: '', phone_number: '', password: '', confirm_password: '',
  })

  if (user) return <Navigate to="/dashboard" replace />

  const save = async (e) => {
    e.preventDefault()
    const res = await submit((v) => request('/auth/signup/', { method: 'POST', body: v, auth: false })).catch(() => null)
    if (res) setDone(res.detail)
  }

  const input = (key, label, props = {}) => (
    <Field label={label} error={errors[key]}>
      <input className="input" required value={values[key]} onChange={set(key)} {...props} />
    </Field>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 p-4">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-3 h-20" />
          <h1 className="text-xl font-semibold">{CHURCH_NAME}</h1>
          <p className="text-sm text-slate-500">Request an admin account</p>
        </div>

        {done ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
            <p className="font-semibold text-slate-900">Request sent</p>
            <p className="mt-2 text-sm text-slate-600">{done}</p>
            <Link to="/" className="btn-primary mt-6">Back to sign in</Link>
          </div>
        ) : (
          <>
            <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
              A super admin must approve your request before you can sign in. You'll get an SMS once it's approved.
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
              <button className="btn-primary w-full sm:col-span-2" disabled={busy}>{busy ? 'Sending…' : 'Request access'}</button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account? <Link to="/" className="font-medium text-brand-700 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
