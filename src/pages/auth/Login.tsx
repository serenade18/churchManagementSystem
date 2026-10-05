import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Logo from '../../components/Logo'
import { Alert, PasswordInput } from '../../components/ui'
import { errorMessage, type ApiError } from '../../lib/api'
import { homeFor, useAuth } from '../../lib/auth'
import { branding } from '../../lib/theme'

export default function Login() {
  const { user, login, demoLogin } = useAuth()
  const demo = branding.raw?.demo_enabled // switched on by a super admin
  const openDemo = async () => {
    setBusy(true)
    setError('')
    try { await demoLogin() } catch (err) { setError(errorMessage(err)); setBusy(false) }
  }
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const [busy, setBusy] = useState(false)

  // Where to go after signing in: the page that sent us here, else the dashboard for this role.
  if (user) return <Navigate to={(location.state as { from?: Location } | null)?.from?.pathname || homeFor(user)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setUnverified(false)
    try {
      await login(form.username, form.password) // the redirect above runs once the user is loaded
    } catch (e) {
      const err = e as ApiError
      const data = err.data as { code?: string | string[]; detail?: string | string[] } | null
      setUnverified(([] as string[]).concat(data?.code || []).includes('unverified'))
      setError(err.status === 401 ? 'Incorrect username or password.' : data?.detail ? ([] as string[]).concat(data.detail).join(' ') : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sidebar via-sidebar to-primary-hover p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-3 h-24" />
          <h1 className="text-xl font-semibold">{branding.name}</h1>
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
        {demo && (
          <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-center">
            <p className="mb-2 text-sm text-slate-700">Just looking? Explore the app with sample data.</p>
            <button type="button" className="btn-secondary w-full" onClick={openDemo} disabled={busy}>Explore the demo (view only)</button>
          </div>
        )}
        {!demo && (
          <p className="mt-6 text-center text-sm text-slate-500">
            Need an admin account? <Link to="/signup" className="font-medium text-brand-700 hover:underline">Create one</Link>
          </p>
        )}
        <p className="mt-2 text-center text-sm text-slate-500">
          Want to give? <Link to="/give" className="font-medium text-brand-700 hover:underline">Go to the donation page</Link>
        </p>
      </div>
    </div>
  )
}
