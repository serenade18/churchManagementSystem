import { useParams } from 'react-router-dom'
import PrintLayout, { ChurchHeader } from '../../components/PrintLayout'
import { useApi } from '../../lib/hooks'
import { currencyMoney, dateTime, money } from '../../lib/format'

function Row({ label, children }) {
  if (!children) return null
  return (
    <div className="flex gap-4 border-b border-dotted border-slate-300 py-2 text-sm">
      <span className="w-40 shrink-0 text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{children}</span>
    </div>
  )
}

export default function ReceiptPrint() {
  const { id } = useParams()
  const { data: r, loading, error } = useApi(`/cms/donations/${id}/receipt/`)

  return (
    <PrintLayout title={r ? `Receipt ${r.receipt_number}` : 'Receipt'} pageSize="A5" loading={loading} error={error}>
      {r && (
        <div className="text-slate-800">
          <ChurchHeader church={r.church} title="Official Receipt" subtitle={
            <div className="mt-1 text-xs text-slate-600">
              <p>No. <span className="font-mono font-semibold text-slate-900">{r.receipt_number}</span></p>
              <p>{dateTime(r.date)}</p>
            </div>
          } />

          <p className="mb-1 text-sm text-slate-500">Received with thanks from</p>
          <p className="mb-4 border-b border-slate-400 pb-1 text-lg font-semibold">{r.received_from}</p>

          <Row label="Membership no.">{r.membership_number}</Row>
          <Row label="Branch">{r.branch}</Row>
          <Row label="Being payment for">{r.donation_type}{r.project && ` - ${r.project}`}</Row>
          <Row label="Payment method">{r.channel}</Row>
          <Row label="Reference">{r.reference && <span className="font-mono">{r.reference}</span>}</Row>
          <Row label="Notes">{r.notes}</Row>

          <div className="my-5 flex items-center justify-between rounded-md border-2 border-slate-800 px-4 py-3">
            <span className="text-sm font-semibold uppercase tracking-wide">Amount</span>
            <span className="text-2xl font-bold">{money(r.amount)}</span>
          </div>
          {r.paid_currency && (
            <p className="mb-1 text-sm"><span className="text-slate-500">Paid: </span><span className="font-medium">{currencyMoney(r.paid_amount, r.paid_currency)}</span> (shilling value above)</p>
          )}
          <p className="text-sm"><span className="text-slate-500">Amount in words: </span><span className="font-medium italic">{r.amount_in_words}</span></p>

          <div className="mt-10 flex items-end justify-between gap-8 text-sm">
            <div className="flex-1">
              <div className="border-b border-slate-500 pb-1 font-medium">{r.recorded_by || ' '}</div>
              <p className="mt-1 text-xs text-slate-500">Received by</p>
            </div>
            <div className="flex-1">
              <div className="h-6 border-b border-slate-500" />
              <p className="mt-1 text-xs text-slate-500">Signature &amp; stamp</p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs italic text-slate-500">"God loves a cheerful giver." 2 Corinthians 9:7</p>
          <p className="mt-1 text-center text-[10px] text-slate-400">Printed {dateTime(r.printed_at)}</p>
        </div>
      )}
    </PrintLayout>
  )
}
