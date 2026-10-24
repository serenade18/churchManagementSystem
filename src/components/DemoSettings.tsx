import { useState } from 'react'
import { MonitorPlay } from 'lucide-react'
import { Badge } from './ui'
import { api, errorMessage } from '../lib/api'
import { branding } from '../lib/theme'

/** Super admins offer (or stop offering) "Explore the demo" on the sign-in page. */
export default function DemoSettings() {
  const [enabled, setEnabled] = useState(Boolean(branding.raw?.demo_enabled))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toggle = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.patch<{ demo_enabled: boolean }>('/cms/demo/', { enabled: !enabled })
      setEnabled(res.demo_enabled)
      if (branding.raw) branding.raw.demo_enabled = res.demo_enabled
    } catch (e) {
      setError(errorMessage(e))
    }
    setBusy(false)
  }
  return (
    <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><MonitorPlay /></span>
      <div className="flex-1 text-sm">
        <p className="font-semibold text-mk-forest">Demo mode <Badge tone={enabled ? 'green' : 'slate'}>{enabled ? 'On' : 'Off'}</Badge></p>
        <p className="mt-1 text-mk-slate">
          When on, the sign-in page offers "Explore the demo": visitors see the whole app filled with built-in sample data,
          view only. It runs in their browser and never shows or changes your real members and giving.
        </p>
        {error && <p className="mt-1 text-red-600">{error}</p>}
      </div>
      <button className={enabled ? 'btn-secondary' : 'btn-primary'} onClick={toggle} disabled={busy}>
        {busy ? 'Saving…' : enabled ? 'Turn demo off' : 'Turn demo on'}
      </button>
    </div>
  )
}
