import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Pencil, Plus, Search, Smartphone } from 'lucide-react'
import MemberPicker from '../components/MemberPicker'
import { Alert, Badge, Field, Modal, PageHeader, Pagination, Select, Table } from '../components/ui'
import { api } from '../lib/api'
import { useApi, useDebounced, useOptions } from '../lib/hooks'
import { DONATION_TYPES, PAYBILL_NUMBER, dateTime, money } from '../lib/format'
import { clean, useForm } from '../lib/useForm'

const STATUS = { unallocated: ['amber', 'Unallocated'], allocated: ['green', 'Allocated'], ignored: ['slate', 'Ignored'] }
const PHONE_CHECK = { match: ['green', 'Phone verified'], mismatch: ['red', 'Phone mismatch'], unknown: ['slate', 'Phone not verified'] }

function HowToGive({ codes }) {
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

function CodeForm({ code, onClose, onSaved }) {
  const projects = useOptions('/cms/projects/')
  const branches = useOptions('/cms/branches/')
  const { values, set, errors, error, busy, submit } = useForm({
    code: code?.code || '', name: code?.name || '', donation_type: code?.donation_type || 'general',
    project: code?.project || '', branch: code?.branch || '', is_active: code?.is_active ?? true,
  })
  const save = async (e) => {
    e.preventDefault()
    const payload = clean(values)
    const saved = await submit(() => (code ? api.patch(`/cms/donation-codes/${code.id}/`, payload) : api.post('/cms/donation-codes/', payload))).catch(() => null)
    if (saved) onSaved()
  }
  return (
    <Modal open onClose={onClose} title={code ? 'Edit donation code' : 'New donation code'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" form="code-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Alert>{error}</Alert>
      <form id="code-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Code *" error={errors.code} hint="2-6 letters/digits, ideally 3. Avoid O and I: they look like 0 and 1 (the system treats them as the same).">
          <input className="input font-mono uppercase" required maxLength={6} value={values.code} onChange={(e) => set('code')(e.target.value.toUpperCase())} placeholder="SCP" />
        </Field>
        <Field label="Name *" error={errors.name}><input className="input" required value={values.name} onChange={set('name')} placeholder="Sanctuary Construction Project" /></Field>
        <Field label="Donation type" error={errors.donation_type}><Select value={values.donation_type} onChange={set('donation_type')} options={DONATION_TYPES} /></Field>
        <Field label="Project" error={errors.project}><Select value={values.project} onChange={set('project')} options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="— None —" /></Field>
        <Field label="Branch" error={errors.branch} hint="Leave empty to credit the giver's own branch.">
          <Select value={values.branch} onChange={set('branch')} options={branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Giver's branch" />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={values.is_active} onChange={set('is_active')} /> Active</label>
      </form>
    </Modal>
  )
}

function AllocateModal({ payment, codes, onClose, onDone }) {
  const projects = useOptions('/cms/projects/')
  const [mode, setMode] = useState(payment.parsed_member ? 'member' : payment.parsed_phone ? 'phone' : 'member')
  const [member, setMember] = useState(payment.parsed_member ? { id: payment.parsed_member, full_name: payment.parsed_member_name, membership_number: '' } : null)
  const { values, set, error, busy, submit } = useForm({
    phone_number: payment.parsed_phone ? `0${payment.parsed_phone.slice(3)}` : '',
    code: payment.parsed_code || '', donation_type: 'general', project: '', send_receipt: true,
  })
  const save = async () => {
    const body = { send_receipt: values.send_receipt }
    if (mode === 'member' && member) body.member = member.id
    if (mode === 'phone' && values.phone_number) body.phone_number = values.phone_number
    if (values.code) body.code = Number(values.code)
    else { body.donation_type = values.donation_type; if (values.project) body.project = Number(values.project) }
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
        <button className="btn-primary" onClick={save} disabled={busy || (mode === 'member' && !member) || (mode === 'phone' && !values.phone_number)}>{busy ? 'Saving…' : 'Allocate'}</button>
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
        {[['member', 'A member'], ['phone', 'A visitor (phone number)']].map(([k, label]) => (
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
        <Field label="Donation code"><Select value={values.code} onChange={set('code')} options={codes.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))} placeholder="— Choose type instead —" /></Field>
        {!values.code && <>
          <Field label="Type"><Select value={values.donation_type} onChange={set('donation_type')} options={DONATION_TYPES} /></Field>
          <Field label="Project"><Select value={values.project} onChange={set('project')} options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="— None —" /></Field>
        </>}
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={values.send_receipt} onChange={set('send_receipt')} /> Send SMS receipt to the giver</label>
    </Modal>
  )
}

export default function Paybill() {
  const [tab, setTab] = useState('payments')
  const [status, setStatus] = useState('unallocated')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [allocating, setAllocating] = useState(null)
  const [editingCode, setEditingCode] = useState(null)
  const [notice, setNotice] = useState('')
  const payments = useApi('/cms/paybill-payments/', { status, search: useDebounced(search), page })
  const codes = useApi('/cms/donation-codes/', { page_size: 500 })
  const codeList = codes.data?.results || []

  return (
    <>
      <PageHeader title="Paybill" subtitle="Payments made straight to the Paybill, and the donation codes givers use."
        actions={tab === 'codes' && <button className="btn-primary" onClick={() => setEditingCode('new')}><Plus className="h-4 w-4" /> New code</button>} />
      <HowToGive codes={codeList} />

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {[['payments', 'Payments'], ['codes', 'Donation codes']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {notice && <Alert tone="green">{notice}</Alert>}

      {tab === 'payments' ? (
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
                  <span className="text-slate-500"> · {p.donation_summary.project_name || DONATION_TYPES[p.donation_summary.donation_type]}</span></span>
              ) : <span className="text-xs text-amber-700">{p.reason}</span> },
              { key: 'checks', label: 'Status', render: (p) => (
                <div className="flex flex-col items-start gap-1">
                  <Badge tone={STATUS[p.status][0]}>{STATUS[p.status][1]}</Badge>
                  {p.phone_check && <Badge tone={PHONE_CHECK[p.phone_check][0]}>{PHONE_CHECK[p.phone_check][1]}</Badge>}
                </div>
              ) },
              { key: 'amount', label: 'Amount', className: 'text-right font-semibold', render: (p) => money(p.amount) },
              { key: 'action', label: '', render: (p) => p.status === 'unallocated' && <button className="btn-primary px-3 py-1.5" onClick={(e) => { e.stopPropagation(); setAllocating(p) }}>Allocate</button> },
            ]} />
          <Pagination page={page} count={payments.data?.count} onChange={setPage} />
        </>
      ) : (
        <Table loading={codes.loading} rows={codeList} onRowClick={setEditingCode} empty="No donation codes yet. Create one for each purpose, e.g. TTH for Tithe."
          columns={[
            { key: 'code', label: 'Code', render: (c) => <span className="rounded bg-slate-100 px-2 py-0.5 font-mono font-semibold">{c.code}</span> },
            { key: 'name', label: 'Name', render: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
            { key: 'donation_type', label: 'Allocates to', render: (c) => <>{DONATION_TYPES[c.donation_type]}{c.project_name && <span className="text-slate-500"> · {c.project_name}</span>}{c.branch_name && <span className="text-slate-500"> · {c.branch_name}</span>}</> },
            { key: 'example', label: 'Account example', render: (c) => <span className="font-mono text-xs text-slate-500">0712345678{c.code}</span> },
            { key: 'total_received', label: 'Received via Paybill', className: 'text-right', render: (c) => <>{money(c.total_received)} <span className="text-xs text-slate-400">({c.payment_count})</span></> },
            { key: 'is_active', label: '', render: (c) => c.is_active ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Badge>Inactive</Badge> },
            { key: 'edit', label: '', render: () => <Pencil className="h-4 w-4 text-slate-400" /> },
          ]} />
      )}

      {allocating && <AllocateModal payment={allocating} codes={codeList.filter((c) => c.is_active)} onClose={() => setAllocating(null)}
        onDone={() => { setAllocating(null); setNotice('Payment updated.'); payments.reload(); codes.reload(); window.dispatchEvent(new Event('cms:paybill-changed')) }} />}
      {editingCode && <CodeForm code={editingCode === 'new' ? null : editingCode} onClose={() => setEditingCode(null)} onSaved={() => { setEditingCode(null); codes.reload() }} />}
    </>
  )
}
