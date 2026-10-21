import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleX, Clock, Download, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Alert, Spinner } from '../../components/ui'
import { api, downloadCsv, errorMessage } from '../../lib/api'
import { useApi } from '../../lib/hooks'
import { compactMoney, currencyMoney } from '../../lib/format'
import type { PaymentsPage, PlatformChurch, PlatformPayment } from '../../types'
import { Card, Chip, Delta, Picker, PlatformHeader, SearchBox, ShareBars, TableSection, Tabs, Tile, number, pillButton, td, th, type Tone } from './shared'

type Tab = 'all' | 'failed' | 'unmatched' | 'waiting'
type Days = '1' | '7' | '30' | '90'
type Channel = '' | 'prompt' | 'paybill' | 'paypal' | 'recorded'
const STATUS: Record<PlatformPayment['status'], [string, Tone]> = {
  confirmed: ['Confirmed', 'ok'], failed: ['Failed', 'bad'], waiting: ['Waiting for PIN', 'warn'], unmatched: ['Unmatched', 'warn'],
}
const TROUBLE: Record<PaymentsPage['trouble'][number]['kind'], { icon: LucideIcon; tone: string }> = {
  failing: { icon: CircleX, tone: 'bg-[#FBEDEA] text-[#B42318]' },
  unmatched: { icon: TriangleAlert, tone: 'bg-[#FBF4E4] text-[#8A5A00]' },
  stale: { icon: Clock, tone: 'bg-[#FBF4E4] text-[#8A5A00]' },
}
const time = (iso: string, days: number) => {
  const d = new Date(iso)
  const clock = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false })
  return days === 1 ? clock : `${d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}, ${clock}`
}

/** Platform admins: every payment across churches, why prompts fail, and the churches with trouble. */
export default function PlatformPayments() {
  const [days, setDays] = useState<Days>('30')
  const [tab, setTab] = useState<Tab>('all')
  const [church, setChurch] = useState('')
  const [channel, setChannel] = useState<Channel>('')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => { const t = setTimeout(() => setQuery(q), 300); return () => clearTimeout(t) }, [q])
  useEffect(() => setPage(1), [days, tab, church, channel, query])
  const filters = { days, tab, church, channel, q: query }
  const { data, error, reload } = useApi<PaymentsPage>('/platform/payments/', { ...filters, page })
  const { data: churches } = useApi<PlatformChurch[] | { results: PlatformChurch[] }>('/platform/churches/', { page_size: 500 })
  const churchList = Array.isArray(churches) ? churches : churches?.results || []
  const [notice, setNotice] = useState('')

  const check = async (id: number) => {
    setNotice('')
    try { setNotice((await api.post<{ detail: string }>(`/platform/payments/check/${id}/`)).detail); reload() } catch (e) { setNotice(errorMessage(e)) }
  }

  return (
    <div className="flex flex-col gap-6 font-body text-mk-slate">
      <PlatformHeader title="Payments">
        <Picker label="Period" value={days} onChange={setDays} options={[['1', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']]} />
      </PlatformHeader>
      <Alert>{error && errorMessage(error)}</Alert>
      {notice && <p role="status" className="rounded-xl border border-mk-border bg-white px-4 py-3 text-[15px] text-mk-forest">{notice}</p>}
      {!data ? (!error && <Spinner className="mx-auto mt-16 h-8 w-8" />) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
            <Tile label="Received today" value={compactMoney(data.stats.received_today)}>
              <Delta value={data.stats.received_change} />{number(data.stats.received_today_count)} payments
            </Tile>
            <Tile label="Prompts confirmed" value={data.stats.prompts_confirmed_rate === null ? '—' : `${data.stats.prompts_confirmed_rate}%`}>
              {number(data.stats.prompts_sent)} sent in the period
            </Tile>
            <Tile label="Paybill unmatched" value={number(data.stats.unmatched)}>{compactMoney(data.stats.unmatched_amount)} to allocate</Tile>
            <Tile label="Waiting for M-PESA" value={number(data.stats.waiting_over_an_hour)}>over an hour old</Tile>
            <Tile label="PayPal this month" value={currencyMoney(data.stats.paypal_month, 'USD')}>≈ {compactMoney(data.stats.paypal_month_kes)}</Tile>
          </div>

          <div className="flex flex-wrap gap-4">
            <Card id="trouble-title" title="Churches with payment trouble" subtitle="Now, and the last day" flex="1 1 420px">
              {data.trouble.length ? (
                <ul className="-mt-3 flex flex-col">
                  {data.trouble.map((t) => {
                    const { icon: Icon, tone } = TROUBLE[t.kind]
                    return (
                      <li key={`${t.kind}-${t.church.id}`} className="flex items-center gap-3 border-t border-mk-mist py-3">
                        <span className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] ${tone}`}><Icon className="h-[17px] w-[17px]" aria-hidden="true" /></span>
                        <span className="flex min-w-0 flex-1 flex-col"><span className="font-semibold text-mk-forest">{t.church.name}</span><span className="text-[13px] text-mk-muted">{t.text}</span></span>
                        {t.kind === 'failing' && <Link to={`/platform/churches?edit=${t.church.id}`} className={pillButton}>Check keys</Link>}
                        {t.kind === 'unmatched' && <a href={`${t.church.url}/paybill`} target="_blank" rel="noreferrer" className={pillButton}>Open Paybill</a>}
                        {t.kind === 'stale' && <button type="button" onClick={() => check(t.church.id)} className={pillButton}>Check status</button>}
                      </li>
                    )
                  })}
                </ul>
              ) : <p className="text-sm text-mk-muted">No church has payment trouble right now.</p>}
            </Card>
            <Card id="why-title" title="Why prompts fail" flex="1 1 340px"
              subtitle={data.reasons.sent ? `${number(data.reasons.failed)} failed of ${number(data.reasons.sent)} in the period` : 'No prompts in the period'}>
              {data.reasons.failed > 0
                ? <ShareBars items={data.reasons.items.map((r) => ({ key: r.key, label: r.label, value: `${r.share}%`, share: r.share }))} />
                : <p className="text-sm text-mk-muted">No prompt failed.</p>}
              <p className="mt-auto border-t border-mk-mist pt-3.5 text-sm text-mk-muted">Only a church's M-PESA keys are ours to fix; the rest are givers changing their minds or their phones.</p>
            </Card>
          </div>

          <TableSection id="pay-title" title="Every payment" subtitle="Newest first, across all churches"
            controls={<>
              <SearchBox label="Search receipt, phone or church" value={q} onChange={setQ} className="min-w-[260px]" />
              <Picker label="Church" value={church} onChange={setChurch} options={[['', 'All churches'], ...churchList.map((c): [string, string] => [String(c.id), c.name])]} />
              <Picker label="Channel" value={channel} onChange={setChannel} options={[['', 'All channels'], ['prompt', 'Prompts'], ['paybill', 'Paybill'], ['paypal', 'PayPal'], ['recorded', 'Recorded by staff']]} />
              <button type="button" className={`${pillButton} h-[42px]`} onClick={() => downloadCsv('/platform/payments/', { ...filters, export: 'csv' }, 'mkanisa-payments.csv')}>
                <Download className="h-4 w-4" aria-hidden="true" />Export CSV
              </button>
            </>}
            footer={<>
              <span>{data.total ? `${number((page - 1) * 50 + 1)}–${number((page - 1) * 50 + data.results.length)} of ${number(data.total)}` : 'None'}</span>
              <span className="flex gap-4">
                {page > 1 && <button type="button" onClick={() => setPage(page - 1)} className="font-semibold text-mk-green hover:underline">← Newer</button>}
                {data.has_more && <button type="button" onClick={() => setPage(page + 1)} className="font-semibold text-mk-green hover:underline">Older →</button>}
              </span>
            </>}>
            <Tabs label="Payments" value={tab} onChange={setTab} tabs={[['all', 'All', null], ['failed', 'Failed', null], ['unmatched', 'Unmatched Paybill', data.stats.unmatched], ['waiting', 'Waiting', null]]} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-[15px]">
                <thead className="bg-mk-ivory"><tr>
                  <th className={`${th} pl-6`}>Time</th><th className={th}>Church</th><th className={th}>Channel</th><th className={th}>From</th>
                  <th className={`${th} text-right`}>Amount</th><th className={th}>Receipt</th><th className={`${th} pr-6`}>Status</th>
                </tr></thead>
                <tbody>
                  {data.results.map((r) => (
                    <tr key={r.key} className="border-t border-mk-mist">
                      <td className={`${td} whitespace-nowrap pl-6`}>{time(r.at, data.days)}</td>
                      <td className={td}><span className="flex flex-col"><span className="font-semibold text-mk-forest">{r.church.name}</span><span className="text-[13px] text-mk-muted">{r.for || r.church.slug}</span></span></td>
                      <td className={td}>{r.channel}</td>
                      <td className={`${td} whitespace-nowrap`}>{r.from || '—'}</td>
                      <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums text-mk-forest`}>{currencyMoney(r.amount, r.currency)}</td>
                      <td className={`${td} font-mono text-[13px]`}>{r.receipt || '—'}</td>
                      <td className={`${td} pr-6`}><span className="flex flex-col items-start gap-0.5"><Chip tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Chip>
                        {r.reason && <span className="text-xs text-mk-muted">{r.reason}</span>}</span></td>
                    </tr>
                  ))}
                  {!data.results.length && <tr><td colSpan={7} className="px-6 py-8 text-center text-mk-muted">No payments match.</td></tr>}
                </tbody>
              </table>
            </div>
          </TableSection>
        </>
      )}
    </div>
  )
}
