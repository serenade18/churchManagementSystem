import { Church } from 'lucide-react'
import { BRAND } from '../../brand'

/** An address that isn't a church on mKanisa (or one that is closed). */
export default function NoChurch() {
  const host = window.location.hostname
  const platform = host.split('.').slice(1).join('.')
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Church className="h-7 w-7" /></span>
        <h1 className="text-xl font-semibold text-slate-900">No church at this address</h1>
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-mono">{host}</span> isn't a church on {BRAND.poweredBy || 'this platform'}, or it is no longer open.
          Check the address, or find your church in the directory.
        </p>
        {platform && <a href={`https://${platform}/#churches`} className="btn-primary mt-6">Find your church</a>}
      </div>
    </div>
  )
}
