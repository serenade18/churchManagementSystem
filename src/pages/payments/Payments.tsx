import { useState, type FormEvent } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Landmark, Percent, Wallet } from 'lucide-react'
import { Alert, Badge, Field, Modal, PageHeader, Pagination, StatCard, Table, type Column } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useCan } from '../../lib/access'
import { useAuth } from '../../lib/auth'
import { dateTime } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import type { Page, WalletEntry, WalletSummary, Withdrawal } from '../../types'

// The church's wallet: gifts paid to mKanisa's SasaPay merchant code are held here, less the
// platform's fee, and withdrawn to M-PESA. A withdrawal is confirmed with a code SMSed to whoever
// starts it, and every one is SMSed to the church's owners.

const cents = new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const kes = (value: string | number) => `${Number(value) < 0 ? '−' : ''}KES ${cents.format(Math.abs(Number(value)))}`
const local = (phone: string) => phone.replace(/^254/, '0')

const KINDS: Record<WalletEntry['kind'], string> = { collection: 'Gift received', fee: 'Platform fee', withdrawal: 'Withdrawal', reversal: 'Withdrawal returned' }
const STATUS: Record<Withdrawal['status'], [string, 'amber' | 'green' | 'red']> = { processing: ['Sending', 'amber'], paid: ['Paid', 'green'], failed: ['Failed', 'red'] }

function Withdraw({ wallet, onClose, onDone }: { wallet: WalletSummary; onClose: () => void; onDone: (text: string) => void }) {
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState(local(user?.phone_number || ''))
  const [started, setStarted] = useState<{ id: number; sent_to: string } | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (e: FormEvent, step: () => Promise<void>) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { await step() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  const start = (e: FormEvent) => run(e, async () => {
    setStarted(await api.post<{ id: number; sent_to: string }>('/cms/wallet/withdrawals/', { amount, phone_number: phone }))
  })
  const confirm = (e: FormEvent) => run(e, async () => {
    const w = await api.post<Withdrawal>(`/cms/wallet/withdrawals/${started!.id}/confirm/`, { code })
    onDone(`${kes(w.amount)} is on its way to ${local(w.phone_number)}. It shows as paid once SasaPay confirms it.`)
  })

  return (
    <Modal open onClose={onClose} title="Withdraw to M-PESA"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" form="withdraw-form" disabled={busy}>{busy ? 'Please wait…' : started ? 'Withdraw' : 'Send me a code'}</button></>}>
      <Alert>{error}</Alert>
      {started ? (
        <form id="withdraw-form" onSubmit={confirm} className="flex flex-col gap-4">
          <p className="text-[15px]">We sent a 6-digit code to {started.sent_to}. Enter it to send <strong>{kes(amount)}</strong> to <strong>{phone}</strong>.</p>
          <Field label="Code">
            <input className="input tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </form>
      ) : (
        <form id="withdraw-form" onSubmit={start} className="flex flex-col gap-4">
          <p className="text-[15px]">The wallet has <strong>{kes(wallet.balance)}</strong>.</p>
          <Field label="Amount (KES)" hint={`Between ${kes(wallet.min_withdrawal)} and ${kes(wallet.max_withdrawal)}.`}>
            <input className="input" type="number" inputMode="decimal" required min={wallet.min_withdrawal} max={Math.min(Number(wallet.max_withdrawal), Number(wallet.balance))} step="0.01"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="M-PESA number" hint="Where the money goes. Check it: a payout can’t be taken back.">
            <input className="input" type="tel" inputMode="tel" required placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <p className="text-[13px] text-mk-muted">Next, we SMS you a code to confirm. The church’s owners get an SMS about every withdrawal.</p>
        </form>
      )}
    </Modal>
  )
}

export default function Payments() {
  const can = useCan()
  const [tab, setTab] = useState<'entries' | 'withdrawals'>('entries')
  const [page, setPage] = useState(1)
  const [withdrawing, setWithdrawing] = useState(false)
  const [notice, setNotice] = useState('')
  const wallet = useApi<WalletSummary>('/cms/wallet/')
  const entries = useApi<Page<WalletEntry>>(tab === 'entries' ? '/cms/wallet/entries/' : null, { page })
  const withdrawals = useApi<Page<Withdrawal>>(tab === 'withdrawals' ? '/cms/wallet/withdrawals/' : null, { page })
  const w = wallet.data
  const canWithdraw = can('wallet', true) && w?.enabled && Number(w.balance) >= Number(w.min_withdrawal)

  const entryColumns: Column<WalletEntry>[] = [
    { key: 'created_at', label: 'When', render: (r) => dateTime(r.created_at) },
    { key: 'kind', label: 'What', render: (r) => <span className="font-medium text-mk-forest">{KINDS[r.kind]}</span> },
    { key: 'description', label: 'Details', render: (r) => <span className="text-mk-muted">{r.description}</span> },
    { key: 'amount', label: 'Amount', className: 'text-right', render: (r) => <span className={`font-semibold tabular-nums ${Number(r.amount) < 0 ? 'text-mk-slate' : 'text-[#286B58]'}`}>{Number(r.amount) > 0 && '+'}{kes(r.amount)}</span> },
  ]
  const withdrawalColumns: Column<Withdrawal>[] = [
    { key: 'created_at', label: 'When', render: (r) => dateTime(r.created_at) },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold text-mk-forest">{kes(r.amount)}</span> },
    { key: 'phone_number', label: 'To', render: (r) => <>{local(r.phone_number)}{r.recipient_name && <span className="text-mk-muted"> · {r.recipient_name}</span>}</> },
    { key: 'requested_by_name', label: 'By' },
    { key: 'status', label: 'Status', render: (r) => <span title={r.result_description}><Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge></span> },
    { key: 'provider_code', label: 'SasaPay code', render: (r) => r.provider_code || '—' },
  ]

  return (
    <>
      <PageHeader title="Payments" subtitle="Your church’s mKanisa wallet: gifts paid to mKanisa’s SasaPay account, and withdrawals to M-PESA."
        actions={can('wallet', true) && <button className="btn-primary" disabled={!canWithdraw} onClick={() => setWithdrawing(true)}><ArrowUpFromLine className="h-4 w-4" /> Withdraw</button>} />
      <Alert>{wallet.error?.message}</Alert>
      <Alert tone="green">{notice}</Alert>
      {w && !w.enabled && <Alert tone="amber">The wallet opens once mKanisa’s SasaPay account is connected. Until then, gifts go to your church’s own Paybill or merchant code.</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Wallet balance" value={w ? kes(w.balance) : '—'}
          hint={w && Number(w.sending) > 0 ? `${kes(w.sending)} being sent` : w && `Withdraw from ${kes(w.min_withdrawal)}`} />
        <StatCard icon={ArrowDownToLine} label="Total collections" value={w ? kes(w.collections) : '—'} hint="Gifts received into the wallet" />
        <StatCard icon={Percent} label="Platform fees" value={w ? kes(w.fees) : '—'} hint={w && `${Number(w.fee_percent)}% of each gift`} />
        <StatCard icon={Banknote} label="Withdrawn" value={w ? kes(w.withdrawn) : '—'} hint="Paid out to M-PESA" />
      </div>

      <div className="mb-3 mt-8 flex border-b border-mk-border">
        {([['entries', 'Transactions'], ['withdrawals', 'Withdrawals']] as const).map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); setPage(1) }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-brand-700 text-brand-800' : 'border-transparent text-mk-muted hover:text-mk-slate'}`}>{label}</button>
        ))}
      </div>
      {tab === 'entries' ? (
        <>
          <Table columns={entryColumns} rows={entries.data?.results} loading={entries.loading} empty="Nothing yet. Gifts paid to mKanisa’s SasaPay account show here as they arrive." />
          <Pagination page={page} count={entries.data?.count} onChange={setPage} />
        </>
      ) : (
        <>
          <Table columns={withdrawalColumns} rows={withdrawals.data?.results} loading={withdrawals.loading} empty="No withdrawals yet." />
          <Pagination page={page} count={withdrawals.data?.count} onChange={setPage} />
        </>
      )}

      <section aria-label="Loans and credit" className="card mt-8 flex items-center gap-4 p-5">
        <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700"><Landmark className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-mk-forest">Loans &amp; Credit</h2>
          <p className="text-sm text-mk-muted">Financing for your church’s projects, based on its giving.</p>
        </div>
        <Badge tone="amber">Coming soon</Badge>
      </section>

      {withdrawing && w && <Withdraw wallet={w} onClose={() => setWithdrawing(false)}
        onDone={(text) => { setWithdrawing(false); setNotice(text); setTab('withdrawals'); wallet.reload(); withdrawals.reload() }} />}
    </>
  )
}
