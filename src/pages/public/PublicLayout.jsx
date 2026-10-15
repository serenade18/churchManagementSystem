import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo, { PoweredBy } from '../../components/Logo'
import { branding } from '../../lib/theme'

const LINKS = [
  ['/', 'Home'],
  ['/give', 'Give'],
  ['/register', 'Register'],
  ['/me', 'My portal'],
]

/** Frame for the church's public pages: home, give, register and the member portal. */
export default function PublicLayout({ children, width = 'max-w-3xl' }) {
  const [open, setOpen] = useState(false)
  const link = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className={`mx-auto flex items-center gap-3 px-4 py-3 ${width}`}>
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Logo tile className="h-10 w-10" />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900">{branding.name}</span>
              <span className="block truncate text-xs text-slate-500">{window.location.host}</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 sm:flex">
            {LINKS.map(([to, label]) => <NavLink key={to} to={to} end className={link}>{label}</NavLink>)}
          </nav>
          <button className="ml-auto rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:hidden" aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <nav className="grid gap-1 border-t border-slate-100 px-4 py-2 sm:hidden">
            {LINKS.map(([to, label]) => <NavLink key={to} to={to} end className={link} onClick={() => setOpen(false)}>{label}</NavLink>)}
          </nav>
        )}
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-6 sm:py-8 ${width}`}>{children}</main>
      <footer className={`mx-auto flex w-full items-center justify-between gap-4 border-t border-slate-200 px-4 py-5 text-xs text-slate-400 ${width}`}>
        <PoweredBy className="text-slate-500" always />
        <Link to="/admin" className="hover:text-slate-600">Church admin</Link>
      </footer>
    </div>
  )
}
