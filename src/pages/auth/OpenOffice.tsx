import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import { AuthAlert, AuthTitle, StaffAuthLayout, authSecondary } from '../../components/AuthShell'
import { errorMessage, request } from '../../lib/api'
import { homeFor, useAuth } from '../../lib/auth'
import { branding } from '../../lib/theme'
import type { Tokens } from '../../types'

/** /admin/open#<token>: a platform admin arriving from the platform's "Open church office", or church staff who
 * signed in on mkanisa.com, signed in here. */
export default function OpenOffice() {
  const { user, acceptTokens } = useAuth()
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const started = useRef(false) // the link works once: never send it twice (StrictMode runs effects twice)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const token = window.location.hash.slice(1)
    window.history.replaceState(null, '', window.location.pathname) // don't leave the token in the address bar
    if (!token) { setError('This link is missing its sign-in code. Open the church again from the platform.'); return }
    request<Tokens>('/auth/open/', { method: 'POST', body: { token }, auth: false })
      .then(acceptTokens)
      .then(() => setDone(true))
      .catch((err) => setError(errorMessage(err)))
  }, [acceptTokens])

  if (done && user) return <Navigate to={homeFor(user)} replace />

  const aside = (
    <p className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.015em] sm:text-[40px]">{branding.name}</p>
  )
  return (
    <StaffAuthLayout aside={aside}>
      <AuthTitle title="Opening the church office">Signing you in…</AuthTitle>
      {error ? (
        <>
          <AuthAlert>{error}</AuthAlert>
          <Link to="/admin" className={authSecondary}>Sign in here instead</Link>
        </>
      ) : <Spinner className="mx-auto h-8 w-8" />}
    </StaffAuthLayout>
  )
}
