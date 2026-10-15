import { useEffect, useState } from 'react'
import { ExternalLink, ImageUp, Trash2 } from 'lucide-react'
import { Alert, Field } from './ui'
import { api, request } from '../lib/api'
import { useAuth } from '../lib/auth'
import { assetUrl } from '../lib/theme'

const FIELDS = ['about', 'location', 'contact_phone', 'contact_email', 'website', 'service_times', 'facebook_url', 'youtube_url', 'instagram_url']

/** Settings > Public home page: what visitors see at the church's web address. */
export default function PublicPageSettings() {
  const { user } = useAuth()
  const [values, setValues] = useState(null)
  const [coverUrl, setCoverUrl] = useState(null)
  const [cover, setCover] = useState(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/cms/branding/').then((data) => {
      setValues(Object.fromEntries(FIELDS.map((f) => [f, data[f] || ''])))
      setCoverUrl(assetUrl(data.cover_url))
    }).catch((e) => setError(e.message))
  }, [])

  if (!values) return <div className="card p-6 text-sm text-slate-500">{error || 'Loading…'}</div>
  const readOnly = user?.view_only
  const set = (key) => (e) => setValues({ ...values, [key]: e.target.value })
  const shownCover = cover ? URL.createObjectURL(cover) : removeCover ? null : coverUrl

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setErrors({})
    setDone('')
    const body = new FormData()
    FIELDS.forEach((f) => body.append(f, values[f].trim()))
    if (cover) body.append('cover', cover)
    else if (removeCover) body.append('remove_cover', 'true')
    try {
      const data = await request('/cms/branding/', { method: 'PATCH', body })
      setCoverUrl(assetUrl(data.cover_url))
      setCover(null)
      setRemoveCover(false)
      setDone('Saved. Your public home page shows the changes now.')
    } catch (err) {
      setErrors(err.data || {})
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const input = (key, label, props = {}) => (
    <Field label={label} error={errors[key]}><input className="input" disabled={readOnly} value={values[key]} onChange={set(key)} {...props} /></Field>
  )

  return (
    <div className="card p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Public home page</h2>
          <p className="text-sm text-slate-500">What visitors see at your church's web address: a welcome, photo, service times and how to reach you.</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="btn-secondary"><ExternalLink className="h-4 w-4" /> View page</a>
      </div>
      <Alert tone="green">{done}</Alert>
      <Alert>{error}</Alert>
      <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label="Cover photo" hint="A wide photo of your church or congregation. JPG, PNG or WebP under 3 MB.">
            <div className="flex items-center gap-3">
              {shownCover
                ? <img src={shownCover} alt="" className="h-20 w-36 rounded-lg object-cover" />
                : <span className="flex h-20 w-36 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">No photo</span>}
              {!readOnly && (
                <div className="flex flex-col gap-2">
                  <label className="btn-secondary cursor-pointer"><ImageUp className="h-4 w-4" /> Choose photo
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { setCover(e.target.files[0] || null); setRemoveCover(false) }} />
                  </label>
                  {shownCover && <button type="button" className="btn-secondary" onClick={() => { setCover(null); setRemoveCover(true) }}><Trash2 className="h-4 w-4" /> Remove</button>}
                </div>
              )}
            </div>
            {errors.cover && <p className="mt-1 text-xs text-red-600">{errors.cover}</p>}
          </Field>
          <Field label="Welcome text" error={errors.about} hint="Under “Welcome to …”. Leave empty for a short default.">
            <textarea className="input" rows={4} maxLength={1000} disabled={readOnly} value={values.about} onChange={set('about')}
              placeholder="A community of faith, fellowship, and service…" />
          </Field>
          <Field label="Service times" error={errors.service_times} hint="One per line.">
            <textarea className="input" rows={3} maxLength={1000} disabled={readOnly} value={values.service_times} onChange={set('service_times')}
              placeholder={'Sunday 8:00am - English service\nSunday 10:30am - Kiswahili service'} />
          </Field>
        </div>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{input('location', 'Location', { placeholder: 'e.g. Sukari, off Thika Road' })}</div>
          {input('contact_phone', 'Phone', { inputMode: 'tel' })}
          {input('contact_email', 'Email', { type: 'email' })}
          <div className="sm:col-span-2">{input('website', 'Website', { type: 'url', placeholder: 'https://' })}</div>
          {input('facebook_url', 'Facebook page', { type: 'url', placeholder: 'https://facebook.com/…' })}
          {input('youtube_url', 'YouTube channel', { type: 'url', placeholder: 'https://youtube.com/…' })}
          {input('instagram_url', 'Instagram', { type: 'url', placeholder: 'https://instagram.com/…' })}
          <p className="self-end text-xs text-slate-500 sm:col-span-2">Phone, email and location also appear on receipts and statements.</p>
        </div>
        {!readOnly && <div className="lg:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save public page'}</button></div>}
      </form>
    </div>
  )
}
