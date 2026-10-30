import { useState, type FormEvent } from 'react'
import { Banknote, CalendarClock, ChevronDown, ChevronUp, Pencil, Plus, Send, Users } from 'lucide-react'
import { Alert, Badge, Field, Modal, StatCard, Table, type Column } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useCan } from '../../lib/access'
import { dateTime } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import { clean, useForm } from '../../lib/useForm'
import type { Page, PayRun, Payslip, PayrollSummary, StaffMember, WalletSummary } from '../../types'

// Payroll: the people the church pays and their monthly salaries, paid from the wallet to M-PESA.
// A pay run is confirmed with one SMS code, then each salary goes out as its own payout (it shows
// under Withdrawals too); a payout that fails is handed back to the wallet.

const cents = new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const kes = (value: string | number) => `KES ${cents.format(Number(value))}`
const local = (phone: string) => phone.replace(/^254/, '0')
const monthName = (period: string) => new Date(`${period.slice(0, 7)}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
const thisMonth = () => new Date().toISOString().slice(0, 7)

const SLIP: Record<Payslip['status'], [string, 'amber' | 'green' | 'red' | 'slate']> = {
  awaiting_code: ['Not sent', 'slate'], processing: ['Sending', 'amber'], paid: ['Paid', 'green'], failed: ['Failed: back in the wallet', 'red'],
}

function StaffForm({ person, onClose, onSaved }: { person?: StaffMember; onClose: () => void; onSaved: () => void }) {
  const { values, set, errors, error, busy, submit } = useForm({
    name: person?.name || '', title: person?.title || '', phone_number: person ? local(person.phone_number) : '',
    salary: person ? String(Number(person.salary)) : '', notes: person?.notes || '', is_active: person?.is_active ?? true,
  })
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const payload = { ...clean(values), title: values.title, notes: values.notes, is_active: values.is_active }
    const ok = await submit(() => (person ? api.patch(`/cms/payroll/staff/${person.id}/`, payload) : api.post('/cms/payroll/staff/', payload))).catch(() => null)
    if (ok) onSaved()
  }
  return (
    <Modal open onClose={onClose} title={person ? `Edit ${person.name}` : 'Add staff'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="staff-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error}</Alert>
      <form id="staff-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" error={errors.name}><input className="input" required value={values.name} onChange={set('name')} /></Field>
        <Field label="Job" error={errors.title}><input className="input" value={values.title} onChange={set('title')} placeholder="e.g. Caretaker" /></Field>
        <Field label="M-PESA number *" error={errors.phone_number} hint="Where their salary is paid.">
          <input className="input" type="tel" required placeholder="0712 345 678" value={values.phone_number} onChange={set('phone_number')} />
        </Field>
        <Field label="Monthly salary (KES) *" error={errors.salary}>
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" required value={values.salary} onChange={set('salary')} />
        </Field>
        <Field label="Notes" error={errors.notes} className="sm:col-span-2"><textarea className="input min-h-16" value={values.notes} onChange={set('notes')} /></Field>
        {person && (
          <label className="flex items-center gap-2 text-sm text-mk-slate sm:col-span-2">
            <input type="checkbox" checked={values.is_active} onChange={set('is_active')} /> Still employed. Untick when they leave; their pay history is kept.
          </label>
        )}
      </form>
    </Modal>
  )
}

/** Choose the month and amounts, then confirm with the SMS code. */
function PaySalaries({ staff, wallet, onClose, onDone }: { staff: StaffMember[]; wallet: WalletSummary; onClose: () => void; onDone: (run: PayRun) => void }) {
  const [period, setPeriod] = useState(thisMonth())
  const [amounts, setAmounts] = useState<Record<number, string>>(Object.fromEntries(staff.map((s) => [s.id, String(Number(s.salary))])))
  const [included, setIncluded] = useState(new Set(staff.filter((s) => Number(s.salary) > 0).map((s) => s.id)))
  const [started, setStarted] = useState<{ id: number; sent_to: string } | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lines = staff.filter((s) => included.has(s.id))
  const total = lines.reduce((t, s) => t + (Number(amounts[s.id]) || 0), 0)
  const short = total > Number(wallet.balance)

  const run = async (e: FormEvent, step: () => Promise<void>) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { await step() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  const start = (e: FormEvent) => run(e, async () => {
    setStarted(await api.post<{ id: number; sent_to: string }>('/cms/payroll/runs/', {
      period, payslips: lines.map((s) => ({ staff: s.id, amount: amounts[s.id] })),
    }))
  })
  const confirm = (e: FormEvent) => run(e, async () => { onDone(await api.post<PayRun>(`/cms/payroll/runs/${started!.id}/confirm/`, { code })) })
  const toggle = (id: number) => setIncluded((s) => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next })

  return (
    <Modal open onClose={onClose} title="Pay salaries" wide
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" form="pay-form" disabled={busy || (!started && (!lines.length || short))}>
          {busy ? 'Please wait…' : started ? `Pay ${kes(total)}` : 'Send me a code'}
        </button></>}>
      <Alert>{error}</Alert>
      {started ? (
        <form id="pay-form" onSubmit={confirm} className="flex flex-col gap-4">
          <p className="text-[15px]">We sent a 6-digit code to {started.sent_to}. Enter it to pay <strong>{kes(total)}</strong> to {lines.length} {lines.length === 1 ? 'person' : 'people'} for {monthName(period)}.</p>
          <Field label="Code">
            <input className="input tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </form>
      ) : (
        <form id="pay-form" onSubmit={start} className="flex flex-col gap-4">
          <Field label="Month"><input className="input sm:w-56" type="month" required value={period} max={thisMonth()} onChange={(e) => setPeriod(e.target.value)} /></Field>
          <ul className="flex flex-col divide-y divide-mk-mist rounded-xl border border-mk-border">
            {staff.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <label className="flex min-w-0 flex-1 items-center gap-3">
                  <input type="checkbox" checked={included.has(s.id)} onChange={() => toggle(s.id)} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-mk-forest">{s.name}</span>
                    <span className="block text-xs text-mk-muted">{s.title && `${s.title} · `}{local(s.phone_number)}</span>
                  </span>
                </label>
                <input className="input w-36 text-right tabular-nums" type="number" min="10" step="0.01" aria-label={`Pay ${s.name}`}
                  disabled={!included.has(s.id)} value={amounts[s.id]} onChange={(e) => setAmounts({ ...amounts, [s.id]: e.target.value })} />
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap items-baseline justify-between gap-2 text-[15px]">
            <span>Wallet balance: <strong>{kes(wallet.balance)}</strong></span>
            <span>Total: <strong className={short ? 'text-danger' : 'text-mk-forest'}>{kes(total)}</strong></span>
          </p>
          {short && <Alert tone="amber">The wallet doesn’t hold enough for this pay run.</Alert>}
          <p className="text-[13px] text-mk-muted">Each salary is sent to the person’s M-PESA number. Next, we SMS you a code to confirm, and the church’s owners get an SMS about it.</p>
        </form>
      )}
    </Modal>
  )
}

function RunRow({ run }: { run: PayRun }) {
  const [open, setOpen] = useState(false)
  const failed = run.payslips.filter((p) => p.status === 'failed').length
  return (
    <li className="rounded-xl border border-mk-border bg-white">
      <button className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="font-semibold text-mk-forest">{monthName(run.period)}</span>
        <span className="text-sm text-mk-muted">{run.payslips.length} {run.payslips.length === 1 ? 'person' : 'people'} · paid {run.paid_at && dateTime(run.paid_at)}{run.created_by_name && ` by ${run.created_by_name}`}</span>
        {failed > 0 && <Badge tone="red">{failed} failed</Badge>}
        <span className="ml-auto font-semibold tabular-nums text-mk-forest">{kes(run.total)}</span>
        {open ? <ChevronUp className="h-4 w-4 text-mk-muted" /> : <ChevronDown className="h-4 w-4 text-mk-muted" />}
      </button>
      {open && (
        <ul className="divide-y divide-mk-mist border-t border-mk-mist">
          {run.payslips.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
              <span className="min-w-0 flex-1"><span className="font-medium text-mk-forest">{p.name}</span><span className="text-mk-muted"> · {local(p.phone_number)}{p.provider_code && ` · ${p.provider_code}`}</span></span>
              <span title={p.problem}><Badge tone={SLIP[p.status][1]}>{SLIP[p.status][0]}</Badge></span>
              <span className="w-28 text-right tabular-nums">{kes(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export default function Payroll({ wallet, onPaid }: { wallet: WalletSummary | null; onPaid: () => void }) {
  const can = useCan()
  const canPay = can('payroll', true)
  const staff = useApi<Page<StaffMember>>('/cms/payroll/staff/', { page_size: 200 })
  const runs = useApi<Page<PayRun>>('/cms/payroll/runs/')
  const summary = useApi<PayrollSummary>('/cms/payroll/runs/summary/')
  const [editing, setEditing] = useState<StaffMember | 'new' | null>(null)
  const [paying, setPaying] = useState(false)
  const [notice, setNotice] = useState('')
  const people = staff.data?.results || []
  const s = summary.data
  const reload = () => { staff.reload(); runs.reload(); summary.reload() }

  const columns: Column<StaffMember>[] = [
    { key: 'name', label: 'Name', render: (p) => <span className="flex flex-col"><span className="font-semibold text-mk-forest">{p.name}</span><span className="text-[13px] text-mk-muted">{p.title || '—'}</span></span> },
    { key: 'phone_number', label: 'M-PESA', render: (p) => local(p.phone_number) },
    { key: 'salary', label: 'Monthly salary', className: 'text-right', render: (p) => <span className="font-semibold tabular-nums">{kes(p.salary)}</span> },
    { key: 'last_paid', label: 'Last paid', render: (p) => (p.last_paid ? monthName(p.last_paid) : 'Not yet') },
    ...(canPay ? [{ key: 'edit', label: '', className: 'text-right', render: (p: StaffMember) => (
      <button className="btn-secondary min-h-8! px-3! text-sm!" onClick={(e) => { e.stopPropagation(); setEditing(p) }} aria-label={`Edit ${p.name}`}><Pencil className="h-4 w-4" /></button>
    ) }] : []),
  ]

  return (
    <section aria-label="Payroll">
      <Alert tone="green">{notice}</Alert>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Staff" value={s ? s.staff : '—'} hint="on the payroll" />
        <StatCard icon={Banknote} label="Salaries a month" value={s ? kes(s.monthly_salaries) : '—'} />
        <StatCard icon={CalendarClock} label="Paid this year" value={s ? kes(s.paid_this_year) : '—'} hint={s?.last_run ? `Last: ${monthName(s.last_run.period)}` : 'No pay runs yet'} />
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-mk-forest">Staff</h2>
        {canPay && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add staff</button>
            <button className="btn-primary" disabled={!people.length || !wallet?.enabled} onClick={() => setPaying(true)}><Send className="h-4 w-4" /> Pay salaries</button>
          </div>
        )}
      </div>
      <Table columns={columns} rows={people} loading={staff.loading} empty="No staff yet. Add the people the church pays, with their monthly salary." />

      <h2 className="mb-3 mt-8 text-lg font-semibold text-mk-forest">Payroll history</h2>
      {runs.data?.results.length
        ? <ul className="flex flex-col gap-2">{runs.data.results.map((r) => <RunRow key={r.id} run={r} />)}</ul>
        : <p className="rounded-xl border border-dashed border-mk-border bg-white p-6 text-center text-sm text-mk-muted">No salaries paid yet.</p>}

      {editing && <StaffForm person={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      {paying && wallet && <PaySalaries staff={people} wallet={wallet} onClose={() => setPaying(false)}
        onDone={(run) => {
          setPaying(false); reload(); onPaid()
          setNotice(`${kes(run.total)} in salaries for ${monthName(run.period)} is on its way.${run.failed ? ` ${run.failed} couldn’t be sent; that money is back in the wallet.` : ''}`)
        }} />}
    </section>
  )
}
