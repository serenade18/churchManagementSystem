import { useEffect } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { Alert, Spinner } from './ui'

/** Paper-like page with a toolbar that disappears when printing. */
export default function PrintLayout({ title, pageSize = 'A4', loading, error, children }) {
  useEffect(() => {
    const previous = document.title
    if (title) document.title = title // becomes the default PDF file name
    const style = document.createElement('style')
    style.textContent = `@page { size: ${pageSize}; margin: 12mm; }`
    document.head.appendChild(style)
    return () => { document.title = previous; style.remove() }
  }, [title, pageSize])

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between px-4">
        <button className="btn-secondary" onClick={() => (window.history.length > 1 ? window.history.back() : window.close())}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button className="btn-primary" onClick={() => window.print()} disabled={loading || !!error}>
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>
      <div className={`mx-auto bg-white p-8 shadow-sm print:p-0 print:shadow-none ${pageSize === 'A5' ? 'max-w-xl' : 'max-w-3xl'}`}>
        {error ? <Alert>{error.message}</Alert> : loading ? <Spinner className="mx-auto my-20 h-8 w-8" /> : children}
      </div>
    </div>
  )
}

export function ChurchHeader({ church, title, subtitle }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-6 border-b-2 border-slate-800 pb-4">
      <div>
        <p className="text-xl font-bold uppercase tracking-wide text-slate-900">{church.name}</p>
        <div className="mt-1 space-y-0.5 text-xs text-slate-600">
          {church.address && <p>{church.address}</p>}
          {(church.phone || church.email) && <p>{[church.phone, church.email].filter(Boolean).join(' · ')}</p>}
          {church.paybill && <p>M-PESA Paybill: {church.paybill}</p>}
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold uppercase tracking-wider text-slate-900">{title}</p>
        {subtitle}
      </div>
    </div>
  )
}
