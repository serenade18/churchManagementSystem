import { useState } from 'react'
import { AlertTriangle, Search, Smartphone, Tags } from 'lucide-react'
import { Link } from 'react-router-dom'
import MemberPicker from '../../components/MemberPicker'
import Reconcile from '../../components/Reconcile'
import { Alert, Badge, Field, Modal, PageHeader, Pagination, Select, Table } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi, useDebounced, useOptions } from '../../lib/hooks'
import { PAYBILL_NUMBER, dateTime, money } from '../../lib/format'
import { useForm } from '../../lib/useForm'
import type { DonationType, MemberRef, Page, PaybillPayment, PaybillStatus, PhoneCheck, Project, Tone } from '../../types'

const STATUS: Record<PaybillStatus, [Tone, string]> = { unallocated: ['amber', 'Unallocated'], allocated: ['green', 'Allocated'], ignored: ['slate', 'Ignored'] }
const PHONE_CHECK: Partial<Record<PhoneCheck, [Tone, string]>> = { match: ['green', 'Phone verified'], mismatch: ['red', 'Phone mismatch'], unknown: ['slate', 'Phone not verified'] }

function HowToGive({ codes }: { codes: DonationType[] }) {
  // Prefer a code without O/I in the example so it can't be misread as 0/1.
  const active = codes.filter((c) => c.is_active)
  const example = (active.find((c) => !/[OI01]/.test(c.code)) || active[0])?.code || 'TTH'
  return (
    <div className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Smartphone /></span>
      <div className="text-sm">
        <p className="font-semibold text-slate-900">How members give by M-PESA</p>
        <p className="text-slate-600">
          Lipa na M-PESA → Paybill <strong className="font-mono">{PAYBILL_NUMBER}</strong> → Account: <strong>phone number + code</strong>, e.g.{' '}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">0712345678{example}</span>
          {' '}(a membership number also works, e.g. <span className="font-mono">M0001{example}</span>). Givers get an SMS receipt automatically.
        </p>
      </div>
    </div>
  )
}

interface AllocateModalProps {
  payment: PaybillPayment
  codes: DonationType[]
  onClose: () => void
  onDone: () => void
}

type Giver = 'member' | 'phone'

function AllocateModal({ payment, codes, onClose, onDone }: AllocateModalProps) {
  const projects = useOptions<Project>('/cms/projects/')
  const [mode, setMode] = useState<Giver>(payment.parsed_member ? 'member' : payment.parsed_phone ? 'phone' : 'member')
  const [member, setMember] = useState<MemberRef | null>(payment.parsed_member ? { id: payment.parsed_member, full_name: payment.parsed_member_name, membership_number: '' } : null)
  const { values, set, error, busy, submit } = useForm({
    phone_number: payment.parsed_phone ? `0${payment.parsed_phone.slice(3)}` : '',
    code: payment.parsed_code || codes.find((c) => c.is_default)?.id || '' as number | string, project: '', send_receipt: true,
  })
  const save = async () => {
    const body: { send_receipt: boolean; member?: number; phone_number?: string; code?: number; project?: number } = { send_receipt: values.send_receipt }
    if (mode === 'member' && member) body.member = member.id
    if (mode === 'phone' && values.phone_number) body.phone_number = values.phone_number
    if (values.code) body.code = Number(values.code)
    if (values.project) body.project = Number(values.project)
    const done = await submit(() => api.post(`/cms/paybill-payments/${payment.id}/allocate/`, body)).catch(() => null)
    if (done) onDone()
  }
  const ignore = async () => {
    const done = await submit(() => api.post(`/cms/paybill-payments/${payment.id}/ignore/`, { reason: 'Not a donation (set aside by admin).' })).catch(() => null)
    if (done) onDone()
  }
  return (
    <Modal open onClose={onClose} title="Allocate payment" wide
      footer={<>
        <button className="btn-secondary mr-auto text-slate-500" onClick={ignore} disabled={busy}>Set aside (not a donation)</button>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={busy || !values.code || (mode === 'member' && !member) || (mode === 'phone' && !values.phone_number)}>{busy ? 'Saving…' : 'Allocate'}</button>
      </>}>
      <Alert>{error}</Alert>
      <div className="mb-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-4">
        <div><p className="text-xs text-slate-500">Amount</p><p className="font-semibold">{money(payment.amount)}</p></div>
        <div><p className="text-xs text-slate-500">Paid by</p><p className="font-medium">{payment.payer_name || '—'}</p></div>
        <div><p className="text-xs text-slate-500">Account typed</p><p className="font-mono">{payment.account || '(blank)'}</p></div>
        <div><p className="text-xs text-slate-500">M-PESA ref</p><p className="font-mono">{payment.trans_id}</p></div>
        {payment.reason && <p className="flex items-center gap-2 text-amber-700 sm:col-span-4"><AlertTriangle className="h-4 w-4" />{payment.reason}</p>}
      </div>

      <span className="label">Who gave?</span>
      <div className="mb-3 flex gap-2">
        {([['member', 'A member'], ['phone', 'A visitor (phone number)']] as [Giver, string][]).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            className={`rounded-full border px-3 py-1 text-sm ${mode === k ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
        ))}
      </div>
      <div className="mb-5">
        {mode === 'member'
          ? <MemberPicker value={member} onChange={setMember} />
          : <input className="input" placeholder="0712 345 678" value={values.phone_number} onChange={set('phone_number')} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Donation type"><Select value={values.code} onChange={set('code')} options={codes.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))} placeholder="— Choose —" /></Field>
        <Field label="Project" hint="Only if different from the type's own project.">
          <Select value={values.project} onChange={set('project')} options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="— None —" />
        </Field>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={values.send_receipt} onChange={set('send_receipt')} /> Send SMS receipt to the giver</label>
    </Modal>
  )
}

export default function Paybill() {
  const [tab, setTab] = useState<'payments' | 'reconcile'>('payments')
  const [status, setStatus] = useState('unallocated')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [allocating, setAllocating] = useState<PaybillPayment | null>(null)
  const [notice, setNotice] = useState('')
  const payments = useApi<Page<PaybillPayment>>('/cms/paybill-payments/', { status, search: useDebounced(search), page })
  const codes = useApi<Page<DonationType>>('/cms/donation-codes/', { page_size: 500 })
  const codeList = codes.data?.results || []

  return (
    <>
      <PageHeader title="Paybill" subtitle="Payments made straight to the Paybill."
        actions={<Link to="/donation-types" className="btn-secondary"><Tags className="h-4 w-4" /> Donation types &amp; codes</Link>} />
      <HowToGive codes={codeList} />

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {([['payments', 'Payments'], ['reconcile', 'Sync with M-PESA']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {notice && <Alert tone="green">{notice}</Alert>}

      {tab === 'reconcile' ? (
        <Reconcile onImported={() => { payments.reload(); codes.reload(); window.dispatchEvent(new Event('cms:paybill-changed')) }} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="w-48"><Select value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={{ unallocated: 'Unallocated', allocated: 'Allocated', ignored: 'Set aside' }} placeholder="All payments" /></div>
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className="input pl-9" placeholder="Search ref, account, name…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
          <Alert>{payments.error?.message}</Alert>
          <Table loading={payments.loading} rows={payments.data?.results}
            empty={status === 'unallocated' ? 'All caught up: every Paybill payment has been allocated.' : 'No payments.'}
            onRowClick={(p) => p.status === 'unallocated' && setAllocating(p)}
            columns={[
              { key: 'trans_time', label: 'Date', render: (p) => dateTime(p.trans_time) },
              { key: 'payer_name', label: 'Paid by', render: (p) => <><p className="font-medium text-slate-900">{p.payer_name || '—'}</p><p className="font-mono text-xs text-slate-500">{p.trans_id}</p></> },
              { key: 'account', label: 'Account typed', render: (p) => <span className="font-mono">{p.account || '(blank)'}</span> },
              { key: 'allocation', label: 'Allocation', className: 'whitespace-normal', render: (p) => p.donation_summary ? (
                <span className="text-sm">{p.donation_summary.member_name || (p.parsed_phone ? `Visitor ${p.parsed_phone}` : 'Anonymous')}
                  <span className="text-slate-500"> · {p.donation_summary.donation_type_name}{p.donation_summary.project_name && ` · ${p.donation_summary.project_name}`}</span></span>
              ) : <span className="text-xs text-amber-700">{p.reason}</span> },
              { key: 'checks', label: 'Status', render: (p) => (
                <div className="flex flex-col items-start gap-1">
                  <Badge tone={STATUS[p.status][0]}>{STATUS[p.status][1]}</Badge>
                  {p.phone_check && PHONE_CHECK[p.phone_check] && <Badge tone={PHONE_CHECK[p.phone_check]![0]}>{PHONE_CHECK[p.phone_check]![1]}</Badge>}
                </div>
              ) },
              { key: 'amount', label: 'Amount', className: 'text-right font-semibold', render: (p) => money(p.amount) },
              { key: 'action', label: '', render: (p) => p.status === 'unallocated' && <button className="btn-primary px-3 py-1.5" onClick={(e) => { e.stopPropagation(); setAllocating(p) }}>Allocate</button> },
            ]} />
          <Pagination page={page} count={payments.data?.count} onChange={setPage} />
        </>
      )}

      {allocating && <AllocateModal payment={allocating} codes={codeList.filter((c) => c.is_active)} onClose={() => setAllocating(null)}
        onDone={() => { setAllocating(null); setNotice('Payment updated.'); payments.reload(); codes.reload(); window.dispatchEvent(new Event('cms:paybill-changed')) }} />}
    </>
  )
}
