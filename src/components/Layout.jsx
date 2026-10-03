import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Building2, Eye, CalendarCheck, Gauge, FolderKanban, HandCoins, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, ShieldCheck, Smartphone, Tags, Users, X } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import Logo from './Logo'
import { branding } from '../lib/theme'

// Day-to-day church work; super admins only manage accounts and the system
const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/donations', label: 'Donations', icon: HandCoins },
  { to: '/paybill', label: 'Paybill', icon: Smartphone, badge: 'unallocated' },
  { to: '/donation-types', label: 'Donation Types', icon: Tags },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/branches', label: 'Branches', icon: Building2 },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/sms', label: 'Bulk SMS', icon: MessageSquare },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({ unallocated: 0 })
  const location = useLocation()

  // Badge: Paybill payments waiting to be allocated.
  useEffect(() => {
    const loadPaybill = () => api.get('/cms/paybill-payments/', { status: 'unallocated', page_size: 1 })
      .then((d) => setCounts((c) => ({ ...c, unallocated: d.count }))).catch(() => {})
    loadPaybill()
    window.addEventListener('cms:paybill-changed', loadPaybill)
    return () => window.removeEventListener('cms:paybill-changed', loadPaybill)
  }, [location.pathname])
  const nav = [
    ...(user?.is_superuser
      ? [{ to: '/super', label: 'System', icon: Gauge }, { to: '/users', label: 'Admin Users', icon: ShieldCheck }]
      : NAV),
    { to: '/settings', label: 'Settings', icon: Settings },
  ]

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-brand-100">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo tile className="h-12 w-12" />
        <div>
          <p className="font-semibold text-white">{branding.name}</p>
          <p className="text-xs text-brand-200">{branding.tagline}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-white/15 text-white' : 'hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon className="h-5 w-5" /> {label}
            {badge && counts[badge] > 0 && (
              <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950"
                title="Payments to allocate">{counts[badge]}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-white">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</p>
        <p className="mb-3 text-xs text-brand-200">{user?.is_superuser ? 'Super admin' : user?.view_only ? 'View only' : 'Admin'}</p>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10 hover:text-white">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64">{sidebar}</div>
          <button className="absolute left-66 top-4 text-white" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
          <Logo mark className="h-8" />
          <span className="font-semibold">{branding.name}</span>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {user?.view_only && (
            <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-slate-700">
              <Eye className="h-4 w-4 shrink-0 text-brand-700" />
              <span>
                {user.username === 'demo'
                  ? <><strong>Demo, view only.</strong> Look around freely: everything here is sample data, and changes are turned off.</>
                  : <><strong>View-only account.</strong> You can see everything, but changes are turned off.</>}
              </span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
