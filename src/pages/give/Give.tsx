import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, CreditCard, HeartHandshake, Loader2, Smartphone, XCircle } from 'lucide-react'
import { Alert, Field } from '../../components/ui'
import { errorMessage, request } from '../../lib/api'
import { currencyMoney, money } from '../../lib/format'
import { branding } from '../../lib/theme'
import PublicLayout from '../public/PublicLayout'
import type { MpesaPayment, PaypalConfig, PublicDonationType, PublicProject } from '../../types'

type Method = 'mpesa' | 'paypal'
type GiveState = 'form' | 'sending' | 'waiting' | 'success' | 'failed'

/** Something a gift can go towards on the give page. */
interface GivingOption {
  value: string
  label: string
  type: number
  project?: number
  isProject?: boolean
}

interface StkStatus {
  data?: { status?: string; payment?: { status?: string; result_description?: string | null } }
}

const POLL_MS = 4000
const POLL_LIMIT = 30 // ~2 minutes
const QUICK: Record<Method, number[]> = { mpesa: [500, 1000, 2000, 5000], paypal: [10, 25, 50, 100] }

// Accept 07XX / 01XX / +2547XX and normalise to 2547XXXXXXXX for Daraja.
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`
  if (/^254[17]\d{8}$/.test(digits)) return digits
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`
  return null
}

/**
 * What a gift can go towards: each donation type, then each published project (given through the
 * general "Project" type) unless a type already stands for it. Values: "t:<type id>" / "p:<project id>".
 */
function givingOptions(types: PublicDonationType[], projects: PublicProject[]): GivingOption[] {
  const projectType = types.find((t) => t.asks_project)
  const covered = new Set(types.map((t) => t.project).filter((id): id is number => Boolean(id)))
  return [
    ...types.filter((t) => !t.asks_project).map((t) => ({ value: `t:${t.id}`, label: t.name, type: t.id, project: t.project || undefined })),
    ...(projectType ? projects.filter((p) => !covered.has(p.id)).map((p) => ({ value: `p:${p.id}`, label: p.name, type: projectType.id, project: p.id, isProject: true })) : []),
  ]
}

export default function Give() {
  const [params] = useSearchParams()
  const [method, setMethod] = useState<Method>('mpesa')
  const [paypal, setPaypal] = useState<PaypalConfig>({ enabled: false, currency: 'USD', kes_rate: 0 })
  const [form, setForm] = useState({ reference: '', phone: '', option: '', amount: '1000', name: '', email: '' })
  const [options, setOptions] = useState<GivingOption[] | null>(null)
  const [state, setState] = useState<GiveState>('form')
  const [message, setMessage] = useState(params.get('paypal') === 'cancelled' ? 'Your PayPal payment was cancelled. Nothing was charged.' : '')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    request<PaypalConfig>('/paypal/config/', { auth: false }).then(setPaypal).catch(() => {})
    Promise.all([
      request<PublicDonationType[]>('/donation-types/', { auth: false }),
      request<PublicProject[]>('/public/projects/', { auth: false }).catch((): PublicProject[] => []),
    ]).then(([types, projects]) => {
      const list = givingOptions(types, projects)
      setOptions(list)
      const wanted = params.get('project')
      const pick = (wanted && (list.find((o) => String(o.project) === wanted && o.isProject) || list.find((o) => String(o.project) === wanted)))
        || list.find((o) => types.find((t) => t.is_default && `t:${t.id}` === o.value)) || list[0]
      if (pick) setForm((f) => (f.option ? f : { ...f, option: pick.value }))
    }).catch(() => setOptions([]))
    return () => clearTimeout(timer.current)
  }, [params])

  const chosen = options?.find((o) => o.value === form.option)
  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value })

  const poll = (checkoutId: string, attempt = 0) => {
    timer.current = setTimeout(async () => {
      try {
        const res = await request<StkStatus>('/mpay/check_status/', { params: { checkout_request_id: checkoutId }, auth: false })
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

  const isPaypal = method === 'paypal'
  const giftAmount = (value: string) => (isPaypal ? currencyMoney(value, paypal.currency) : money(value))
  const switchMethod = (key: Method) => {
    setMethod(key)
    setMessage('')
    setForm((f) => ({ ...f, amount: String(QUICK[key][1]) }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!chosen) return setMessage('Please choose what you would like to support.')
    if (!(Number(form.amount) >= 1)) return setMessage('Please enter an amount.')
    // A type tied to a project carries it already; only general project gifts name the project.
    const target = { description: chosen.type, project: chosen.isProject ? chosen.project : undefined }
    setMessage('')
    if (isPaypal) {
      setState('sending')
      try {
        const res = await request<{ approve_url: string }>('/paypal/orders/', {
          method: 'POST', auth: false,
          body: { amount: Number(form.amount).toFixed(2), reference: form.reference.trim(), name: form.name.trim(), email: form.email.trim(), ...target },
        })
        window.location.assign(res.approve_url) // PayPal sends the giver back to /give/paypal
      } catch (err) {
        setMessage(errorMessage(err))
        setState('form')
      }
      return
    }
    const phone = normalisePhone(form.phone)
    if (!phone) return setMessage('Enter a valid Safaricom number, e.g. 0712 345 678.')
    setState('sending')
    try {
      const res = await request<{ data: { payment: MpesaPayment } }>('/mpay/pay/', {
        method: 'POST', auth: false,
        body: { phone_number: phone, amount: Math.round(Number(form.amount)), reference: form.reference.trim(), ...target },
      })
      setState('waiting')
      poll(res.data.payment.checkout_request_id)
    } catch (err) {
      setMessage(errorMessage(err))
      setState('form')
    }
  }

  const reset = () => { clearTimeout(timer.current); setState('form'); setMessage('') }

  return (
    <GiveLayout>
      {state === 'success' ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-500" />
          <h1 className="text-xl font-semibold">Thank you!</h1>
          <p className="mt-2 text-sm text-slate-600">Your gift of {money(form.amount)} towards {chosen?.label} has been received. God bless you!</p>
          <button className="btn-primary mt-6" onClick={reset}>Give again</button>
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
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Give to {branding.name}</h1>
              <p className="text-sm text-slate-500">{isPaypal ? 'Pay securely with PayPal or a card.' : "Secure giving with M-PESA. You'll get a prompt on your phone."}</p>
            </div>
            <HeartHandshake className="h-7 w-7 shrink-0 text-brand-700" />
          </div>
          {paypal.enabled && (
            <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
              {([['mpesa', 'M-PESA', Smartphone], ['paypal', 'PayPal / card', CreditCard]] as const).map(([key, label, Icon]) => (
                <button key={key} type="button" role="radio" aria-checked={method === key} onClick={() => switchMethod(key)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${method === key ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          )}
          <Alert>{message}</Alert>
          <form onSubmit={submit} className="space-y-5">
            <fieldset>
              <legend className="label">What would you like to support?</legend>
              {options === null
                ? <p className="text-sm text-slate-500">Loading…</p>
                : (
                  <div className="space-y-1.5">
                    {options.map((o) => (
                      <label key={o.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${form.option === o.value ? 'border-brand-600 bg-brand-50 font-medium text-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        <input type="radio" name="option" value={o.value} checked={form.option === o.value} onChange={set('option')} className="h-4 w-4 accent-[var(--color-primary)]" />
                        {o.label}
                        {o.isProject && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Project</span>}
                      </label>
                    ))}
                  </div>
                )}
            </fieldset>

            <div>
              <label htmlFor="give-amount" className="label">Amount ({isPaypal ? paypal.currency : 'KES'})</label>
              <div className="mb-2 grid grid-cols-4 gap-2" role="group" aria-label="Quick amounts">
                {QUICK[method].map((n) => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, amount: String(n) })} aria-pressed={Number(form.amount) === n}
                    className={`rounded-full border py-2 text-sm font-medium ${Number(form.amount) === n ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                    {n.toLocaleString()}
                  </button>
                ))}
              </div>
              <input id="give-amount" className="input" required type="number" min="1" step={isPaypal ? '0.01' : '1'} value={form.amount} onChange={set('amount')} />
              {isPaypal && form.amount && Number(paypal.kes_rate) > 0 && (
                <span className="mt-1 block text-xs text-slate-500">About {money(Number(form.amount) * Number(paypal.kes_rate))}</span>
              )}
            </div>

            {isPaypal ? (
              <>
                <Field label="Your name"><input className="input" value={form.name} onChange={set('name')} maxLength={150} autoComplete="name" /></Field>
                <Field label="Email for your receipt" hint="Optional: PayPal's email is used if you leave it empty.">
                  <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
                </Field>
              </>
            ) : (
              <Field label="M-PESA phone number">
                <input className="input" required inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" value={form.phone} onChange={set('phone')} />
              </Field>
            )}
            <Field label="Membership number (optional)"
              hint={isPaypal ? undefined : "If your phone is registered with the church, we'll link your gift automatically. Visitors may enter their name."}>
              <input className="input" value={form.reference} onChange={set('reference')} maxLength={12} />
            </Field>

            <button className="btn-primary w-full py-3" disabled={state === 'sending' || !options?.length}>
              {state === 'sending'
                ? (isPaypal ? 'Opening PayPal…' : 'Sending prompt…')
                : <>Give {form.amount ? giftAmount(form.amount) : ''} with {isPaypal ? 'PayPal' : 'M-PESA'} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </>
      )}
    </GiveLayout>
  )
}

/** Page frame shared by the give page and the PayPal return page. */
export function GiveLayout({ children }: { children: ReactNode }) {
  return (
    <PublicLayout width="max-w-xl">
      <div className="card p-5 sm:p-7">{children}</div>
    </PublicLayout>
  )
}
