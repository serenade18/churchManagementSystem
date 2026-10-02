import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Building2, Church, FolderKanban, HandCoins, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, ShieldCheck, Users, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { CHURCH_NAME } from '../lib/format'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/donations', label: 'Donations', icon: HandCoins },
  { to: '/branches', label: 'Branches', icon: Building2 },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/sms', label: 'Bulk SMS', icon: MessageSquare },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const nav = [...NAV, ...(user?.is_superuser ? [{ to: '/users', label: 'Admin Users', icon: ShieldCheck }] : []), { to: '/settings', label: 'Settings', icon: Settings }]

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-900 text-brand-100">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="rounded-lg bg-white/10 p-2"><Church className="h-6 w-6 text-white" /></span>
        <div>
          <p className="font-semibold text-white">{CHURCH_NAME}</p>
          <p className="text-xs text-brand-200">Church Management</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-white/15 text-white' : 'hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon className="h-5 w-5" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-white">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</p>
        <p className="mb-3 text-xs text-brand-200">{user?.is_superuser ? 'Super admin' : 'Admin'}</p>
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
          <span className="font-semibold">{CHURCH_NAME}</span>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
