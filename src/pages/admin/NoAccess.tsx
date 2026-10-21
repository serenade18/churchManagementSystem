import { Navigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { firstPage } from '../../lib/access'
import { useAuth } from '../../lib/auth'
import { branding } from '../../lib/theme'

/** A church admin with no roles yet (e.g. just signed up): the owner decides what they can do. */
export default function NoAccess() {
  const { user, reload } = useAuth()
  const home = firstPage(user)
  if (home !== '/no-access') return <Navigate to={home} replace />
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700"><KeyRound className="h-7 w-7" /></span>
      <h1 className="text-xl font-semibold text-mk-forest">Waiting for a role</h1>
      <p className="mt-2 text-sm text-mk-slate">
        Your account is ready, but {branding.name}'s owner hasn't given you a role yet. Once they choose what you look
        after (for example, a branch, the treasury or SMS), it opens here.
      </p>
      <button className="btn-secondary mt-6" onClick={() => reload()}>Check again</button>
    </div>
  )
}
