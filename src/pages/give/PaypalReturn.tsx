import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Clock, Loader2, XCircle } from 'lucide-react'
import { authPrimary, authSecondary } from '../../components/AuthShell'
import { errorMessage, request } from '../../lib/api'
import { currencyMoney } from '../../lib/format'
import { GiveLayout } from './Give'
import type { PaypalGift } from '../../types'

/** PayPal sends givers here (?token=<order id>) after they approve; we then take the payment. */
export default function PaypalReturn() {
  const [params] = useSearchParams()
  const orderId = params.get('token')
  const [result, setResult] = useState<(Partial<PaypalGift> & { error?: string }) | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return // React StrictMode runs effects twice in development
    started.current = true
    if (!orderId) return setResult({ error: 'This PayPal link is missing its order number.' })
    request<PaypalGift>(`/paypal/orders/${encodeURIComponent(orderId)}/capture/`, { method: 'POST', auth: false })
      .then(setResult)
      .catch((err) => setResult({ error: errorMessage(err) }))
  }, [orderId])

  const title = 'font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest'
  const icon = (Icon: typeof Clock, cls: string) => (
    <span className={`flex h-[60px] w-[60px] items-center justify-center rounded-full ${cls}`}><Icon className="h-7 w-7" aria-hidden="true" /></span>
  )

  return (
    <GiveLayout>
      {!result ? (
        <>
          {icon(Loader2, 'bg-brand-50 text-brand-700 [&>svg]:animate-spin')}
          <div className="flex flex-col gap-2" role="status">
            <h2 className={title}>Confirming your gift…</h2>
            <p className="text-mk-muted">Please don't close this page.</p>
          </div>
        </>
      ) : result.status === 'completed' ? (
        <>
          {icon(Check, 'bg-primary text-on-primary')}
          <div className="flex flex-col gap-2" role="status">
            <h2 className={`${title} text-[36px]`}>Thank you!</h2>
            <p className="text-[17px] text-mk-muted">
              Your gift of {currencyMoney(result.amount, result.currency)}{result.donation_type && ` towards ${result.donation_type}`} has been received. God bless you!
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link to="/me" className={`${authPrimary} h-12 flex-1 basis-40`}>See all my giving</Link>
            <Link to="/give" className={`${authSecondary} h-12 flex-1 basis-40`}>Give again</Link>
          </div>
        </>
      ) : result.status === 'created' ? (
        <>
          {icon(Clock, 'bg-[#FBF4E4] text-[#7A5A1E]')}
          <div className="flex flex-col gap-2">
            <h2 className={title}>Payment not finished</h2>
            <p className="text-mk-muted">PayPal hasn't confirmed this payment yet. If you approved it, we'll confirm it shortly and send your receipt.</p>
          </div>
          <Link to="/give" className={authSecondary}>Back to giving</Link>
        </>
      ) : (
        <>
          {icon(XCircle, 'bg-[#FBEDEA] text-[#8E2F22]')}
          <div className="flex flex-col gap-2">
            <h2 className={title}>Payment not completed</h2>
            <p className="text-mk-muted">{result.error || result.message || 'PayPal did not complete the payment. You have not been charged.'}</p>
          </div>
          <Link to="/give" className={authPrimary}>Try again</Link>
        </>
      )}
    </GiveLayout>
  )
}
