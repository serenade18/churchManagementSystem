import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
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

  const again = <Link to="/give" className="btn-primary mt-6 inline-flex">Give again</Link>

  return (
    <GiveLayout>
      <div className="py-6 text-center">
        {!result ? (
          <>
            <Loader2 className="mx-auto mb-3 h-12 w-12 animate-spin text-brand-600" />
            <h1 className="text-xl font-semibold">Confirming your gift…</h1>
            <p className="mt-2 text-sm text-slate-600">Please don't close this page.</p>
          </>
        ) : result.status === 'completed' ? (
          <>
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-500" />
            <h1 className="text-xl font-semibold">Thank you!</h1>
            <p className="mt-2 text-sm text-slate-600">
              Your gift of {currencyMoney(result.amount, result.currency)}{result.donation_type && ` towards ${result.donation_type}`} has been received. God bless you!
            </p>
            {again}
          </>
        ) : result.status === 'created' ? (
          <>
            <Clock className="mx-auto mb-3 h-14 w-14 text-amber-500" />
            <h1 className="text-xl font-semibold">Payment not finished</h1>
            <p className="mt-2 text-sm text-slate-600">PayPal hasn't confirmed this payment yet. If you approved it, we'll confirm it shortly and send your receipt.</p>
            <Link to="/give" className="btn-secondary mt-6 inline-flex">Back to giving</Link>
          </>
        ) : (
          <>
            <XCircle className="mx-auto mb-3 h-14 w-14 text-red-500" />
            <h1 className="text-xl font-semibold">Payment not completed</h1>
            <p className="mt-2 text-sm text-slate-600">{result.error || result.message || 'PayPal did not complete the payment. You have not been charged.'}</p>
            <Link to="/give" className="btn-primary mt-6 inline-flex">Try again</Link>
          </>
        )}
      </div>
    </GiveLayout>
  )
}
