import { useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { Alert, Badge, Table } from './ui'
import { api } from '../lib/api'
import { useApi } from '../lib/hooks'
import { dateTime, money } from '../lib/format'

const OUTCOMES = {
  import: ['amber', 'Missing: will import'],
  link_online: ['blue', 'Online payment: will confirm'],
  review: ['red', 'Check by hand'],
  mismatch: ['red', 'Amount differs'],
  recorded: ['green', 'Already recorded'],
  skip: ['slate', 'Not a payment in'],
}
// Labels once an import has been applied
const APPLIED = { import: ['green', 'Imported'], link_online: ['green', 'Confirmed'] }
const ACTIONABLE = ['import', 'link_online', 'review', 'mismatch']

export default function Reconcile({ onImported }) {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [sendReceipts, setSendReceipts] = useState(true)
  const runs = useApi('/cms/reconciliation/')

  const submit = async (mode) => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    form.append('send_receipts', sendReceipts ? 'true' : 'false')
    setBusy(true); setError(''); setDone('')
    try {
      const res = await api.upload(`/cms/reconciliation/${mode}/`, form)
      setResult(res)
      if (mode === 'import') {
        setDone(`Imported ${res.summary.counts.import || 0} missing Paybill payment(s) and confirmed ${res.summary.counts.link_online || 0} online payment(s).`)
        runs.reload(); onImported?.()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const summary = result?.summary
  const rows = (result?.rows || []).filter((r) => showAll || ACTIONABLE.includes(r.outcome)).map((r) => ({ ...r, id: `${r.line}-${r.receipt}` }))
  const pendingImport = summary && !summary.applied ? summary.to_import : 0
  const label = (outcome) => (summary?.applied && APPLIED[outcome]) || OUTCOMES[outcome]

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><FileSpreadsheet /></span>
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Check your M-PESA statement for missed payments</p>
            <p className="mt-1">
              If the server was down when Safaricom sent a payment, it won't be in the system. Download the statement from the
              M-PESA business portal (Organization statement → choose the dates → export as CSV or Excel) and upload it here.
              You'll see what's missing before anything is changed, and re-uploading the same statement is safe.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" accept=".csv,.xlsx" className="input sm:max-w-sm" onChange={(e) => { setFile(e.target.files[0] || null); setResult(null); setDone('') }} />
          <button className="btn-primary" disabled={!file || busy} onClick={() => submit('preview')}><Upload className="h-4 w-4" /> {busy && !summary ? 'Checking…' : 'Check statement'}</button>
        </div>
      </div>

      <Alert>{error}</Alert>
      <Alert tone="green">{done}</Alert>

      {summary && (
        <div className="card p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold">{summary.rows} transactions{summary.period_start && ` · ${dateTime(summary.period_start)} – ${dateTime(summary.period_end)}`}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(OUTCOMES).filter((k) => summary.counts[k]).map((k) => (
                  <Badge key={k} tone={label(k)[0]}>{summary.counts[k]} · {label(k)[1]}</Badge>
                ))}
              </div>
            </div>
            {pendingImport > 0 && (
              <div className="flex flex-col items-start gap-2 lg:items-end">
                <button className="btn-primary" disabled={busy} onClick={() => submit('import')}>
                  {busy ? 'Importing…' : `Import ${pendingImport} missing payment${pendingImport === 1 ? '' : 's'} (${money(summary.amount_to_import)})`}
                </button>
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={sendReceipts} onChange={(e) => setSendReceipts(e.target.checked)} /> Send SMS receipts to givers</label>
              </div>
            )}
            {summary.applied === false && pendingImport === 0 && <p className="text-sm font-medium text-emerald-700">Everything on this statement is already in the system.</p>}
          </div>
          <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show all transactions (not just ones needing action)
          </label>
          <Table rows={rows} empty="Nothing needs action." columns={[
            { key: 'time', label: 'Date', render: (r) => (r.time ? dateTime(r.time) : '—') },
            { key: 'receipt', label: 'M-PESA ref', render: (r) => <span className="font-mono">{r.receipt}</span> },
            { key: 'payer', label: 'Payer', render: (r) => r.payer || '—' },
            { key: 'account', label: 'Account', render: (r) => <span className="font-mono">{r.account || '—'}</span> },
            { key: 'outcome', label: 'Result', className: 'whitespace-normal', render: (r) => (
              <div><Badge tone={label(r.outcome)[0]}>{label(r.outcome)[1]}</Badge><p className="mt-1 text-xs text-slate-500">{r.detail}</p></div>
            ) },
            { key: 'amount', label: 'Amount', className: 'text-right font-semibold', render: (r) => money(r.amount) },
          ]} />
        </div>
      )}

      <div>
        <h3 className="mb-3 font-semibold">Past imports</h3>
        <Table loading={runs.loading} rows={runs.data || []} empty="No statements imported yet." columns={[
          { key: 'created_at', label: 'Imported', render: (r) => dateTime(r.created_at) },
          { key: 'period', label: 'Statement period', render: (r) => (r.period_start ? `${dateTime(r.period_start)} – ${dateTime(r.period_end)}` : '—') },
          { key: 'rows', label: 'Rows', className: 'text-right' },
          { key: 'imported', label: 'Imported', className: 'text-right', render: (r) => r.imported + r.linked },
          { key: 'needs_review', label: 'To check', className: 'text-right' },
          { key: 'amount_imported', label: 'Amount', className: 'text-right', render: (r) => money(r.amount_imported) },
          { key: 'run_by', label: 'By' },
        ]} />
      </div>
    </div>
  )
}
