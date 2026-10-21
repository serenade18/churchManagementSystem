import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, CircleX, Clock, Moon, Plus, Search, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Alert, Spinner } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useApi } from '../../lib/hooks'
import { compactMoney, money } from '../../lib/format'
import type { OverviewPeriod, PlatformOverview } from '../../types'

type Overview = PlatformOverview
type Row = Overview['church_rows'][number]
type Attention = Overview['attention'][number]

const PERIODS: [OverviewPeriod, string, string][] = [
  ['30d', '30 days', 'by day'], ['quarter', 'Quarter', 'by week'], ['12m', '12 months', 'by month']]
const number = (n: number) => n.toLocaleString('en-KE')

/** Platform admins' home: how every church on mKanisa is doing. */
export default function PlatformOverviewPage() {
  const [period, setPeriod] = useState<OverviewPeriod>('12m')
  const { data, error } = useApi<Overview>('/platform/overview/', { period })

  return (
    <div className="flex flex-col gap-6 font-body text-mk-slate">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-mk-muted">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h1 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.015em] text-mk-forest">Platform overview</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Period" className="flex gap-1 rounded-full bg-mk-mist p-1">
            {PERIODS.map(([key, label]) => (
              <button key={key} type="button" role="radio" aria-checked={period === key} onClick={() => setPeriod(key)}
                className={`min-h-9 rounded-full px-3.5 text-sm ${period === key ? 'bg-white font-semibold text-mk-forest shadow-[0_1px_3px_rgba(16,43,39,0.12)]' : 'font-medium text-mk-muted hover:text-mk-forest'}`}>
                {label}
              </button>
            ))}
          </div>
          <Link to="/platform/churches?new=1" className="inline-flex h-11 items-center gap-2 rounded-full bg-mk-green px-5 text-[15px] font-semibold text-white hover:bg-mk-forest">
            <Plus className="h-[18px] w-[18px]" aria-hidden="true" />Add a church
          </Link>
        </div>
      </header>

      <Alert>{error && errorMessage(error)}</Alert>
      {!data ? (!error && <Spinner className="mx-auto mt-16 h-8 w-8" />) : (
        <>
          <Headlines data={data} />
          <div className="flex flex-wrap gap-4">
            <Card id="giving-title" title="Giving across all churches" flex="2 1 600px"
              subtitle={`KES, ${PERIODS.find(([k]) => k === data.period)?.[2]} · the last one so far (dashed)`}>
              <GivingChart series={data.giving.series} />
            </Card>
            <Card id="channels-title" title="How people give" subtitle="Share of this month's giving so far" flex="1 1 320px">
              <Channels data={data} />
            </Card>
          </div>
          <div className="flex flex-wrap gap-4">
            <Card id="growth-title" title="Churches on mKanisa" subtitle="Churches at the end of each month" flex="1 1 420px">
              <GrowthChart growth={data.growth} />
              <dl className="grid grid-cols-3 gap-3 border-t border-mk-mist pt-3.5">
                <Stat label="Joined this year" value={data.churches.joined_this_year} />
                <Stat label="Waiting on owner" value={data.churches.pending} />
                <Stat label="Closed" value={data.churches.closed} />
              </dl>
            </Card>
            <Card id="attention-title" title="Needs attention" flex="1 1 420px"
              subtitle={data.attention.length ? `${data.attention.length} ${data.attention.length === 1 ? 'church' : 'churches'} · most urgent first` : 'Nothing right now'}>
              <AttentionList items={data.attention} />
            </Card>
          </div>
          <Churches rows={data.church_rows} />
        </>
      )}
    </div>
  )
}

function Card({ id, title, subtitle, flex, children }: { id: string; title: string; subtitle: string; flex: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} style={{ flex }} className="flex min-w-0 flex-col gap-[18px] rounded-[22px] border border-mk-border bg-white p-6">
      <header className="flex flex-col gap-0.5">
        <h2 id={id} className="font-display text-xl font-semibold text-mk-forest">{title}</h2>
        <p className="text-sm text-mk-muted">{subtitle}</p>
      </header>
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><dt className="text-[13px] text-mk-muted">{label}</dt><dd className="font-display text-[22px] font-semibold text-mk-forest">{number(value)}</dd></div>
}

/** Up or down, in green or red, with an arrow so it isn't colour alone. */
function Delta({ value, suffix = '%', invert = false }: { value: number | null; suffix?: string; invert?: boolean }) {
  if (value === null || value === 0) return null
  const up = value > 0
  const good = invert ? !up : up
  const Icon = up ? ChevronUp : ChevronDown
  return (
    <span className={`inline-flex items-center gap-0.5 text-[13px] font-semibold ${good ? 'text-mk-green' : 'text-[#B42318]'}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />{up ? '+' : '−'}{Math.abs(value)}{suffix}
    </span>
  )
}

function Tile({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[20px] border border-mk-border bg-white px-[22px] py-5">
      <span className="text-sm text-mk-muted">{label}</span>
      <span className="whitespace-nowrap font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-mk-forest">{value}</span>
      <span className="flex flex-wrap items-center gap-2 text-[13px] text-mk-muted">{children}</span>
    </div>
  )
}

function Headlines({ data }: { data: Overview }) {
  const { churches, members, giving, prompts, sms } = data
  const month = new Date().toLocaleDateString('en-KE', { month: 'long' })
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
      <Tile label="Churches live" value={number(churches.live)}>
        {churches.new_this_month > 0 ? <><Delta value={churches.new_this_month} suffix="" /> new this month</> : 'None new this month'}
      </Tile>
      <Tile label="Members" value={number(members.total)}>
        {members.new_30_days > 0 ? <><Delta value={members.new_30_days} suffix="" /> in 30 days</> : 'across every church'}
      </Tile>
      <Tile label={`Given in ${month}`} value={compactMoney(giving.this_month)}>
        so far · last month: {compactMoney(giving.last_month)}
      </Tile>
      <Tile label="M-PESA prompts confirmed" value={prompts.confirmed_rate === null ? '—' : `${prompts.confirmed_rate}%`}>
        <Delta value={prompts.change_points} suffix=" pts" />
        {prompts.sent_30_days ? `of ${number(prompts.sent_30_days)} sent in 30 days` : 'none sent in 30 days'}
      </Tile>
      <Tile label="SMS sent" value={sms.ok_rate === null ? '—' : `${sms.ok_rate}%`}>
        {sms.sent_30_days ? `accepted, of ${number(sms.sent_30_days)} in 30 days` : 'none in 30 days'}
      </Tile>
    </div>
  )
}

/** A rounded-top bar from the baseline. */
const bar = (x: number, y: number, w: number, base: number, r = 4) => {
  const rr = Math.min(r, w / 2, Math.max(0, base - y))
  return `M${x},${base} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${base}Z`
}

/** A tidy top for the axis: 1, 2, 2.5 or 5 times a power of ten. */
function niceMax(value: number) {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  return ([1, 2, 2.5, 5, 10].find((m) => m * power >= value) || 10) * power
}

function GivingChart({ series }: { series: Overview['giving']['series'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const W = 640, H = 260, L = 52, T = 14, B = 28
  const pw = W - L - 8, ph = H - T - B
  const max = niceMax(Math.max(...series.map((s) => Number(s.amount))))
  const step = pw / series.length
  const gap = Math.min(10, step * 0.25)
  const labelEvery = Math.ceil(series.length / 12)
  const y = (v: number) => T + ph - (v / max) * ph
  const shown = hover ?? null
  const tip = shown !== null ? series[shown] : null
  const prev = shown ? Number(series[shown - 1].amount) : 0
  const tipChange = tip && prev ? Math.round(((Number(tip.amount) - prev) / prev) * 100) : null

  if (table) return (
    <>
      <div className="max-h-[300px] overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-mk-muted"><th className="py-2 font-semibold">Period starting</th><th className="py-2 text-right font-semibold">Given</th></tr></thead>
          <tbody>{series.map((s) => (
            <tr key={s.start} className="border-t border-mk-mist"><td className="py-2">{new Date(s.start).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}{s.partial && ' (so far)'}</td>
              <td className="py-2 text-right font-semibold tabular-nums text-mk-forest">{money(s.amount)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <button type="button" onClick={() => setTable(false)} className="self-start text-sm font-semibold text-mk-green hover:underline">Show as a chart</button>
    </>
  )

  return (
    <>
      <figure className="relative m-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" role="img" aria-labelledby="giving-title"
          onMouseLeave={() => setHover(null)}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={L} x2={W - 8} y1={y(max * f)} y2={y(max * f)} stroke="var(--color-mk-mist)" />
              <text x={L - 10} y={y(max * f) + 4} textAnchor="end" fontSize="12" fill="var(--color-mk-muted)">{compactMoney(max * f).replace('KES ', '')}</text>
            </g>
          ))}
          {series.map((s, i) => {
            const x = L + i * step + gap / 2
            const w = step - gap
            const v = Number(s.amount)
            return (
              <g key={s.start}>
                {v > 0 && (
                  <path d={bar(x, y(v), w, T + ph)} fill={s.partial ? 'var(--color-mk-mint)' : hover === i ? 'var(--color-mk-forest)' : 'var(--color-mk-green)'}
                    stroke={s.partial ? 'var(--color-mk-green)' : undefined} strokeWidth={s.partial ? 1.5 : undefined} strokeDasharray={s.partial ? '4 3' : undefined} />
                )}
                {(i % labelEvery === 0 || i === series.length - 1) && (
                  <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--color-mk-muted)" fontWeight={hover === i ? 600 : 400}>{s.label}</text>
                )}
                {/* The hit target: the whole column, bigger than the bar */}
                <rect x={L + i * step} y={T} width={step} height={ph} fill="transparent" tabIndex={0}
                  aria-label={`${s.label}: ${money(s.amount)}${s.partial ? ' so far' : ''}`}
                  onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
              </g>
            )
          })}
        </svg>
        {tip && shown !== null && (
          <div role="status" className="pointer-events-none absolute z-10 flex min-w-[150px] flex-col rounded-[10px] border border-mk-border bg-white px-3 py-2 shadow-sm"
            style={{ left: `${((L + shown * step + step / 2) / W) * 100}%`, top: `${(y(Number(tip.amount)) / H) * 100}%`, transform: 'translate(-50%, calc(-100% - 10px))' }}>
            <span className="text-xs text-mk-muted">{new Date(tip.start).toLocaleDateString('en-KE', { day: tip.label.length > 3 ? 'numeric' : undefined, month: 'long', year: 'numeric' })}{tip.partial && ' (so far)'}</span>
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-display text-lg font-semibold text-mk-forest">{compactMoney(tip.amount)}</span>
              {!tip.partial && <Delta value={tipChange} />}
            </span>
          </div>
        )}
      </figure>
      <button type="button" onClick={() => setTable(true)} className="self-start text-sm font-semibold text-mk-green hover:underline">Show as a table</button>
    </>
  )
}

function Channels({ data }: { data: Overview }) {
  const { channels } = data.giving
  return (
    <>
      <div className="flex flex-col gap-[18px]">
        {channels.map((c) => (
          <div key={c.key} className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-mk-forest">{c.label}</span>
              <span className="text-mk-muted"><span className="font-semibold text-mk-forest">{c.share}%</span> · {compactMoney(c.amount)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-mk-mist" role="presentation">
              {c.share > 0 && <div className="h-full min-w-1.5 rounded-full bg-mk-green" style={{ width: `${c.share}%` }} />}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-auto border-t border-mk-mist pt-3.5 text-sm text-mk-muted">
        <span className="font-semibold text-mk-forest">{data.churches.own_paybill} of {data.churches.live}</span> churches use their own Paybill;{' '}
        {data.churches.live - data.churches.own_paybill} receive through the platform's.
      </p>
    </>
  )
}

function GrowthChart({ growth }: { growth: Overview['growth'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 420, H = 200, L = 34, T = 14, B = 28
  const pw = W - L - 14, ph = H - T - B
  const max = niceMax(Math.max(...growth.map((g) => g.churches), 1))
  const pts = growth.map((g, i) => [L + (i * pw) / Math.max(growth.length - 1, 1), T + ph - (g.churches / max) * ph] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')
  const last = pts[pts.length - 1]
  const at = hover ?? growth.length - 1
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" role="img" aria-labelledby="growth-title" onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].filter((f) => Number.isInteger(max * f)).map((f) => ( /* whole churches only */
          <g key={f}>
            <line x1={L} x2={W - 14} y1={T + ph - f * ph} y2={T + ph - f * ph} stroke="var(--color-mk-mist)" />
            <text x={L - 10} y={T + ph - f * ph + 4} textAnchor="end" fontSize="12" fill="var(--color-mk-muted)">{max * f}</text>
          </g>
        ))}
        <path d={`M${pts[0][0]},${T + ph} L${line} L${last[0]},${T + ph}Z`} fill="var(--color-mk-green)" fillOpacity="0.08" />
        <path d={`M${line}`} fill="none" stroke="var(--color-mk-green)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={pts[at][0]} x2={pts[at][0]} y1={T} y2={T + ph} stroke="var(--color-mk-border)" />}
        <circle cx={pts[at][0]} cy={pts[at][1]} r="5" fill="var(--color-mk-green)" stroke="#fff" strokeWidth="2" />
        <text x={Math.max(pts[at][0], L + 90)} y={pts[at][1] - 12} textAnchor="end" fontSize="13" fontWeight="600" fill="var(--color-mk-forest)">
          {growth[at].churches} {growth[at].churches === 1 ? 'church' : 'churches'}{hover !== null ? ` · ${growth[at].label}` : ''}
        </text>
        {growth.map((g, i) => (i % 3 === 0 || i === growth.length - 1) && (
          <text key={g.start} x={pts[i][0]} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--color-mk-muted)">{g.label}</text>
        ))}
        {growth.map((g, i) => (
          <rect key={g.start} x={pts[i][0] - pw / (growth.length - 1) / 2} y={T} width={pw / (growth.length - 1)} height={ph} fill="transparent" tabIndex={0}
            aria-label={`${g.label}: ${g.churches} churches`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
        ))}
      </svg>
    </figure>
  )
}

const KINDS: Record<Attention['kind'], { icon: LucideIcon; tag: string; tone: string }> = {
  failing: { icon: CircleX, tag: 'Failing', tone: 'bg-[#FBEDEA] text-[#B42318]' },
  unallocated: { icon: TriangleAlert, tag: 'Warning', tone: 'bg-[#FBF4E4] text-[#8A5A00]' },
  waiting: { icon: Clock, tag: 'Waiting', tone: 'bg-[#FBF4E4] text-[#8A5A00]' },
  quiet: { icon: Moon, tag: 'Quiet', tone: 'bg-[#F1F4F2] text-mk-muted' },
}

function AttentionList({ items }: { items: Attention[] }) {
  if (!items.length) return <p className="text-sm text-mk-muted">Every church is running smoothly: no failing payments, unmatched Paybill payments or waiting registrations.</p>
  return (
    <ul className="-mt-3.5 flex flex-col">
      {items.map((item) => <AttentionItem key={`${item.kind}-${item.church}`} item={item} />)}
    </ul>
  )
}

function AttentionItem({ item }: { item: Attention }) {
  const { icon: Icon, tag, tone } = KINDS[item.kind]
  const [sent, setSent] = useState('')
  const action = 'mt-1 self-start text-sm font-semibold text-mk-green hover:underline'
  const resend = async () => {
    try {
      const res = await api.post<{ detail: string }>('/platform/register/resend/', { username: item.username })
      setSent(res.detail)
    } catch (err) { setSent(errorMessage(err)) }
  }
  return (
    <li className="flex gap-3.5 border-t border-mk-mist py-3.5">
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${tone}`}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-mk-forest">{item.name}</span>
          <span className={`text-xs font-bold uppercase tracking-[0.04em] ${tone.split(' ')[1]}`}>{tag}</span>
        </span>
        <span className="text-sm text-mk-muted">{item.text}</span>
        {item.kind === 'failing' && <Link to={`/platform/churches?edit=${item.church}`} className={action}>Check M-PESA keys →</Link>}
        {item.kind === 'unallocated' && <a href={`${item.url}/paybill`} target="_blank" rel="noreferrer" className={action}>Open their Paybill →</a>}
        {item.kind === 'quiet' && <a href={item.url} target="_blank" rel="noreferrer" className={action}>Visit their site →</a>}
        {item.kind === 'waiting' && item.username && (sent
          ? <span role="status" className="mt-1 text-sm text-mk-forest">{sent}</span>
          : <button type="button" onClick={resend} className={action}>Resend code →</button>)}
      </span>
    </li>
  )
}

function Spark({ values }: { values: string[] }) {
  const nums = values.map(Number)
  const max = Math.max(...nums), min = Math.min(...nums)
  if (max === 0) return <span className="text-[13px] text-mk-muted">No gifts</span>
  const w = 96, h = 28
  const pts = nums.map((v, i) => [(i * w) / (nums.length - 1), h - 3 - ((v - min) / (max - min || 1)) * (h - 6)])
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" className="block">
      <path d={`M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')}`} fill="none" stroke="var(--color-mk-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="var(--color-mk-green)" />
    </svg>
  )
}

const STATUS: Record<Row['status'], [string, string]> = {
  open: ['Open', 'bg-[#E3F1EA] text-mk-green'],
  closed: ['Closed', 'bg-mk-mist text-mk-muted'],
  pending: ['Waiting on owner', 'bg-[#FBF4E4] text-[#8A5A00]'],
}
const SHOW = 10

function Churches({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const found = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => (!status || r.status === status) && (!q || r.name.toLowerCase().includes(q) || r.domain.toLowerCase().includes(q)))
  }, [rows, search, status])
  const th = 'whitespace-nowrap px-3 py-3 text-[13px] font-semibold text-mk-muted'
  return (
    <section aria-labelledby="churches-title" className="overflow-hidden rounded-[22px] border border-mk-border bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="flex flex-col gap-0.5">
          <h2 id="churches-title" className="font-display text-xl font-semibold text-mk-forest">Churches</h2>
          <p className="text-sm text-mk-muted">Most given this month first</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <label className="flex h-[42px] min-w-[240px] items-center gap-2 rounded-xl border border-mk-border bg-mk-ivory px-3.5 text-sm focus-within:border-mk-green">
            <Search className="h-[17px] w-[17px] text-mk-muted" aria-hidden="true" />
            <span className="sr-only">Search churches</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search churches" className="min-w-0 flex-1 bg-transparent text-mk-forest outline-none" />
          </label>
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-[42px] rounded-xl border border-mk-border bg-white px-3.5 text-sm text-mk-forest">
            <option value="">All statuses</option><option value="open">Open</option><option value="pending">Waiting on owner</option><option value="closed">Closed</option>
          </select>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-[15px]">
          <thead className="bg-mk-ivory text-left"><tr>
            <th className={`${th} pl-6`}>Church</th><th className={`${th} text-right`}>Members</th><th className={`${th} text-right`}>Given this month</th>
            <th className={`${th} text-right`}>vs last month</th><th className={th}>12 weeks</th><th className={th}>M-PESA</th><th className={`${th} pr-6`}>Status</th>
          </tr></thead>
          <tbody>
            {found.slice(0, SHOW).map((r) => (
              <tr key={r.id} className="border-t border-mk-mist">
                <td className="py-3.5 pl-6 pr-3"><span className="flex flex-col">
                  <span className="font-semibold text-mk-forest">{r.name}</span>
                  <a href={r.url} target="_blank" rel="noreferrer" className="font-mono text-xs text-mk-muted hover:text-mk-green hover:underline">{r.domain}</a>
                </span></td>
                <td className="px-3 py-3.5 text-right tabular-nums">{number(r.members)}</td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-mk-forest">{r.status === 'pending' ? '—' : compactMoney(r.given_this_month)}</td>
                <td className="px-3 py-3.5 text-right">{r.change === null ? <span className="text-[13px] text-mk-muted">—</span> : <Delta value={Math.round(r.change)} />}</td>
                <td className="px-3 py-3.5">{r.status !== 'pending' && <Spark values={r.weekly} />}</td>
                <td className="px-3 py-3.5 text-sm">{r.own_paybill ? 'Own Paybill' : "Platform's"}</td>
                <td className="py-3.5 pl-3 pr-6"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span></td>
              </tr>
            ))}
            {!found.length && <tr><td colSpan={7} className="px-6 py-8 text-center text-mk-muted">No churches match.</td></tr>}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between border-t border-mk-mist px-6 py-3.5 text-sm text-mk-muted">
        <span>{Math.min(found.length, SHOW)} of {rows.length} churches</span>
        <Link to="/platform/churches" className="font-semibold text-mk-green hover:underline">See all churches →</Link>
      </footer>
    </section>
  )
}
