import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowRight, Check, Lock } from 'lucide-react'
import { PoweredBy } from '../../components/Logo'
import { PasswordInput } from '../../components/ui'
import { AuthAlert, AuthField, AuthTitle, StaffAuthLayout, authInput, authLabel, authPassword, authPrimary, authSecondary } from '../../components/AuthShell'
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

  const aside = branding.platform ? (
    <div className="flex flex-col gap-[22px]">
      <p className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.015em] sm:text-[40px]">Every church on mKanisa, looked after from one place.</p>
      <ul className="flex flex-col gap-2.5 text-[15px] text-mk-ivory/85">
        {['Add a church and invite its first owner', 'Turn a church’s demo on or off', 'See how every church is doing at a glance'].map((duty) => (
          <li key={duty} className="flex gap-2.5"><Check className="mt-1 h-4 w-4 flex-none text-mk-mint" strokeWidth={2.5} aria-hidden="true" />{duty}</li>
        ))}
      </ul>
    </div>
  ) : (
    <div className="flex flex-col gap-3.5">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/80">Church office</p>
      <p className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.015em] sm:text-[40px]">Members, giving and the church's work, in one quiet place.</p>
    </div>
  )

  return (
    <StaffAuthLayout aside={aside}>
      <AuthTitle title="Sign in">{branding.platform ? 'For the people who run mKanisa.' : "For the church's staff and admins."}</AuthTitle>

      {error && (
        <AuthAlert>
          {error}
          {unverified && (
            <Link to={`/signup?verify=${encodeURIComponent(form.username)}`} className="mt-2 block font-semibold text-[#8E2F22] underline">Verify my phone</Link>
          )}
        </AuthAlert>
      )}

      <form onSubmit={submit} className="flex flex-col gap-[18px]">
        <AuthField label="Username">
          <input className={authInput} autoComplete="username" autoFocus required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </AuthField>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className={authLabel}>Password</label>
            <Link to="/forgot-password" state={{ username: form.username }} className="text-sm font-semibold text-brand-700 hover:underline">Forgot password?</Link>
          </div>
          <PasswordInput id="password" className={authPassword} aria-invalid={error ? true : undefined} autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className={`${authPrimary} mt-1`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>

      {demo && (
        <div className="flex flex-col gap-3 rounded-2xl bg-brand-50 px-5 py-[18px]">
          <p className="text-[15px] text-mk-forest"><span className="font-semibold">Just looking?</span> Explore the app with sample data.</p>
          <button type="button" className={authSecondary} onClick={openDemo} disabled={busy}>Explore the demo (view only)</button>
        </div>
      )}

      {branding.platform && (
        <div className="flex flex-col gap-3 rounded-2xl bg-mk-mist px-5 py-[18px]">
          <p className="text-[15px] text-mk-forest"><span className="font-semibold">Church staff or a member?</span> Sign in at your church's own address.</p>
          <span className="self-start break-all rounded-[10px] border border-mk-border bg-white px-3 py-1.5 font-mono text-sm text-mk-forest">yourchurch.{window.location.host.replace(/^www\./, '')}/admin</span>
          <a href="/#directory" className="inline-flex items-center gap-2 self-start text-[15px] font-semibold text-brand-700 hover:underline">
            Find your church <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      )}

      {!branding.platform && (
        <>
          <div className="flex items-center gap-3.5 text-[13px] text-mk-muted">
            <span className="h-px flex-1 bg-mk-border" />New to the church office?<span className="h-px flex-1 bg-mk-border" />
          </div>
          <Link to="/signup" className={authSecondary}>Create a staff account</Link>
          <div className="flex flex-col gap-2.5 rounded-2xl bg-brand-50 px-5 py-[18px]">
            <p className="text-[15px] text-mk-forest"><span className="font-semibold">A member?</span> You don't need an account here.</p>
            <Link to="/me" className="inline-flex items-center gap-2 self-start text-[15px] font-semibold text-brand-700 hover:underline">
              Sign in to My giving with your phone <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-mk-muted">
        <Link to="/" className="hover:text-mk-forest hover:underline">{branding.platform ? `Back to ${window.location.host.replace(/^www\./, '')}` : 'Back to the church website'}</Link>
        {branding.platform
          ? <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4" aria-hidden="true" />For mKanisa staff only</span>
          : <PoweredBy className="text-mk-muted" />}
      </div>
    </StaffAuthLayout>
  )
}
