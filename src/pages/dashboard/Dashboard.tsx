import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { type LucideIcon, Banknote, ChevronDown, ChevronUp, CircleX, Globe, Plus, Smartphone, UserPlus } from 'lucide-react'
import DonationForm from '../../components/DonationForm'
import ShareChurch from '../../components/ShareChurch'
import { Alert, Spinner } from '../../components/ui'
import { useCan } from '../../lib/access'
import { useAuth } from '../../lib/auth'
import { useApi, useOptions } from '../../lib/hooks'
import { CHANNELS, compactMoney, currencyMoney, date, money } from '../../lib/format'
import type { Branch, DashboardData, Donation } from '../../types'

// The church office's first page: what needs someone today, the headline numbers, then giving,
// attendance, projects and branches. Charts use the church's own colour (one hue), with a hover
// tooltip and a table view.

const number = (n: number) => n.toLocaleString('en-KE')
const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null)
const plural = (n: number, one: string, many = `${one}s`) => `${number(n)} ${n === 1 ? one : many}`
const monthName = (key: string, style: 'short' | 'long' = 'short') => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString('en-KE', { month: style, ...(style === 'long' ? { year: 'numeric' } : {}) })
}
/** Shown masked, as on receipts: 0712 ••• 678. */
const maskPhone = (phone: string) => {
  const local = phone.replace(/^254/, '0')
  return local.length > 7 ? `${local.slice(0, 4)} ••• ${local.slice(-3)}` : local
}
/** A tidy top for the axis: 1, 2, 2.5 or 5 times a power of ten. */
function niceMax(value: number) {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  return ([1, 2, 2.5, 5, 10].find((m) => m * power >= value) || 10) * power
}
const bar = (x: number, y: number, w: number, base: number, r = 4) => {
  const rr = Math.min(r, w / 2, Math.max(0, base - y))
  return `M${x},${base} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${base}Z`
}

/** Phone-width screens get the narrower charts. */
function useNarrow() {
  const query = '(max-width: 639px)'
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const change = () => setNarrow(list.matches)
    list.addEventListener('change', change)
    return () => list.removeEventListener('change', change)
  }, [])
  return narrow
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

function Delta({ value, suffix = '%' }: { value: number | null; suffix?: string }) {
  if (value === null || value === 0) return null
  const up = value > 0
  const Icon = up ? ChevronUp : ChevronDown
  return (
    <span className={`inline-flex items-center gap-0.5 text-[13px] font-semibold ${up ? 'text-[#286B58]' : 'text-[#B42318]'}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />{up ? '+' : '−'}{number(Math.abs(value))}{suffix}
    </span>
  )
}

function Tile({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[20px] border border-mk-border bg-white px-4 py-4 sm:px-[22px] sm:py-5">
      <span className="text-sm text-mk-muted">{label}</span>
      <span className="whitespace-nowrap font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-mk-forest sm:text-[28px]">{value}</span>
      <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-mk-muted">{children}</span>
    </div>
  )
}

function Card({ id, title, subtitle, className = '', children }: { id: string; title: string; subtitle: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col gap-[18px] rounded-[22px] border border-mk-border bg-white p-[18px] sm:p-6 ${className}`}>
      <header className="flex flex-col gap-0.5">
        <h2 id={id} className="font-display text-xl font-semibold text-mk-forest">{title}</h2>
        <p className="text-sm text-mk-muted">{subtitle}</p>
      </header>
      {children}
    </section>
  )
}

const more = 'self-start text-sm font-semibold text-brand-700 hover:underline'

// ------------------------------------------------------------------ needs you

interface Need { key: string; icon: LucideIcon; tone: string; title: string; text: string; action: string; to: string }

function needs(data: DashboardData, can: ReturnType<typeof useCan>): Need[] {
  const list: Need[] = []
  if (data.unallocated_payments > 0 && can('paybill')) {
    list.push({
      key: 'paybill', icon: Smartphone, tone: 'bg-[#FBF4E4] text-[#8A5A00]',
      title: `${money(data.unallocated_amount)} from ${plural(data.unallocated_payments, 'Paybill payment')}`,
      text: 'The code typed didn’t match a gift type. It’s counted in the totals below; allocate it so givers get receipts.',
      action: 'Allocate', to: '/paybill',
    })
  }
  const regs = data.pending_registrations
  if (regs?.count) {
    const others = regs.count - regs.names.length
    list.push({
      key: 'registrations', icon: UserPlus, tone: 'bg-brand-50 text-brand-700',
      title: `${regs.count === 1 ? '1 person' : `${number(regs.count)} people`} asked to join`,
      text: regs.names.join(', ') + (others > 0 ? ` and ${others} more.` : '.'),
      action: 'Review', to: '/registrations',
    })
  }
  const failed = data.failed_receipts
  if (failed?.count && can('giving')) {
    list.push({
      key: 'receipts', icon: CircleX, tone: 'bg-[#FBEDEA] text-[#B42318]',
      title: `${plural(failed.count, 'gift receipt')} couldn’t be sent`,
      text: failed.phones.length ? `In the last 30 days. Check the numbers: ${failed.phones.map(maskPhone).join(', ')}.` : 'In the last 30 days.',
      action: 'See them', to: '/donations',
    })
  }
  return list
}

function NeedsYou({ items }: { items: Need[] }) {
  if (!items.length) return null
  return (
    <section aria-labelledby="needs-title" className="flex flex-col gap-3">
      <h2 id="needs-title" className="text-sm font-semibold uppercase tracking-[0.08em] text-mk-muted">Needs you</h2>
      <ul className="flex flex-wrap gap-3">
        {items.map(({ key, icon: Icon, tone, title, text, action, to }) => (
          <li key={key} className="flex min-w-0 flex-[1_1_280px] items-start gap-3 rounded-2xl border border-mk-border bg-white p-4">
            <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${tone}`}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-semibold text-mk-forest">{title}</span>
              <span className="text-[13px] text-mk-muted">{text}</span>
              <Link to={to} className="mt-1.5 self-start text-sm font-semibold text-brand-700 hover:underline">{action} →</Link>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ------------------------------------------------------------------ giving chart

function GivingChart({ trend: all }: { trend: DashboardData['trend'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const narrow = useNarrow()
  const trend = narrow && !table ? all.slice(-6) : all
  const values = trend.map((t) => Number(t.total))
  const last = trend.length - 1

  if (table) {
    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead><tr><th className="pb-2 text-left text-[13px] font-semibold text-mk-muted">Month</th><th className="pb-2 text-right text-[13px] font-semibold text-mk-muted">Given</th></tr></thead>
            <tbody>
              {trend.map((t, i) => (
                <tr key={t.month} className="border-t border-mk-mist">
                  <td className="py-2">{monthName(t.month, 'long')}{i === last && ' (so far)'}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-mk-forest">{money(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setTable(false)} className={more}>Show as a chart</button>
      </>
    )
  }

  const W = narrow ? 340 : 640, H = narrow ? 200 : 250, L = narrow ? 40 : 46, T = 14, B = 28
  const pw = W - L - 8, ph = H - T - B
  const max = niceMax(Math.max(...values, 0))
  const step = pw / Math.max(trend.length, 1)
  const gap = Math.min(12, step * 0.3)
  const y = (v: number) => T + ph - (v / max) * ph
  const tip = hover === null ? null : trend[hover]
  const change = hover !== null && hover > 0 ? pct(values[hover], values[hover - 1]) : null
  const busiest = values.slice(0, last).reduce((best, v, i) => (v > values[best] ? i : best), 0)
  return (
    <>
      <figure className="relative m-0" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" role="img" aria-labelledby="giving-title giving-desc">
          <desc id="giving-desc">
            Giving each month for the last {trend.length} months. Highest: {monthName(trend[busiest]?.month || '', 'long')}, {money(values[busiest])}.
            {' '}{monthName(trend[last]?.month || '', 'long')} so far: {money(values[last])}.
          </desc>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={L} x2={W - 8} y1={y(max * f)} y2={y(max * f)} stroke="var(--color-mk-mist)" />
              <text x={L - 10} y={y(max * f) + 4} textAnchor="end" fontSize="12" fill="var(--color-mk-muted)">{f === 0 ? '0' : compactMoney(max * f).replace('KES ', '')}</text>
            </g>
          ))}
          {trend.map((t, i) => {
            const x = L + i * step + gap / 2
            const w = step - gap
            const v = values[i]
            const partial = i === last
            return (
              <g key={t.month}>
                {v > 0 && (
                  <path d={bar(x, y(v), w, T + ph)} fill={partial ? 'var(--color-brand-50)' : hover === i ? 'var(--color-sidebar)' : 'var(--color-brand-600)'}
                    stroke={partial ? 'var(--color-brand-600)' : undefined} strokeWidth={partial ? 1.5 : undefined} strokeDasharray={partial ? '4 3' : undefined} />
                )}
                <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--color-mk-muted)" fontWeight={hover === i ? 600 : 400}>{monthName(t.month)}</text>
                <rect x={L + i * step} y={T} width={step} height={ph} fill="transparent" tabIndex={0}
                  aria-label={`${monthName(t.month, 'long')}: ${money(v)}${partial ? ' so far' : ''}`}
                  onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
              </g>
            )
          })}
        </svg>
        {tip && hover !== null && (
          <div role="status" className="pointer-events-none absolute z-10 flex min-w-[160px] flex-col rounded-[10px] border border-mk-border bg-white px-3 py-2 shadow-sm"
            style={{ left: `${((L + hover * step + step / 2) / W) * 100}%`, top: `${(y(values[hover]) / H) * 100}%`, transform: 'translate(-50%, calc(-100% - 10px))' }}>
            <span className="text-xs text-mk-muted">{monthName(tip.month, 'long')}{hover === last && ' (so far)'}</span>
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-display text-lg font-semibold text-mk-forest">{compactMoney(tip.total)}</span>
              {hover !== last && <Delta value={change} />}
            </span>
          </div>
        )}
      </figure>
      <button type="button" onClick={() => setTable(true)} className={more}>Show as a table</button>
    </>
  )
}

// ------------------------------------------------------------------ attendance chart

const dayMonth = (d: string) => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })

function AttendanceChart({ points }: { points: NonNullable<DashboardData['attendance_trend']> }) {
  const [hover, setHover] = useState<number | null>(null)
  const taken = points.filter((p) => p.services > 0)
  if (taken.length < 2) return <p className="text-sm text-mk-muted">Record a few Sunday services to see the trend here.</p>
  const W = 420, H = 190, L = 40, T = 14, B = 28
  const pw = W - L - 16, ph = H - T - B
  const values = points.map((p) => p.total)
  const lo = Math.max(0, Math.floor((Math.min(...taken.map((p) => p.total)) * 0.8) / 50) * 50)
  const hi = Math.max(lo + 50, Math.ceil((Math.max(...values) * 1.1) / 50) * 50)
  const x = (i: number) => L + (i * pw) / (points.length - 1)
  const y = (v: number) => T + ph - ((v - lo) / (hi - lo)) * ph
  const shown = points.map((p, i) => [i, p] as const).filter(([, p]) => p.services > 0)
  const line = shown.map(([i, p]) => `${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' L')
  const at = hover ?? shown[shown.length - 1][0]
  const label = hover === null ? `${number(points[at].total)} last Sunday` : `${number(points[at].total)} · ${dayMonth(points[at].date)}`
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" role="img" aria-labelledby="att-title att-desc" onMouseLeave={() => setHover(null)}>
        <desc id="att-desc">People at Sunday services, last 8 Sundays: {shown.map(([, p]) => `${dayMonth(p.date)} ${p.total}`).join(', ')}.</desc>
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - 16} y1={y(v)} y2={y(v)} stroke="var(--color-mk-mist)" />
            <text x={L - 10} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--color-mk-muted)">{Math.round(v)}</text>
          </g>
        ))}
        <path d={`M${line}`} fill="none" stroke="var(--color-brand-600)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {shown.map(([i, p]) => i !== at && <circle key={p.date} cx={x(i)} cy={y(p.total)} r="3" fill="var(--color-brand-600)" />)}
        <circle cx={x(at)} cy={y(points[at].total)} r="5" fill="var(--color-brand-600)" stroke="#fff" strokeWidth="2" />
        <text x={x(at) > W / 2 ? x(at) - 10 : x(at) + 10} y={y(points[at].total) - 12} textAnchor={x(at) > W / 2 ? 'end' : 'start'}
          fontSize="13" fontWeight="600" fill="var(--color-mk-forest)">{label}</text>
        {points.map((p, i) => (i % 2 === 0 || i === points.length - 1) && (
          <text key={p.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--color-mk-muted)">{dayMonth(p.date)}</text>
        ))}
        {points.map((p, i) => p.services > 0 && (
          <rect key={p.date} x={x(i) - pw / 14} y={T} width={pw / 7} height={ph} fill="transparent" tabIndex={0}
            aria-label={`${dayMonth(p.date)}: ${p.total} people (${p.members} members, ${p.visitors} visitors)`}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
        ))}
      </svg>
    </figure>
  )
}

// ------------------------------------------------------------------ lists

function Bars({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-medium text-mk-forest">{item.label}</span>
            <span className="font-semibold text-mk-forest">{compactMoney(item.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-mk-mist" role="presentation">
            <div className="h-full min-w-1.5 rounded-full bg-brand-600" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const giverName = (d: Donation) =>
  d.member_name || d.giver_name || (d.unallocated ? 'Not yet allocated' : d.phone_number ? 'A visitor' : 'Anonymous')
const giverRef = (d: Donation) => (d.member_name ? d.membership_number : d.phone_number ? maskPhone(d.phone_number) : '')

function when(at: string) {
  const d = new Date(at)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000)
  if (days === 0) return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (days === 1) return 'Yesterday'
  if (days < 7) return d.toLocaleDateString('en-KE', { weekday: 'long' })
  return date(at)
}

function GiftIcon({ channel }: { channel: Donation['channel'] }) {
  const Icon = channel === 'paypal' ? Globe : ['cash', 'bank', 'cheque'].includes(channel) ? Banknote : Smartphone
  return (
    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-700">
      <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
    </span>
  )
}

function LatestGifts({ gifts }: { gifts: Donation[] }) {
  if (!gifts.length) return <p className="text-sm text-mk-muted">No gifts yet. They show here as they arrive.</p>
  return (
    <ul className="-mt-3">
      {gifts.slice(0, 5).map((d) => (
        <li key={d.id} className="flex items-center gap-3 border-t border-mk-mist py-3">
          <GiftIcon channel={d.channel} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold text-mk-forest">
              {giverName(d)}{giverRef(d) && <span className="text-[13px] font-normal text-mk-muted"> · {giverRef(d)}</span>}
            </span>
            <span className="truncate text-[13px] text-mk-muted">
              {d.donation_type_name} · {CHANNELS[d.channel]} · {when(d.created_at)}{d.status !== 'success' && ` · ${d.status === 'pending' ? 'waiting' : 'failed'}`}
            </span>
          </span>
          <span className="whitespace-nowrap font-semibold tabular-nums text-mk-forest">
            {d.currency !== 'KES' && d.amount_original ? currencyMoney(d.amount_original, d.currency) : money(d.amount)}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ------------------------------------------------------------------ page

export default function Dashboard() {
  const can = useCan()
  const narrow = useNarrow()
  const { user } = useAuth()
  const [branch, setBranch] = useState('')
  const [recording, setRecording] = useState(false)
  const branches = useOptions<Branch>('/cms/branches/')
  const { data, error, reload } = useApi<DashboardData>('/cms/dashboard/', branch ? { branch } : undefined)

  const name = user?.first_name || user?.username || ''
  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-mk-muted">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-mk-forest sm:text-[34px]">{greeting()}{name && `, ${name}`}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {branches.length > 1 && (
          <select aria-label="Show branch" value={branch} onChange={(e) => setBranch(e.target.value)} className="input w-auto! min-w-[170px] bg-white">
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        {can('giving', true) && (
          <button type="button" className="btn-primary min-h-11" onClick={() => setRecording(true)}><Plus className="h-[18px] w-[18px]" /> Record a gift</button>
        )}
      </div>
    </header>
  )

  if (error) return <div className="flex flex-col gap-6">{header}<Alert>{error.message}</Alert></div>
  if (!data) return <div className="flex flex-col gap-6">{header}<div className="py-20"><Spinner className="mx-auto h-8 w-8" /></div></div>

  const giving = can('giving')
  const attendance = data.attendance_trend || []
  const taken = attendance.filter((p) => p.services > 0)
  const lastSunday = taken[taken.length - 1]
  const sundayBefore = taken[taken.length - 2]
  const d = data.donations
  const thisMonth = data.trend[data.trend.length - 1]?.month
  const lastMonth = data.trend[data.trend.length - 2]?.month
  const byType = (data.month_by_type || data.by_type).slice(0, 5).map((t) => ({ label: t.name || 'Unspecified', value: Number(t.total) }))
  const branchRows = (data.branch_rows || data.top_branches).slice(0, 6)
  const branchMax = Math.max(...branchRows.map((b) => Number(b.total)), 1)
  const ongoing = data.active_projects.filter((p) => p.status === 'ongoing').length

  return (
    <div className="flex flex-col gap-6">
      {header}
      <NeedsYou items={needs(data, can)} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        {giving && (
          <Tile label={`Given in ${thisMonth ? monthName(thisMonth, 'long').split(' ')[0] : 'this month'}`} value={compactMoney(d.this_month)}>
            so far{d.last_month !== undefined && lastMonth && <> · {monthName(lastMonth, 'long').split(' ')[0]}: {compactMoney(d.last_month)}</>}
          </Tile>
        )}
        {giving && (
          <Tile label="Given this year" value={compactMoney(d.this_year)}>
            {d.last_year_to_date !== undefined && Number(d.last_year_to_date) > 0
              ? <><Delta value={pct(Number(d.this_year), Number(d.last_year_to_date))} />vs {compactMoney(d.last_year_to_date)} by now last year</>
              : `${compactMoney(d.all_time)} all time`}
          </Tile>
        )}
        <Tile label="Active members" value={number(data.members.active)}>
          <Delta value={data.members.new_this_month} suffix="" />{data.members.new_this_month === 1 ? '1 joined' : `${data.members.new_this_month} joined`} this month
        </Tile>
        {lastSunday && (
          <Tile label="Last Sunday" value={`${number(lastSunday.total)} people`}>
            {sundayBefore && <Delta value={pct(lastSunday.total, sundayBefore.total)} />}{number(lastSunday.members)} members · {number(lastSunday.visitors)} visitors
          </Tile>
        )}
        {giving && d.by_phone_share !== undefined && d.by_phone_share !== null && (
          <Tile label="Gifts by phone" value={`${d.by_phone_share}%`}>of this month’s giving</Tile>
        )}
      </div>

      <ShareChurch />

      {giving && (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card id="giving-title" title="Giving" subtitle={`KES, by month${narrow ? ', last 6' : ''} · ${thisMonth ? monthName(thisMonth, 'long').split(' ')[0] : 'this month'} so far (dashed)`}>
            <GivingChart trend={data.trend} />
          </Card>
          <Card id="type-title" title="What people gave for" subtitle={data.month_by_type ? 'This month so far' : 'This year'}>
            {byType.length ? <Bars items={byType} /> : <p className="text-sm text-mk-muted">No gifts yet this month.</p>}
            <Link to="/donations" className={`${more} mt-auto`}>See all donations →</Link>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {can('attendance') && (
          <Card id="att-title" title="Sunday attendance" subtitle="All services, last 8 Sundays">
            <AttendanceChart points={attendance} />
            {data.last_service && (
              <Link to={`/attendance/${data.last_service.id}`} className="group flex flex-wrap gap-x-6 gap-y-3 border-t border-mk-mist pt-3.5">
                {[['Members', data.last_service.members_present], ['Visitors', data.last_service.visitors], ['First-timers', data.last_service.first_timers ?? 0]].map(([label, value]) => (
                  <span key={label}>
                    <span className="block text-[13px] text-mk-muted">{label}</span>
                    <span className="font-display text-[22px] font-semibold text-mk-forest">{number(Number(value))}</span>
                  </span>
                ))}
                <span className="ml-auto self-end text-[13px] text-mk-muted group-hover:text-brand-700">
                  {data.last_service.name} · {date(data.last_service.date)}{data.last_service.branch_name && ` · ${data.last_service.branch_name}`}
                </span>
              </Link>
            )}
          </Card>
        )}
        {giving && (
          <Card id="gifts-title" title="Latest gifts" subtitle="As they arrive">
            <LatestGifts gifts={data.recent_donations} />
            <Link to="/donations" className={`${more} mt-auto`}>See all donations →</Link>
          </Card>
        )}
        {can('projects') && (
          <Card id="proj-title" title="Projects" subtitle={ongoing ? `${ongoing} ongoing` : 'None ongoing'}>
            {data.active_projects.length ? (
              <div className="-mt-3">
                {data.active_projects.map((p) => {
                  const target = Number(p.target_amount)
                  const share = target > 0 ? Math.min(100, Math.round((Number(p.amount_raised) / target) * 100)) : null
                  return (
                    <div key={p.id} className="flex flex-col gap-1.5 border-t border-mk-mist py-3">
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-mk-forest">{p.name}</span>
                        {share !== null && <span className="font-semibold text-mk-forest">{share}%</span>}
                      </div>
                      {share !== null && (
                        <div className="h-2 rounded-full bg-mk-mist" role="progressbar" aria-label={`${p.name} raised`} aria-valuenow={share} aria-valuemin={0} aria-valuemax={100}>
                          <div className="h-full rounded-full bg-brand-600" style={{ width: `${share}%` }} />
                        </div>
                      )}
                      <span className="text-[13px] text-mk-muted">
                        {compactMoney(p.amount_raised)}{target > 0 && ` of ${compactMoney(target).replace('KES ', '')}`}{p.status === 'planned' && ' · planned'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : <p className="text-sm text-mk-muted">No projects running right now.</p>}
            <Link to="/projects" className={`${more} mt-auto`}>Open projects →</Link>
          </Card>
        )}
        {branchRows.length > 0 && (
          <Card id="branch-title" title="Branches" subtitle="This year">
            <table className="w-full text-[15px]">
              <thead>
                <tr>
                  <th className="bg-transparent! p-0! pb-2! text-left">Branch</th>
                  <th className="bg-transparent! px-2! pb-2! pt-0! text-right">Members</th>
                  {giving && <th className="bg-transparent! py-0! pb-2! pl-2! pr-0! text-left">Given this year</th>}
                </tr>
              </thead>
              <tbody>
                {branchRows.map((b) => (
                  <tr key={b.id} className="border-t border-mk-mist">
                    <td className="py-3 font-semibold text-mk-forest">{b.name}</td>
                    <td className="px-2 py-3 text-right tabular-nums">{number(b.member_count)}</td>
                    {giving && (
                      <td className="w-[45%] py-3 pl-2">
                        <span className="flex items-center gap-2.5">
                          <span className="h-2 flex-1 rounded-full bg-mk-mist" role="presentation">
                            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${(Number(b.total) / branchMax) * 100}%` }} />
                          </span>
                          <span className="whitespace-nowrap text-sm font-semibold text-mk-forest">{compactMoney(b.total)}</span>
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {recording && <DonationForm donation={null} onClose={() => setRecording(false)} onSaved={() => { setRecording(false); reload() }} />}
    </div>
  )
}
