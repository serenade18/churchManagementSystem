import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Church, Lock, Smartphone, XCircle } from 'lucide-react'
import Logo, { PoweredBy } from '../../components/Logo'
import { AuthAlert, AuthField, authInput, authLabel, authPrimary, authSecondary, churchPhoto, maskPhone, shade } from '../../components/AuthShell'
import { errorMessage, request } from '../../lib/api'
import { currencyMoney, money } from '../../lib/format'
import { assetUrl, branding } from '../../lib/theme'
import type { MobileMoneyConfig, MpesaPayment, PaypalConfig, PublicDonationType, PublicProject } from '../../types'

type GiveState = 'form' | 'sending' | 'waiting' | 'success' | 'failed'

/** Something a gift can go towards on the give page. */
interface GivingOption {
  value: string
  label: string
  type: number
  project?: number
  /** A published project, given through the general "Project" type: shown with its photo and progress. */
  details?: PublicProject
}

interface StkStatus {
  data?: { status?: string; payment?: { status?: string; result_description?: string | null; receipt?: string | null } }
}

const POLL_MS = 4000
const POLL_LIMIT = 30 // ~2 minutes
const PAYPAL = 'paypal'
const QUICK = { mobile: [500, 1000, 2000, 5000], paypal: [10, 25, 50, 100] }

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
    ...(projectType ? projects.filter((p) => !covered.has(p.id)).map((p) => ({ value: `p:${p.id}`, label: p.name, type: projectType.id, project: p.id, details: p })) : []),
  ]
}

export default function Give() {
  const [params] = useSearchParams()
  const [paypal, setPaypal] = useState<PaypalConfig>({ enabled: false, currency: 'USD', kes_rate: 0 })
  // Mobile money: M-PESA, or (when SasaPay sends the prompts) also Airtel Money and others.
  const [networks, setNetworks] = useState<MobileMoneyConfig['networks']>([{ code: '63902', label: 'M-PESA' }])
  // How the gift is paid: a mobile money network's code, or "paypal".
  const [method, setMethod] = useState('63902')
  const [form, setForm] = useState({ reference: '', phone: '', option: '', amount: '1000', name: '', email: '' })
  const [types, setTypes] = useState<PublicDonationType[]>([])
  const [options, setOptions] = useState<GivingOption[] | null>(null)
  const [state, setState] = useState<GiveState>('form')
  const [receipt, setReceipt] = useState('')
  const [message, setMessage] = useState(params.get('paypal') === 'cancelled' ? 'Your PayPal payment was cancelled. Nothing was charged.' : '')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const amountInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    request<PaypalConfig>('/paypal/config/', { auth: false }).then(setPaypal).catch(() => {})
    request<MobileMoneyConfig>('/payments/mobile/', { auth: false }).then((config) => {
      if (!config.networks.length) return
      setNetworks(config.networks)
      setMethod((current) => (current === PAYPAL || config.networks.some((n) => n.code === current) ? current : config.networks[0].code))
    }).catch(() => {})
    Promise.all([
      request<PublicDonationType[]>('/donation-types/', { auth: false }),
      request<PublicProject[]>('/public/projects/', { auth: false }).catch((): PublicProject[] => []),
    ]).then(([types, projects]) => {
      const list = givingOptions(types, projects)
      setTypes(types)
      setOptions(list)
      const wanted = params.get('project')
      const pick = (wanted && (list.find((o) => String(o.project) === wanted && o.details) || list.find((o) => String(o.project) === wanted)))
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
        if (status === 'success') {
          setReceipt(res.data?.payment?.receipt || '')
          return setState('success')
        }
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

  const isPaypal = method === PAYPAL
  const netLabel = networks.find((n) => n.code === method)?.label || 'M-PESA'
  const quick = QUICK[isPaypal ? 'paypal' : 'mobile']
  const giftAmount = (value: string) => (isPaypal ? currencyMoney(value, paypal.currency) : money(value))
  const choose = (key: string) => {
    if ((key === PAYPAL) !== isPaypal) setForm((f) => ({ ...f, amount: String(QUICK[key === PAYPAL ? 'paypal' : 'mobile'][1]) }))
    setMethod(key)
    setMessage('')
  }
  const methods = [...networks.map((n) => ({ key: n.code, label: n.label })), ...(paypal.enabled ? [{ key: PAYPAL, label: 'Card / PayPal' }] : [])]

  const send = async () => {
    if (!chosen) return setMessage('Please choose what you would like to support.')
    if (!(Number(form.amount) >= 1)) return setMessage('Please enter an amount.')
    // A type tied to a project carries it already; only general project gifts name the project.
    const target = { description: chosen.type, project: chosen.details ? chosen.project : undefined }
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
    if (!phone) return setMessage(`Enter a valid ${netLabel === 'M-PESA' ? 'Safaricom' : netLabel} number, e.g. 0712 345 678.`)
    clearTimeout(timer.current)
    setState('sending')
    try {
      const res = await request<{ data: { payment: MpesaPayment } }>('/mpay/pay/', {
        method: 'POST', auth: false,
        body: { phone_number: phone, amount: Math.round(Number(form.amount)), reference: form.reference.trim(), network: method, ...target },
      })
      setState('waiting')
      poll(res.data.payment.checkout_request_id)
    } catch (err) {
      setMessage(errorMessage(err))
      setState('form')
    }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); send() }
  const reset = () => { clearTimeout(timer.current); setState('form'); setMessage(''); setReceipt('') }

  const paybill = <PaybillBox types={types} />

  if (state === 'success') return (
    <GiveLayout aside={paybill}>
      <StateIcon tone="good" />
      <div className="flex flex-col gap-2" role="status">
        <h2 className="font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.015em] text-mk-forest">Thank you!</h2>
        <p className="text-[17px] text-mk-muted">Your gift has been received. God bless you.</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[22px] bg-mk-ivory p-5 text-[15px]">
        <dt className="text-mk-muted">Amount</dt><dd className="text-right font-display text-xl font-semibold text-mk-forest">{money(form.amount)}</dd>
        <dt className="text-mk-muted">For</dt><dd className="text-right font-semibold text-mk-forest">{chosen?.label}</dd>
        {receipt && <><dt className="text-mk-muted">{netLabel} code</dt><dd className="text-right font-mono font-semibold text-mk-forest">{receipt}</dd></>}
        <dd className="col-span-2 mt-2 border-t border-mk-border pt-3 text-[13px] text-mk-muted">An SMS receipt is on its way to {maskPhone(form.phone)}.</dd>
      </dl>
      <div className="flex flex-wrap gap-2.5">
        <Link to="/me" className={`${authPrimary} h-12 flex-1 basis-40`}>See all my giving</Link>
        <button type="button" onClick={reset} className={`${authSecondary} h-12 flex-1 basis-40`}>Give again</button>
      </div>
    </GiveLayout>
  )

  if (state === 'failed') return (
    <GiveLayout aside={paybill}>
      <StateIcon tone="bad" />
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest">Payment not completed</h2>
        <p className="text-mk-muted">{message}</p>
      </div>
      <button type="button" className={authPrimary} onClick={reset}>Try again</button>
    </GiveLayout>
  )

  if (state === 'waiting') return (
    <GiveLayout aside={paybill}>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative flex h-[120px] w-[120px] items-center justify-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full bg-brand-50" />
          <span className="absolute inset-4 animate-ping rounded-full border-2 border-brand-600 opacity-30 [animation-duration:2.4s]" />
          <Smartphone className="relative h-11 w-11 text-brand-700" strokeWidth={1.7} />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest">Check your phone</h2>
          <p className="text-mk-muted">Enter your {netLabel} PIN on the prompt we sent to <span className="whitespace-nowrap font-semibold text-mk-forest">{maskPhone(form.phone)}</span>.</p>
        </div>
        <div className="flex w-full items-center justify-between rounded-[18px] border border-mk-border bg-white px-5 py-[18px] text-left">
          <span className="flex flex-col"><span className="text-[13px] text-mk-muted">{chosen?.label}</span><span className="font-display text-[26px] font-semibold text-mk-forest">{money(form.amount)}</span></span>
          <span className="text-[13px] font-semibold text-mk-muted">{netLabel}</span>
        </div>
        <div role="status" className="flex w-full flex-col gap-2">
          <span className="h-1.5 overflow-hidden rounded-full bg-mk-mist"><span className="block h-full w-1/3 animate-pulse rounded-full bg-brand-600" /></span>
          <span className="text-sm text-mk-muted">Waiting for {netLabel} to confirm…</span>
        </div>
        <div className="flex w-full flex-col gap-2.5">
          <p className="text-[15px] text-mk-muted">No prompt? <button type="button" onClick={send} className="min-h-11 font-semibold text-brand-700 hover:underline">Send it again</button></p>
          <button type="button" className={`${authSecondary} h-12`} onClick={reset}>Cancel</button>
        </div>
      </div>
    </GiveLayout>
  )

  const types_ = options?.filter((o) => !o.details) || []
  const projects = options?.filter((o) => o.details) || []
  return (
    <GiveLayout aside={paybill}>
      {message && <AuthAlert>{message}</AuthAlert>}
      <form onSubmit={submit} className="flex flex-col gap-[30px]">
        <fieldset className="min-w-0">
          <Step n={1}>What is your gift for?</Step>
          {options === null ? <p className="text-mk-muted">Loading…</p> : (
            <>
              <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
                {types_.map((o) => {
                  const on = form.option === o.value
                  return (
                    <label key={o.value} className={`relative flex min-h-14 cursor-pointer items-center gap-2.5 rounded-[14px] px-3.5 text-mk-forest has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${on ? 'border-2 border-brand-600 bg-brand-50 font-semibold' : 'border border-mk-border bg-white font-medium hover:border-brand-200'}`}>
                      <input type="radio" name="option" value={o.value} checked={on} onChange={set('option')} className="absolute h-px w-px opacity-0" />
                      <Dot on={on} />{o.label}
                    </label>
                  )
                })}
              </div>
              {projects.length > 0 && (
                <>
                  <p className="mb-2.5 mt-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-mk-muted">Or a church project</p>
                  <div className="flex flex-col gap-2.5">
                    {projects.map((o) => <ProjectOption key={o.value} option={o} on={form.option === o.value} onChange={set('option')} />)}
                  </div>
                </>
              )}
            </>
          )}
        </fieldset>

        <fieldset className="min-w-0">
          <Step n={2}>How much?</Step>
          <label htmlFor="give-amount" className="sr-only">Amount ({isPaypal ? paypal.currency : 'KES'})</label>
          <div className="flex items-baseline gap-3 rounded-[18px] border-2 border-brand-600 bg-white px-5 py-3.5">
            <span className="text-lg font-semibold text-mk-muted" aria-hidden="true">{isPaypal ? paypal.currency : 'KES'}</span>
            <input id="give-amount" ref={amountInput} required inputMode={isPaypal ? 'decimal' : 'numeric'} autoComplete="off" value={isPaypal || !form.amount ? form.amount : Number(form.amount).toLocaleString('en-KE')}
              onChange={(e) => setForm({ ...form, amount: e.target.value.replace(isPaypal ? /[^\d.]/g : /\D/g, '') })}
              className="min-w-0 flex-1 bg-transparent font-display text-[40px] font-semibold tracking-[-0.02em] text-mk-forest outline-none sm:text-[44px]" />
          </div>
          {isPaypal && form.amount && Number(paypal.kes_rate) > 0 && (
            <span className="mt-1.5 block text-[13px] text-mk-muted">About {money(Number(form.amount) * Number(paypal.kes_rate))}</span>
          )}
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
            {quick.map((n) => {
              const on = Number(form.amount) === n
              return (
                <button key={n} type="button" onClick={() => setForm({ ...form, amount: String(n) })} aria-pressed={on}
                  className={`min-h-11 rounded-full px-[18px] text-[15px] font-semibold ${on ? 'bg-primary text-on-primary' : 'border border-mk-border bg-white text-mk-forest hover:border-brand-200'}`}>
                  {n.toLocaleString()}
                </button>
              )
            })}
            <button type="button" onClick={() => { setForm({ ...form, amount: '' }); amountInput.current?.focus() }}
              className="min-h-11 rounded-full border border-mk-border bg-white px-[18px] text-[15px] font-semibold text-mk-forest hover:border-brand-200">Other</button>
          </div>
        </fieldset>

        <fieldset className="flex min-w-0 flex-col gap-4">
          <Step n={3}>How will you give?</Step>
          {methods.length > 1 && (
            <div role="radiogroup" aria-label="Payment method" className={`-mt-3.5 grid gap-1 rounded-full bg-mk-mist p-1 ${methods.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {methods.map((m) => (
                <button key={m.key} type="button" role="radio" aria-checked={method === m.key} onClick={() => choose(m.key)}
                  className={`flex min-h-11 items-center justify-center rounded-full px-1.5 text-center text-[15px] leading-tight ${method === m.key ? 'bg-white font-semibold text-mk-forest shadow-[0_1px_3px_rgba(16,43,39,0.12)]' : 'font-medium text-mk-muted hover:text-mk-forest'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
          {isPaypal ? (
            <>
              <AuthField label="Your name"><input className={authInput} value={form.name} onChange={set('name')} maxLength={150} autoComplete="name" /></AuthField>
              <AuthField label="Email for your receipt" hint="Optional: PayPal's email is used if you leave it empty.">
                <input className={authInput} type="email" value={form.email} onChange={set('email')} autoComplete="email" />
              </AuthField>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="give-phone" className={authLabel}>{netLabel} phone number</label>
              <div className="flex h-[54px] overflow-hidden rounded-[14px] border border-mk-border bg-white focus-within:border-2 focus-within:border-brand-600">
                <span className="flex items-center border-r border-mk-border bg-mk-ivory px-3.5 font-semibold text-mk-forest" aria-hidden="true">+254</span>
                <input id="give-phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="712 345 678" aria-describedby="give-phone-hint"
                  value={form.phone} onChange={set('phone')} className="min-w-0 flex-1 bg-transparent px-3.5 text-[17px] text-mk-forest outline-none" />
              </div>
              <span id="give-phone-hint" className="text-[13px] text-mk-muted">We'll send the payment prompt here.</span>
            </div>
          )}
          <AuthField label="Membership number" optional
            hint={isPaypal ? undefined : 'If the church has your phone number, your gift is linked to you anyway.'}>
            <input className={authInput} value={form.reference} onChange={set('reference')} maxLength={12} placeholder="e.g. M0001" />
          </AuthField>
        </fieldset>

        <div className="flex flex-col gap-3">
          {chosen && Number(form.amount) > 0 && (
            <p className="flex justify-between gap-3 text-[15px] text-mk-muted"><span>{chosen.label}</span><span className="font-semibold text-mk-forest">{giftAmount(form.amount)}</span></p>
          )}
          <button className={`${authPrimary} h-[58px] gap-2.5 sm:text-[17px]`} disabled={state === 'sending' || !options?.length}>
            {state === 'sending'
              ? (isPaypal ? 'Opening PayPal…' : 'Sending prompt…')
              : <>Give {form.amount ? giftAmount(form.amount) : ''} with {isPaypal ? 'PayPal' : netLabel} <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" /></>}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-mk-muted">
            <Lock className="h-4 w-4 flex-none" aria-hidden="true" />
            {isPaypal ? 'You pay on PayPal. The church never sees your card.' : `You confirm with your ${netLabel} PIN on your phone. The church never sees it.`}
          </p>
        </div>
      </form>
    </GiveLayout>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <legend className="mb-3.5 flex items-center gap-2.5 text-base font-semibold text-mk-forest">
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-700" aria-hidden="true">{n}</span>
      {children}
    </legend>
  )
}

function Dot({ on }: { on: boolean }) {
  return (
    <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${on ? 'bg-primary text-on-primary' : 'border-2 border-[#C9D6D0]'}`} aria-hidden="true">
      {on && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  )
}

function ProjectOption({ option, on, onChange }: { option: GivingOption; on: boolean; onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  const p = option.details!
  const image = assetUrl(p.image_url)
  return (
    <label className={`relative flex cursor-pointer items-center gap-3.5 rounded-2xl py-2.5 pl-2.5 pr-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${on ? 'border-2 border-brand-600 bg-brand-50' : 'border border-mk-border bg-white hover:border-brand-200'}`}>
      <input type="radio" name="option" value={option.value} checked={on} onChange={onChange} className="absolute h-px w-px opacity-0" />
      {image
        ? <img src={image} alt="" className="h-16 w-16 flex-none rounded-xl object-cover" />
        : <span className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Church className="h-7 w-7" aria-hidden="true" /></span>}
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="font-semibold text-mk-forest">{p.name}</span>
        {p.percent != null && (
          <>
            <span className="h-1.5 overflow-hidden rounded-full bg-mk-mist" aria-hidden="true"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${Math.min(p.percent, 100)}%` }} /></span>
            <span className="text-[13px] text-mk-muted">{money(p.amount_raised)} of {money(p.target_amount)} · {p.percent}%</span>
          </>
        )}
      </span>
      <Dot on={on} />
    </label>
  )
}

function StateIcon({ tone }: { tone: 'good' | 'bad' }) {
  return tone === 'good'
    ? <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-on-primary"><Check className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" /></span>
    : <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[#FBEDEA] text-[#8E2F22]"><XCircle className="h-7 w-7" aria-hidden="true" /></span>
}

/** "Prefer the M-PESA menu?": the church's Paybill and the codes to type after the phone number. */
function PaybillBox({ types }: { types: PublicDonationType[] }) {
  const paybill = branding.raw?.paybill
  const codes = types.filter((t) => t.code && !t.asks_project)
  if (!paybill || !codes.length) return null
  return (
    <section aria-labelledby="paybill-title" className="flex flex-col gap-3.5 rounded-[22px] border border-mk-border bg-white p-6">
      <h2 id="paybill-title" className="font-display text-xl font-semibold text-mk-forest">Prefer the M-PESA menu?</h2>
      <p className="text-[15px] text-mk-muted">Lipa na M-PESA → Pay Bill. Your SMS receipt comes from the church either way.</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-[15px]">
        <dt className="text-mk-muted">Business number</dt>
        <dd className="font-display text-xl font-semibold tracking-[0.04em] text-mk-forest">{paybill}</dd>
        <dt className="text-mk-muted">Account</dt>
        <dd className="min-w-0 text-mk-forest">Your phone number + the gift's code, e.g. <span className="break-all font-mono font-semibold">0712345678{codes[0].code}</span></dd>
      </dl>
      <ul className="flex flex-wrap gap-2" aria-label="Gift codes">
        {codes.map((t) => (
          <li key={t.id} className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm text-mk-forest">
            <span className="font-mono font-bold text-brand-700">{t.code}</span>{t.name}
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The give page's frame (also PayPal's return page): on wide screens the church's photograph and
 * the Paybill on the left, the gift on a white card on the right; on phones a photo header and a sheet.
 */
export function GiveLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const photo = churchPhoto('/landing/church-cover.jpg')
  return (
    <div className="min-h-screen bg-mk-ivory font-body text-base leading-relaxed text-mk-slate">
      <header className="hidden border-b border-mk-border bg-white lg:block">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-8 py-3.5">
          <Link to="/" className="flex min-w-0 items-center gap-3 text-mk-forest">
            <Logo tile className="h-10 w-10" />
            <span className="truncate font-display text-[17px] font-semibold">{branding.name}</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-7 text-[15px] font-medium">
            <Link to="/" className="hover:text-mk-forest">Church website</Link>
            <Link to="/me" className="hover:text-mk-forest">My giving</Link>
          </nav>
        </div>
      </header>

      {/* Phones: the church's photograph as a header */}
      <div className="relative h-[230px] bg-sidebar text-white lg:hidden">
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_45%]" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${shade(60)} 0%, ${shade(20)} 45%, ${shade(75)} 100%)` }} />
        <div className="relative flex h-full flex-col justify-between px-[22px] pb-[50px] pt-[22px]">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" aria-label="Back to the church website" className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-white/30 bg-white/15 hover:bg-white/25">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <span className="truncate font-display font-semibold">{branding.name}</span>
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/85">Give</p>
        </div>
      </div>

      <main className="relative -mt-7 flex flex-col gap-7 rounded-t-[28px] bg-mk-ivory px-[22px] pb-8 pt-[30px] lg:mx-auto lg:mt-0 lg:max-w-[1200px] lg:flex-row lg:items-start lg:gap-16 lg:rounded-none lg:px-8 lg:pb-20 lg:pt-12">
        <div className="hidden min-w-0 flex-[1_1_420px] flex-col gap-6 lg:flex">
          <div className="relative flex min-h-[520px] overflow-hidden rounded-[28px] bg-sidebar text-white">
            <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_45%]" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${shade(10)} 0%, ${shade(35)} 45%, ${shade(92)} 100%)` }} />
            <div className="relative mt-auto flex flex-col gap-3.5 p-9">
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/85">Give</p>
              <h1 className="font-display text-[48px] font-semibold leading-[1.05] tracking-[-0.02em]">Give to {branding.name}</h1>
              <p className="text-[17px] text-white/90">Every gift is received with thanks, recorded, and confirmed to you by SMS.</p>
            </div>
          </div>
          {aside}
        </div>

        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-6 lg:rounded-[28px] lg:border lg:border-mk-border lg:bg-white lg:p-9 lg:shadow-[0_2px_4px_rgba(16,43,39,0.04),0_30px_60px_-40px_rgba(16,43,39,0.3)]">
          <div className="flex flex-col gap-1.5 lg:hidden">
            <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest">Give to {branding.name}</h1>
            <p className="text-mk-muted">Every gift is received with thanks and confirmed to you by SMS.</p>
          </div>
          {children}
        </div>

        {aside && <div className="lg:hidden">{aside}</div>}
      </main>

      <footer className="border-t border-mk-border">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-[22px] py-5 text-[13px] text-mk-muted lg:px-8">
          <span>© {new Date().getFullYear()} {branding.name}</span>
          <PoweredBy wordmark className="text-mk-muted" />
        </div>
      </footer>
    </div>
  )
}
