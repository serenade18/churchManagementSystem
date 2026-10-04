import { useState } from 'react'
import { CheckCircle2, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react'
import { Alert, Badge, Table } from './ui'
import { api } from '../lib/api'
import { useApi } from '../lib/hooks'
import { dateTime, money } from '../lib/format'

const OUTCOMES = {
  import: ['amber', 'Missing in system: will add'],
  link_online: ['blue', 'Online gift stuck pending: will confirm'],
  mismatch: ['red', 'Amount differs: will use Safaricom\'s'],
  not_on_statement: ['red', 'Not on Safaricom\'s statement: will mark not received'],
  stale: ['amber', 'Pending online gift that never arrived: will mark failed'],
  review: ['red', 'Check by hand'],
  recorded: ['green', 'Matches'],
  skip: ['slate', 'Not money in'],
}
// Labels once applied
const APPLIED = {
  import: ['green', 'Added'], link_online: ['green', 'Confirmed'], mismatch: ['green', 'Amount corrected'],
  not_on_statement: ['slate', 'Marked not received'], stale: ['slate', 'Marked failed'],
}
const ACTIONABLE = ['import', 'link_online', 'mismatch', 'not_on_statement', 'stale', 'review']

function Totals({ summary }) {
  const statement = Number(summary.statement_total)
  const system = Number(summary.system_total_after ?? summary.system_total)
  const matches = Math.abs(statement - system) < 0.01
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg bg-slate-50 p-3">
        <p className="text-xs text-slate-500">Safaricom received</p>
        <p className="text-lg font-semibold">{money(statement)}</p>
      </div>
      <div className="rounded-lg bg-slate-50 p-3">
        <p className="text-xs text-slate-500">{summary.system_total_after != null ? 'System now has' : 'System has'}</p>
        <p className="text-lg font-semibold">{money(system)}</p>
      </div>
      <div className={`rounded-lg p-3 ${matches ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
        <p className="text-xs">Difference</p>
        <p className="flex items-center gap-1.5 text-lg font-semibold">
          {matches ? <><CheckCircle2 className="h-5 w-5" /> In sync</> : money(system - statement)}
        </p>
      </div>
    </div>
  )
}

export default function Reconcile({ onImported }) {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [sendReceipts, setSendReceipts] = useState(true)
  const [confirmMark, setConfirmMark] = useState(false)
  const runs = useApi('/cms/reconciliation/')

  const submit = async (mode) => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    form.append('send_receipts', sendReceipts ? 'true' : 'false')
    setBusy(mode); setError(''); setDone('')
    try {
      const res = await api.upload(`/cms/reconciliation/${mode}/`, form)
      setResult(res)
      if (mode !== 'preview') {
        const c = res.summary.counts
        setDone(mode === 'sync'
          ? `Synced: ${c.import || 0} added, ${c.link_online || 0} confirmed, ${c.fixed || 0} amount(s) corrected, `
            + `${(c.not_on_statement || 0) + (c.stale || 0)} marked not received.`
          : `Added ${c.import || 0} missing payment(s) and confirmed ${c.link_online || 0} online payment(s).`)
        runs.reload(); onImported?.()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  const summary = result?.summary
  const applied = summary?.applied
  const label = (outcome) => (applied && APPLIED[outcome]) || OUTCOMES[outcome]
  const rows = (result?.rows || []).filter((r) => showAll || ACTIONABLE.includes(r.outcome)).map((r, i) => ({ ...r, id: `${i}-${r.receipt}` }))
  const changes = summary ? summary.to_import + summary.to_fix + summary.to_mark : 0

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><RefreshCw /></span>
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Sync with M-PESA</p>
            <p className="mt-1">
              Make your records match Safaricom's. Download the statement from the M-PESA business portal (Org statement →
              choose the dates → export as CSV or Excel) and upload it. You'll see every difference, in both directions,
              before anything changes. Nothing is ever deleted, and syncing the same statement twice is safe.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" accept=".csv,.xlsx" className="input sm:max-w-sm"
            onChange={(e) => { setFile(e.target.files[0] || null); setResult(null); setDone(''); setConfirmMark(false) }} />
          <button className="btn-secondary" disabled={!file || !!busy} onClick={() => submit('preview')}>
            <Upload className="h-4 w-4" /> {busy === 'preview' ? 'Checking…' : 'Check statement'}
          </button>
        </div>
      </div>

      <Alert>{error}</Alert>
      <Alert tone="green">{done}</Alert>

      {summary && (
        <div className="card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-slate-400" />
            <p className="font-semibold">{summary.rows} transactions{summary.period_start && ` · ${dateTime(summary.period_start)} – ${dateTime(summary.period_end)}`}</p>
          </div>
          <Totals summary={summary} />
          <div className="flex flex-wrap gap-2">
            {Object.keys(OUTCOMES).filter((k) => summary.counts[k]).map((k) => (
              <Badge key={k} tone={label(k)[0]}>{summary.counts[k]} · {label(k)[1]}</Badge>
            ))}
          </div>

          {!applied && changes > 0 && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm font-medium text-slate-900">Sync will make {changes} change{changes === 1 ? '' : 's'} so your records match Safaricom's:</p>
              <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
                {summary.to_import > 0 && <li>add or confirm {summary.to_import} payment{summary.to_import === 1 ? '' : 's'} ({money(summary.amount_to_import)})</li>}
                {summary.to_fix > 0 && <li>correct {summary.to_fix} amount{summary.to_fix === 1 ? '' : 's'} to Safaricom's</li>}
                {summary.to_mark > 0 && <li>mark {summary.to_mark} record{summary.to_mark === 1 ? '' : 's'} Safaricom doesn't have as not received (kept for the record, removed from totals)</li>}
              </ul>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <label className="flex items-center gap-2"><input type="checkbox" checked={sendReceipts} onChange={(e) => setSendReceipts(e.target.checked)} /> Send SMS receipts for added gifts</label>
                {summary.to_mark > 0 && (
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" checked={confirmMark} onChange={(e) => setConfirmMark(e.target.checked)} />
                    <span>This statement covers all M-PESA payments for these dates, so anything not on it wasn't received.</span>
                  </label>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-primary" disabled={!!busy || (summary.to_mark > 0 && !confirmMark)} onClick={() => submit('sync')}>
                  <RefreshCw className="h-4 w-4" /> {busy === 'sync' ? 'Syncing…' : 'Sync now'}
                </button>
                {summary.to_import > 0 && (
                  <button className="btn-secondary" disabled={!!busy} onClick={() => submit('import')}>
                    {busy === 'import' ? 'Adding…' : 'Only add missing payments'}
                  </button>
                )}
              </div>
            </div>
          )}
          {!applied && changes === 0 && <p className="text-sm font-medium text-emerald-700">Your records already match this statement.</p>}

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show all transactions (not just differences)
          </label>
          <Table rows={rows} empty="No differences." columns={[
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
        <h3 className="mb-3 font-semibold">Past syncs and imports</h3>
        <Table loading={runs.loading} rows={runs.data || []} empty="No statements synced yet." columns={[
          { key: 'created_at', label: 'When', render: (r) => <>{dateTime(r.created_at)}{r.synced && <span className="ml-2"><Badge tone="blue">Sync</Badge></span>}</> },
          { key: 'period', label: 'Statement period', render: (r) => (r.period_start ? `${dateTime(r.period_start)} – ${dateTime(r.period_end)}` : '—') },
          { key: 'rows', label: 'Rows', className: 'text-right' },
          { key: 'imported', label: 'Added', className: 'text-right', render: (r) => r.imported + r.linked },
          { key: 'amounts_fixed', label: 'Corrected', className: 'text-right', render: (r) => r.amounts_fixed || 0 },
          { key: 'marked_not_received', label: 'Not received', className: 'text-right', render: (r) => r.marked_not_received || 0 },
          { key: 'needs_review', label: 'To check', className: 'text-right' },
          { key: 'run_by', label: 'By' },
        ]} />
      </div>
    </div>
  )
}
