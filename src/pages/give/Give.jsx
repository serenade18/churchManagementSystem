import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2, Smartphone, XCircle } from 'lucide-react'
import Logo from '../../components/Logo'
import { Alert, Field, Select } from '../../components/ui'
import { request } from '../../lib/api'
import { CHURCH_NAME, DONATION_TYPES, money } from '../../lib/format'

const PUBLIC_TYPES = Object.fromEntries(Object.entries(DONATION_TYPES).filter(([k]) => k !== 'other'))
const POLL_MS = 4000
const POLL_LIMIT = 30 // ~2 minutes

// Accept 07XX / 01XX / +2547XX and normalise to 2547XXXXXXXX for Daraja.
function normalisePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`
  if (/^254[17]\d{8}$/.test(digits)) return digits
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`
  return null
}

export default function Give() {
  const [form, setForm] = useState({ reference: '', phone: '', description: 'general', amount: '', project: '' })
  const [projects, setProjects] = useState([])
  const [state, setState] = useState('form') // form | sending | waiting | success | failed
  const [message, setMessage] = useState('')
  const timer = useRef(null)

  useEffect(() => {
    request('/public/projects/', { auth: false }).then(setProjects).catch(() => {})
    return () => clearTimeout(timer.current)
  }, [])

  const set = (key) => (e) => setForm({ ...form, [key]: e?.target ? e.target.value : e })

  const poll = (checkoutId, attempt = 0) => {
    timer.current = setTimeout(async () => {
      try {
        const res = await request('/mpay/check_status/', { params: { checkout_request_id: checkoutId }, auth: false })
        const status = res.data?.status || res.data?.payment?.status
        if (status === 'success') return setState('success')
        if (status === 'failed') {
          setMessage(res.data?.payment?.result_description || 'The payment was not completed.')
          return setState('failed')
        }
      } catch { /* keep polling */ }
      if (attempt + 1 >= POLL_LIMIT) {
        setMessage("We haven't received confirmation yet. If you completed the payment you'll get an SMS shortly.")
        return setState('failed')
      }
      poll(checkoutId, attempt + 1)
    }, POLL_MS)
  }

  const submit = async (e) => {
    e.preventDefault()
    const phone = normalisePhone(form.phone)
    if (!phone) return setMessage('Enter a valid Safaricom number, e.g. 0712 345 678.')
    if (form.description === 'project' && !form.project) return setMessage('Please choose the project you are supporting.')
    setMessage('')
    setState('sending')
    try {
      const res = await request('/mpay/pay/', {
        method: 'POST',
        auth: false,
        body: {
          phone_number: phone,
          amount: Math.round(Number(form.amount)),
          reference: form.reference.trim(),
          description: form.description,
          project: form.description === 'project' ? form.project : undefined,
        },
      })
      setState('waiting')
      poll(res.data.payment.checkout_request_id)
    } catch (err) {
      setMessage(err.message)
      setState('form')
    }
  }

  const reset = () => { clearTimeout(timer.current); setState('form'); setMessage('') }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
      <header className="flex items-center justify-between px-4 py-4 text-white sm:px-8">
        <span className="flex items-center gap-3 font-semibold"><Logo tile className="h-11 w-11" /> {CHURCH_NAME}</span>
        <Link to="/" className="text-sm text-brand-100 hover:text-white">Admin login</Link>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="card w-full max-w-md p-6 sm:p-8">
          {state === 'success' ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-500" />
              <h1 className="text-xl font-semibold">Thank you!</h1>
              <p className="mt-2 text-sm text-slate-600">Your gift of {money(form.amount)} has been received. God bless you!</p>
              <button className="btn-primary mt-6" onClick={() => { reset(); setForm({ ...form, amount: '' }) }}>Give again</button>
            </div>
          ) : state === 'failed' ? (
            <div className="py-6 text-center">
              <XCircle className="mx-auto mb-3 h-14 w-14 text-red-500" />
              <h1 className="text-xl font-semibold">Payment not completed</h1>
              <p className="mt-2 text-sm text-slate-600">{message}</p>
              <button className="btn-primary mt-6" onClick={reset}>Try again</button>
            </div>
          ) : state === 'waiting' ? (
            <div className="py-6 text-center">
              <Smartphone className="mx-auto mb-3 h-14 w-14 text-brand-600" />
              <h1 className="text-xl font-semibold">Check your phone</h1>
              <p className="mt-2 text-sm text-slate-600">Enter your M-PESA PIN on the prompt sent to your phone to complete your gift of {money(form.amount)}.</p>
              <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-brand-600" />
              <button className="mt-6 text-sm text-slate-500 hover:underline" onClick={reset}>Cancel</button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold">Give online</h1>
              <p className="mb-6 text-sm text-slate-500">Pay securely via M-PESA. You'll receive a prompt on your phone.</p>
              <Alert>{message}</Alert>
              <form onSubmit={submit} className="space-y-4">
                <Field label="Membership number" hint="Visitors may enter their name instead.">
                  <input className="input" required value={form.reference} onChange={set('reference')} maxLength={12} />
                </Field>
                <Field label="M-PESA phone number">
                  <input className="input" required inputMode="tel" placeholder="0712 345 678" value={form.phone} onChange={set('phone')} />
                </Field>
                <Field label="Giving towards">
                  <Select value={form.description} onChange={set('description')} options={PUBLIC_TYPES} />
                </Field>
                {form.description === 'project' && (
                  <Field label="Project">
                    <Select value={form.project} onChange={set('project')} options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select a project" />
                  </Field>
                )}
                <Field label="Amount (KES)">
                  <input className="input" required type="number" min="1" step="1" value={form.amount} onChange={set('amount')} />
                </Field>
                <button className="btn-primary w-full py-3" disabled={state === 'sending'}>
                  {state === 'sending' ? 'Sending prompt…' : `Give ${form.amount ? money(form.amount) : ''}`}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
