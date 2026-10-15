import { useEffect, useState, type ComponentType, type InputHTMLAttributes, type Key, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, X } from 'lucide-react'
import { STATUS_TONES } from '../lib/format'
import type { Tone } from '../types'

const TONES: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  blue: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

export function Badge({ children, tone, status }: { children: ReactNode; tone?: Tone; status?: string }) {
  const cls = TONES[tone || (status && STATUS_TONES[status]) || 'slate']
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>{children}</span>
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin text-brand-600 ${className}`} />
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
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
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
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
        className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-slate-400 hover:text-slate-600 focus-visible:text-brand-700 focus-visible:outline-none">
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`card my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
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
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  )
}

export function Alert({ children, tone = 'red' }: { children?: ReactNode; tone?: 'red' | 'amber' | 'green' }) {
  if (!children) return null
  const cls = ({ red: 'border-red-200 bg-red-50 text-red-700', amber: 'border-amber-200 bg-amber-50 text-amber-800' } as Record<string, string>)[tone] || 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>
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
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>{columns.map((c) => <th key={c.key} className={`th ${c.className || ''}`}>{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !rows?.length ? (
              <tr><td colSpan={columns.length} className="py-12"><Spinner className="mx-auto" /></td></tr>
            ) : !rows?.length ? (
              <tr><td colSpan={columns.length} className="py-12 text-center text-sm text-slate-500">{empty}</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}>
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
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>{count.toLocaleString()} record{count === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <button className="btn-secondary px-2 py-1" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <span>Page {page} of {pages}</span>
        <button className="btn-secondary px-2 py-1" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
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
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && <span className="rounded-lg bg-brand-50 p-2 text-brand-700"><Icon className="h-5 w-5" /></span>}
      </div>
    </div>
  )
}

export function Progress({ value, max }: { value: number | string; max: number | string }) {
  const pct = Number(max) > 0 ? Math.min(100, (Number(value) / Number(max)) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
    </div>
  )
}
