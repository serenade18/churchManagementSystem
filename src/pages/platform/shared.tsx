import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'

// Pieces the platform admin's pages share: cards, headline tiles, deltas and chart helpers.

export const number = (n: number) => n.toLocaleString('en-KE')

export function Card({ id, title, subtitle, flex, children }: { id: string; title: string; subtitle: string; flex: string; children: ReactNode }) {
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

/** Up or down, in green or red, with an arrow so it isn't colour alone. */
export function Delta({ value, suffix = '%', invert = false }: { value: number | null; suffix?: string; invert?: boolean }) {
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

export function Tile({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[20px] border border-mk-border bg-white px-[22px] py-5">
      <span className="text-sm text-mk-muted">{label}</span>
      <span className="whitespace-nowrap font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-mk-forest">{value}</span>
      <span className="flex flex-wrap items-center gap-2 text-[13px] text-mk-muted">{children}</span>
    </div>
  )
}

/** A rounded-top bar from the baseline. */
export const bar = (x: number, y: number, w: number, base: number, r = 4) => {
  const rr = Math.min(r, w / 2, Math.max(0, base - y))
  return `M${x},${base} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${base}Z`
}

/** A tidy top for the axis: 1, 2, 2.5 or 5 times a power of ten. */
export function niceMax(value: number) {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  return ([1, 2, 2.5, 5, 10].find((m) => m * power >= value) || 10) * power
}

/** The page's big title, with its controls on the right. */
export function PlatformHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.015em] text-mk-forest">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  )
}

export type Tone = 'ok' | 'warn' | 'bad' | 'muted'
const TONES: Record<Tone, string> = {
  ok: 'bg-[#E3F1EA] text-mk-green', warn: 'bg-[#FBF4E4] text-[#8A5A00]', bad: 'bg-[#FBEDEA] text-[#B42318]', muted: 'bg-mk-mist text-mk-muted',
}

/** A status in words, tinted; never colour alone. */
export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${TONES[tone]}`}>{children}</span>
}

export function SearchBox({ label, value, onChange, className = 'min-w-[240px]' }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`flex h-[42px] items-center gap-2 rounded-xl border border-mk-border bg-mk-ivory px-3.5 text-sm focus-within:border-mk-green ${className}`}>
      <Search className="h-[17px] w-[17px] text-mk-muted" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} className="min-w-0 flex-1 bg-transparent text-mk-forest outline-none" />
    </label>
  )
}

export function Picker<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)}
      className="h-[42px] rounded-xl border border-mk-border bg-white px-3.5 text-sm text-mk-forest">
      {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
  )
}

export function Tabs<T extends string>({ label, value, onChange, tabs }: { label: string; value: T; onChange: (v: T) => void; tabs: [T, string, number | null][] }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-7 overflow-x-auto border-b border-mk-mist px-6">
      {tabs.map(([key, text, count]) => {
        const on = value === key
        return (
          <button key={key} type="button" role="tab" aria-selected={on} onClick={() => onChange(key)}
            className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-0.5 py-3 text-[15px] ${on ? 'border-mk-green font-semibold text-mk-forest' : 'border-transparent font-medium text-mk-muted hover:text-mk-forest'}`}>
            {text}
            {count !== null && <span className={`rounded-full px-[7px] text-xs font-bold leading-5 ${on ? 'bg-mk-green text-white' : 'bg-mk-mist text-mk-muted'}`}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Horizontal bars for one measure: a label, a value and its share. */
export function ShareBars({ items }: { items: { key: string; label: string; value: string; share: number }[] }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item.key} className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3 text-sm"><span className="font-medium text-mk-forest">{item.label}</span><span className="font-semibold text-mk-forest">{item.value}</span></div>
          <div className="h-2.5 rounded-full bg-mk-mist" role="presentation">
            {item.share > 0 && <div className="h-full min-w-1.5 rounded-full bg-mk-green" style={{ width: `${Math.min(item.share, 100)}%` }} />}
          </div>
        </div>
      ))}
    </div>
  )
}

/** A white section with a title row, used for the pages' tables. */
export function TableSection({ id, title, subtitle, controls, children, footer }: { id: string; title: string; subtitle: string; controls?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0 overflow-hidden rounded-[22px] border border-mk-border bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="flex flex-col gap-0.5">
          <h2 id={id} className="font-display text-xl font-semibold text-mk-forest">{title}</h2>
          <p className="text-sm text-mk-muted">{subtitle}</p>
        </div>
        {controls && <div className="flex flex-wrap gap-2.5">{controls}</div>}
      </header>
      {children}
      {footer && <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-mk-mist px-6 py-3.5 text-sm text-mk-muted">{footer}</footer>}
    </section>
  )
}

export const th = 'whitespace-nowrap px-3 py-3 text-left text-[13px] font-semibold text-mk-muted'
export const td = 'px-3 py-3.5 align-middle'
export const pillButton = 'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-mk-border bg-white px-3.5 text-sm font-semibold text-mk-forest hover:border-mk-green disabled:opacity-60'
