import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useDebounced } from '../lib/hooks'

/** Type-ahead member search; calls onChange(member | null). */
export default function MemberPicker({ value, onChange }) {
  const [term, setTerm] = useState(value ? `${value.full_name} (${value.membership_number})` : '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const query = useDebounced(term, 250)

  useEffect(() => {
    if (!open || query.length < 2) { setResults([]); return }
    let cancelled = false
    api.get('/cms/members/', { search: query, page_size: 8 }).then((d) => !cancelled && setResults(d.results)).catch(() => {})
    return () => { cancelled = true }
  }, [query, open])

  return (
    <div className="relative">
      <input
        className="input"
        placeholder="Search by name or member number…"
        value={term}
        onChange={(e) => { setTerm(e.target.value); setOpen(true); if (value) onChange(null) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {results.map((m) => (
            <li key={m.id}>
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={() => { onChange(m); setTerm(`${m.full_name} (${m.membership_number})`); setOpen(false) }}>
                <span className="font-medium">{m.full_name}</span> <span className="text-slate-500">· {m.membership_number}{m.branch_name ? ` · ${m.branch_name}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
