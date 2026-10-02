import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Church } from 'lucide-react'
import { Alert } from '../components/ui'
import { useAuth } from '../lib/auth'
import { CHURCH_NAME } from '../lib/format'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(form.username, form.password)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      setError(err.status === 401 ? 'Incorrect username or password.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Church /></span>
          <h1 className="text-xl font-semibold">{CHURCH_NAME}</h1>
          <p className="text-sm text-slate-500">Sign in to the admin portal</p>
        </div>
        <Alert>{error}</Alert>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="label">Username</span>
            <input className="input" autoComplete="username" autoFocus required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input className="input" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Want to give? <Link to="/" className="font-medium text-brand-700 hover:underline">Go to the donation page</Link>
        </p>
      </div>
    </div>
  )
}
