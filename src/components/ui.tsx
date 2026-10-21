import { useEffect, useState, type ComponentType, type InputHTMLAttributes, type Key, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, X } from 'lucide-react'
import { STATUS_TONES } from '../lib/format'
import type { Tone } from '../types'

// Status chips: a word on a tint, never colour alone.
const TONES: Record<Tone, string> = {
  green: 'bg-[#E3F1EA] text-[#286B58]',
  blue: 'bg-brand-50 text-brand-700',
  amber: 'bg-[#FBF4E4] text-[#8A5A00]',
  red: 'bg-[#FBEDEA] text-[#B42318]',
  purple: 'bg-purple-50 text-purple-700',
  slate: 'bg-mk-mist text-mk-muted',
}

export function Badge({ children, tone, status }: { children: ReactNode; tone?: Tone; status?: string }) {
  const cls = TONES[tone || (status && STATUS_TONES[status]) || 'slate']
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${cls}`}>{children}</span>
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin text-brand-600 ${className}`} />
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.015em] text-mk-forest sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-mk-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

interface FieldProps {
  label?: ReactNode
  children: ReactNode
  error?: string
  className?: string
  hint?: ReactNode
}

export function Field({ label, children, error, className = '', hint }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-[13px] text-mk-muted">{hint}</span>}
      {error && <span className="mt-1 block text-[13px] text-danger">{error}</span>}
    </label>
  )
}

/** Password field with a button that shows or hides what was typed. */
export function PasswordInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false)
  const Icon = shown ? EyeOff : Eye
  return (
    <div className="relative">
      <input {...props} type={shown ? 'text' : 'password'} className={`input pr-10! ${className}`} />
      <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-mk-muted hover:text-mk-forest focus-visible:text-brand-700 focus-visible:outline-none">
        <Icon className="h-4 w-4" />
      </button>
    </div>
  )
}

export type SelectOption = { value: string | number; label: string }

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: string | number | null | undefined
  onChange: (value: string) => void
  /** A list of options, or a {value: label} map. */
  options: SelectOption[] | Record<string, string>
  placeholder?: string
}

export function Select({ value, onChange, options, placeholder, ...rest }: SelectProps) {
  const entries: SelectOption[] = Array.isArray(options) ? options : Object.entries(options).map(([value, label]) => ({ value, label }))
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {entries.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, children, footer, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-mk-forest/40 p-4 sm:p-8" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`card my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-mk-mist px-6 py-5">
          <h2 className="font-display text-xl font-semibold text-mk-forest">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-mk-muted hover:bg-mk-mist hover:text-mk-forest" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-mk-mist px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  onConfirm: () => void
  onClose: () => void
  busy?: boolean
}

export function ConfirmDialog({ open, title, message, onConfirm, onClose, busy }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
        </>
      }
    >
      <p className="text-[15px] text-mk-slate">{message}</p>
    </Modal>
  )
}

export function Alert({ children, tone = 'red' }: { children?: ReactNode; tone?: 'red' | 'amber' | 'green' }) {
  if (!children) return null
  const cls = ({ red: 'border-[#F0C7BF] bg-[#FBEDEA] text-[#8E2F22]', amber: 'border-[#EADCB8] bg-[#FBF4E4] text-[#8A5A00]' } as Record<string, string>)[tone] || 'border-[#BFE0CF] bg-[#E3F1EA] text-[#286B58]'
  return <div className={`mb-4 rounded-[14px] border px-4 py-3 text-[15px] ${cls}`}>{children}</div>
}

export interface Column<R> {
  key: string
  label: ReactNode
  className?: string
  /** Defaults to the row's value at `key`. */
  render?: (row: R) => ReactNode
}

interface TableProps<R> {
  columns: Column<R>[]
  rows: R[] | null | undefined
  loading?: boolean
  empty?: ReactNode
  onRowClick?: (row: R) => void
}

export function Table<R extends { id: Key }>({ columns, rows, loading, empty = 'Nothing here yet.', onRowClick }: TableProps<R>) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>{columns.map((c) => <th key={c.key} className={`th ${c.className || ''}`}>{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-mk-mist border-t border-mk-mist text-mk-slate">
            {loading && !rows?.length ? (
              <tr><td colSpan={columns.length} className="py-12"><Spinner className="mx-auto" /></td></tr>
            ) : !rows?.length ? (
              <tr><td colSpan={columns.length} className="py-12 text-center text-[15px] text-mk-muted">{empty}</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick ? 'cursor-pointer hover:bg-mk-ivory' : ''}>
                  {columns.map((c) => <td key={c.key} className={`td ${c.className || ''}`}>{c.render ? c.render(row) : ((row as Record<string, ReactNode>)[c.key] ?? '—')}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface PaginationProps {
  page: number
  count: number | null | undefined
  pageSize?: number
  onChange: (page: number) => void
}

export function Pagination({ page, count, pageSize = 20, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil((count || 0) / pageSize))
  if (!count) return null
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-mk-muted">
      <span>{count.toLocaleString()} record{count === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <button className="btn-secondary min-h-9 px-2.5 py-1" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <span>Page {page} of {pages}</span>
        <button className="btn-secondary min-h-9 px-2.5 py-1" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: ComponentType<{ className?: string }>
}

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-[20px] border border-mk-border bg-white px-[22px] py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-mk-muted">{label}</p>
          <p className="mt-1.5 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-mk-forest">{value}</p>
          {hint && <p className="mt-1.5 text-[13px] text-mk-muted">{hint}</p>}
        </div>
        {Icon && <span className="rounded-xl bg-brand-50 p-2 text-brand-700"><Icon className="h-5 w-5" /></span>}
      </div>
    </div>
  )
}

export function Progress({ value, max }: { value: number | string; max: number | string }) {
  const pct = Number(max) > 0 ? Math.min(100, (Number(value) / Number(max)) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-mk-mist">
      <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
    </div>
  )
}
