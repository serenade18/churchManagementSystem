import { useMemo, useState } from 'react'
import { CircleX } from 'lucide-react'
import { Alert, Spinner } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import { useApi } from '../../lib/hooks'
import type { SmsPage } from '../../types'
import { Card, Chip, Delta, Picker, PlatformHeader, SearchBox, ShareBars, TableSection, Tile, bar, niceMax, number, td, th } from './shared'

type Days = '7' | '30' | '90'
const day = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Date(`${iso}T00:00`).toLocaleDateString('en-KE', opts)
const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

/** Platform admins: the SMS mKanisa sends, the Onfon balance, and which churches send what. */
export default function PlatformSms() {
  const [days, setDays] = useState<Days>('30')
  const { data, error } = useApi<SmsPage>('/platform/sms/', { days })
  const [q, setQ] = useState('')
  const churches = useMemo(() => (data?.churches || []).filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())), [data, q])

  return (
    <div className="flex flex-col gap-6 font-body text-mk-slate">
      <PlatformHeader title="SMS">
        <Picker label="Period" value={days} onChange={setDays} options={[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']]} />
      </PlatformHeader>
      <Alert>{error && errorMessage(error)}</Alert>
      {!data ? (!error && <Spinner className="mx-auto mt-16 h-8 w-8" />) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
            <Tile label="SMS sent" value={number(data.stats.sent)}><Delta value={data.stats.change} />in the period</Tile>
            <Tile label="Accepted" value={data.stats.accepted_rate === null ? '—' : `${data.stats.accepted_rate}%`}>{number(data.stats.refused)} refused by the provider</Tile>
            <Tile label="Receipts per gift" value={data.stats.receipts_per_gift === null ? '—' : String(data.stats.receipts_per_gift)}>confirmed gifts with a phone</Tile>
            <Tile label="Churches sending bulk" value={`${data.stats.churches_sending_bulk} of ${data.stats.churches_live}`}>in the period</Tile>
          </div>

          <div className="flex flex-wrap gap-4">
            <Card id="smsday-title" title="SMS sent per day" subtitle="All churches, every kind" flex="2 1 600px">
              <DailyChart series={data.series} />
            </Card>
            <Card id="kind-title" title="What they were" subtitle={`${number(data.stats.sent)} messages in the period`} flex="1 1 340px">
              {data.stats.sent
                ? <ShareBars items={data.kinds.map((k) => ({ key: k.key, label: k.label, value: number(k.count), share: k.share }))} />
                : <p className="text-sm text-mk-muted">No SMS sent in the period.</p>}
            </Card>
          </div>

          <div className="flex flex-wrap gap-4">
            <section aria-labelledby="bal-title" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-[22px] bg-mk-midnight p-6 text-mk-ivory">
              <h2 id="bal-title" className="text-sm font-normal text-mk-ivory/75">Onfon SMS balance</h2>
              {data.balance.credits === null ? (
                <p className="text-[15px] text-mk-ivory/85">The balance couldn't be read. Check the Onfon keys in the server's settings, or look on Onfon's site.</p>
              ) : (
                <>
                  <p className="font-display text-[40px] font-semibold tracking-[-0.02em]">{number(Math.round(data.balance.credits))} <span className="text-lg font-medium text-mk-ivory/75">credits</span></p>
                  <p className={`text-sm ${data.balance.low ? 'font-semibold text-mk-amber' : 'text-mk-ivory/80'}`}>
                    {data.balance.low ? 'Running low: top up soon. ' : ''}
                    {data.balance.days_left !== null ? `About ${number(data.balance.days_left)} days at this pace.` : ''}
                  </p>
                </>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-3">
                <a href="https://portal.onfonmedia.co.ke" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-mk-mint px-4 text-sm font-semibold text-mk-midnight">Top up on Onfon</a>
                <span className="text-[13px] text-mk-ivory/70">Sender ID: <span className="font-mono text-mk-ivory">{data.balance.sender_id}</span></span>
              </div>
            </section>
            <Card id="fail-title" title="Recent failures" subtitle="Messages the provider refused" flex="2 1 420px">
              {data.failures.length ? (
                <ul className="-mt-3 flex flex-col">
                  {data.failures.map((f, i) => (
                    <li key={i} className="flex gap-3 border-t border-mk-mist py-3">
                      <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[#FBEDEA] text-[#B42318]"><CircleX className="h-[17px] w-[17px]" aria-hidden="true" /></span>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-semibold text-mk-forest">{f.church} <span className="font-normal text-mk-muted">· {number(f.count)} {f.count === 1 ? 'number' : 'numbers'}</span></span>
                        <span className="text-sm text-mk-muted">{f.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-mk-muted">Every message was accepted.</p>}
            </Card>
          </div>

          <TableSection id="smsc-title" title="By church" subtitle="In the period, most messages first"
            controls={<SearchBox label="Search churches" value={q} onChange={setQ} />}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-[15px]">
                <thead className="bg-mk-ivory"><tr>
                  <th className={`${th} pl-6`}>Church</th><th className={`${th} text-right`}>Receipts</th><th className={`${th} text-right`}>Bulk</th>
                  <th className={`${th} text-right`}>Failed</th><th className={th}>Last bulk message</th><th className={`${th} pr-6`}>Accepted</th>
                </tr></thead>
                <tbody>
                  {churches.map((c) => (
                    <tr key={c.id} className="border-t border-mk-mist">
                      <td className={`${td} pl-6`}><span className="flex flex-col"><span className="font-semibold text-mk-forest">{c.name}</span><span className="text-[13px] text-mk-muted">{c.slug}</span></span></td>
                      <td className={`${td} text-right tabular-nums`}>{number(c.receipts)}</td>
                      <td className={`${td} text-right tabular-nums`}>{number(c.bulk)}</td>
                      <td className={`${td} text-right tabular-nums`}>{number(c.failed)}</td>
                      <td className={`${td} text-sm`}>{c.last_bulk ? <>“{c.last_bulk.text}” · {ago(c.last_bulk.at)}</> : <span className="text-mk-muted">No bulk messages</span>}</td>
                      <td className={`${td} pr-6`}>{c.accepted_rate === null ? <span className="text-mk-muted">—</span> : <Chip tone={c.accepted_rate >= 97 ? 'ok' : 'warn'}>{c.accepted_rate}%</Chip>}</td>
                    </tr>
                  ))}
                  {!churches.length && <tr><td colSpan={6} className="px-6 py-8 text-center text-mk-muted">No churches match.</td></tr>}
                </tbody>
              </table>
            </div>
          </TableSection>
        </>
      )}
    </div>
  )
}

function DailyChart({ series }: { series: SmsPage['series'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const W = 640, H = 220, L = 44, T = 12, B = 28
  const pw = W - L - 8, ph = H - T - B
  const max = niceMax(Math.max(...series.map((s) => s.count), 1))
  const step = pw / series.length
  const gap = Math.min(4, step * 0.3)
  const y = (v: number) => T + ph - (v / max) * ph
  const every = Math.ceil(series.length / 6)
  const tip = hover !== null ? series[hover] : null

  if (table) return (
    <>
      <div className="max-h-[260px] overflow-auto">
        <table className="w-full text-sm"><thead><tr className="text-left text-mk-muted"><th className="py-2 font-semibold">Day</th><th className="py-2 text-right font-semibold">SMS</th></tr></thead>
          <tbody>{series.map((s) => <tr key={s.day} className="border-t border-mk-mist"><td className="py-2">{day(s.day, { weekday: 'short', day: 'numeric', month: 'short' })}</td><td className="py-2 text-right tabular-nums">{number(s.count)}</td></tr>)}</tbody>
        </table>
      </div>
      <button type="button" onClick={() => setTable(false)} className="self-start text-sm font-semibold text-mk-green hover:underline">Show as a chart</button>
    </>
  )
  return (
    <>
      <figure className="relative m-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" role="img" aria-labelledby="smsday-title" onMouseLeave={() => setHover(null)}>
          {[0, 0.25, 0.5, 0.75, 1].filter((f) => Number.isInteger(max * f)).map((f) => (
            <g key={f}>
              <line x1={L} x2={W - 8} y1={y(max * f)} y2={y(max * f)} stroke="var(--color-mk-mist)" />
              <text x={L - 10} y={y(max * f) + 4} textAnchor="end" fontSize="12" fill="var(--color-mk-muted)">{max * f >= 1000 ? `${max * f / 1000}K` : max * f}</text>
            </g>
          ))}
          {series.map((s, i) => {
            const x = L + i * step + gap / 2
            return (
              <g key={s.day}>
                {s.count > 0 && <path d={bar(x, y(s.count), step - gap, T + ph, 3)} fill={hover === i ? 'var(--color-mk-forest)' : 'var(--color-mk-green)'} />}
                {(i % every === 0 || i === series.length - 1) && (
                  <text x={x + (step - gap) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--color-mk-muted)">{i === series.length - 1 ? 'Today' : day(s.day)}</text>
                )}
                <rect x={L + i * step} y={T} width={step} height={ph} fill="transparent" tabIndex={0} aria-label={`${day(s.day)}: ${s.count} SMS`}
                  onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
              </g>
            )
          })}
        </svg>
        {tip && hover !== null && (
          <div role="status" className="pointer-events-none absolute z-10 flex flex-col rounded-[10px] border border-mk-border bg-white px-3 py-2 shadow-sm"
            style={{ left: `${((L + hover * step + step / 2) / W) * 100}%`, top: `${(y(tip.count) / H) * 100}%`, transform: 'translate(-50%, calc(-100% - 10px))' }}>
            <span className="text-xs text-mk-muted">{day(tip.day, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span className="font-display text-lg font-semibold text-mk-forest">{number(tip.count)} SMS</span>
          </div>
        )}
      </figure>
      <button type="button" onClick={() => setTable(true)} className="self-start text-sm font-semibold text-mk-green hover:underline">Show as a table</button>
    </>
  )
}
