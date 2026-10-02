import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'
import { Alert, PasswordInput } from '../components/ui'
import { homeFor, useAuth } from '../lib/auth'
import { CHURCH_NAME } from '../lib/format'

export default function Login() {
  const { user, login } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const [busy, setBusy] = useState(false)

  // Where to go after signing in: the page that sent us here, else the dashboard for this role.
  if (user) return <Navigate to={location.state?.from?.pathname || homeFor(user)} replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setUnverified(false)
    try {
      await login(form.username, form.password) // the redirect above runs once the user is loaded
    } catch (err) {
      setUnverified([].concat(err.data?.code || []).includes('unverified'))
      setError(err.status === 401 ? 'Incorrect username or password.' : err.data?.detail ? [].concat(err.data.detail).join(' ') : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-3 h-24" />
          <h1 className="text-xl font-semibold">{CHURCH_NAME}</h1>
          <p className="text-sm text-slate-500">Sign in to the admin portal</p>
        </div>
        <Alert>{error}</Alert>
        {unverified && (
          <Link to={`/signup?verify=${encodeURIComponent(form.username)}`} className="btn-secondary mb-4 w-full">Verify my phone</Link>
        )}
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="label">Username</span>
            <input className="input" autoComplete="username" autoFocus required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="password" className="label">Password</label>
              <Link to="/forgot-password" state={{ username: form.username }} className="text-xs font-medium text-brand-700 hover:underline">Forgot password?</Link>
            </div>
            <PasswordInput id="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Need an admin account? <Link to="/signup" className="font-medium text-brand-700 hover:underline">Create one</Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          Want to give? <Link to="/give" className="font-medium text-brand-700 hover:underline">Go to the donation page</Link>
        </p>
      </div>
    </div>
  )
}
