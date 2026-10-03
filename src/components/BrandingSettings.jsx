import { useEffect, useState } from 'react'
import { ImageUp, RotateCcw } from 'lucide-react'
import { Alert, Field } from './ui'
import { api, request } from '../lib/api'
import { useAuth } from '../lib/auth'
import { assetUrl, branding, isHex, sidebarAdjusted, themeTokens } from '../lib/theme'

const DEFAULT_PRIMARY = '#1d43b0'
const DEFAULT_SIDEBAR = '#172e6b'

function ColorField({ label, value, onChange, fallback, hint }) {
  const shown = isHex(value) ? value : fallback
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
          value={shown} onChange={(e) => onChange(e.target.value)} />
        <input className="input font-mono uppercase" maxLength={7} placeholder={fallback} value={value}
          onChange={(e) => onChange(e.target.value.startsWith('#') || !e.target.value ? e.target.value : `#${e.target.value}`)} />
        {value && <button type="button" className="btn-secondary px-2.5" title="Back to default" onClick={() => onChange('')}><RotateCcw className="h-4 w-4" /></button>}
      </div>
    </Field>
  )
}

function LogoField({ label, hint, current, file, onFile, removed, onRemove }) {
  const preview = file ? URL.createObjectURL(file) : removed ? null : current
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <span className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-1">
          {preview ? <img src={preview} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">Default</span>}
        </span>
        <div className="flex flex-col gap-1.5">
          <label className="btn-secondary cursor-pointer px-3 py-1.5">
            <ImageUp className="h-4 w-4" /> Upload
            <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = '' }} />
          </label>
          {(preview) && <button type="button" className="text-left text-xs text-slate-500 hover:text-red-600" onClick={onRemove}>Use the default</button>}
        </div>
      </div>
    </Field>
  )
}

/** Settings > Branding: the organisation's name, tagline, colours and logos. */
export default function BrandingSettings() {
  const { user } = useAuth()
  const [current, setCurrent] = useState(null)
  const [values, setValues] = useState({ name: '', tagline: '', primary_color: '', sidebar_color: '' })
  const [files, setFiles] = useState({})
  const [removed, setRemoved] = useState({})
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/cms/branding/').then((data) => {
      setCurrent(data)
      setValues({ name: data.custom_name, tagline: data.tagline, primary_color: data.primary_color, sidebar_color: data.sidebar_color })
    }).catch((e) => setError(e.message))
  }, [])

  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }))
  const readOnly = user?.view_only

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setErrors({})
    const body = new FormData()
    Object.entries(values).forEach(([k, v]) => body.append(k, v.trim()))
    Object.entries(files).forEach(([k, f]) => body.append(k, f))
    Object.entries(removed).forEach(([k, r]) => r && !files[k] && body.append(`remove_${k}`, 'true'))
    try {
      await request('/cms/branding/', { method: 'PATCH', body })
      window.location.reload() // everything (sidebar, sign-in page, favicon) redraws with the new look
    } catch (err) {
      setErrors(err.data || {})
      setError(err.message)
      setBusy(false)
    }
  }

  if (!current) return <div className="card p-6 text-sm text-slate-500">{error || 'Loading…'}</div>

  const primary = isHex(values.primary_color) ? values.primary_color : DEFAULT_PRIMARY
  const sidebar = isHex(values.sidebar_color) ? values.sidebar_color : DEFAULT_SIDEBAR
  const previewName = values.name.trim() || current.name
  const previewMark = files.logo_mark ? URL.createObjectURL(files.logo_mark)
    : files.logo ? URL.createObjectURL(files.logo)
      : (!removed.logo_mark && assetUrl(current.logo_mark_url)) || (!removed.logo && assetUrl(current.logo_url)) || branding.logoMark

  return (
    <div className="card p-6">
      <h2 className="font-semibold">Branding</h2>
      <p className="mb-4 text-sm text-slate-500">Your name, logo and colours, used across the app, the sign-in and give pages, receipts and SMS.</p>
      <Alert>{error}</Alert>
      {readOnly && <Alert tone="amber">View-only accounts can't change the branding.</Alert>}
      <form onSubmit={save}>
        <fieldset disabled={readOnly || busy} className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organisation name" error={errors.name} hint="Also used in SMS and on receipts.">
              <input className="input" maxLength={150} placeholder={current.name} value={values.name} onChange={(e) => set('name')(e.target.value)} />
            </Field>
            <Field label="Tagline" error={errors.tagline} hint="Under the name in the sidebar.">
              <input className="input" maxLength={100} placeholder="Church Management" value={values.tagline} onChange={(e) => set('tagline')(e.target.value)} />
            </Field>
            <ColorField label="Main colour" value={values.primary_color} onChange={set('primary_color')} fallback={DEFAULT_PRIMARY}
              hint={errors.primary_color || 'Buttons, highlights and charts.'} />
            <ColorField label="Sidebar colour" value={values.sidebar_color} onChange={set('sidebar_color')} fallback={DEFAULT_SIDEBAR}
              hint={errors.sidebar_color || (sidebarAdjusted(values.sidebar_color) ? 'Darkened a little so white text stays readable.' : 'Sidebar and sign-in background.')} />
            <LogoField label="Logo" hint={errors.logo || 'Sign-in pages and receipts. PNG, JPG, WebP or SVG, under 1 MB.'}
              current={assetUrl(current.logo_url)} file={files.logo} removed={removed.logo}
              onFile={(f) => { setFiles((x) => ({ ...x, logo: f })); setRemoved((r) => ({ ...r, logo: false })) }}
              onRemove={() => { setFiles((x) => ({ ...x, logo: undefined })); setRemoved((r) => ({ ...r, logo: true })) }} />
            <LogoField label="Square icon (optional)" hint={errors.logo_mark || 'Sidebar, browser tab and phone icon. Uses the logo if empty.'}
              current={assetUrl(current.logo_mark_url)} file={files.logo_mark} removed={removed.logo_mark}
              onFile={(f) => { setFiles((x) => ({ ...x, logo_mark: f })); setRemoved((r) => ({ ...r, logo_mark: false })) }}
              onRemove={() => { setFiles((x) => ({ ...x, logo_mark: undefined })); setRemoved((r) => ({ ...r, logo_mark: true })) }} />
          </div>

          <div>
            <span className="label">Preview</span>
            <div className="overflow-hidden rounded-xl border border-slate-200" style={themeTokens(primary, sidebar)}>
              <div className="flex items-center gap-3 bg-sidebar p-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1"><img src={previewMark} alt="" className="h-full w-auto object-contain" /></span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{previewName}</p>
                  <p className="truncate text-xs text-brand-200">{values.tagline.trim() || 'Church Management'}</p>
                </div>
              </div>
              <div className="space-y-3 bg-white p-4 text-sm">
                <span className="block rounded-lg bg-primary px-3 py-2 text-center font-medium text-on-primary">Primary button</span>
                <p>Links look <span className="font-medium text-brand-700">like this</span>.</p>
                <div className="flex items-end gap-1.5 pt-1" aria-hidden="true">
                  {[40, 65, 50, 80, 60].map((h, i) => <span key={i} className="w-6 rounded-t bg-brand-600" style={{ height: h * 0.6 }} />)}
                </div>
              </div>
            </div>
          </div>
        </fieldset>
        {!readOnly && <button className="btn-primary mt-6" disabled={busy}>{busy ? 'Saving…' : 'Save branding'}</button>}
      </form>
    </div>
  )
}
