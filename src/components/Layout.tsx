import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { type LucideIcon, Building2, Church, CreditCard, Eye, Inbox, CalendarCheck, Gauge, FolderKanban, HandCoins, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, ShieldCheck, Smartphone, Tags, UserPlus, Users, X } from 'lucide-react'
import { api } from '../lib/api'
import { can, isOwner, roleLabel } from '../lib/access'
import { useAuth } from '../lib/auth'
import Logo from './Logo'
import { branding } from '../lib/theme'
import type { Feature, Page, PaybillPayment, Registration, User } from '../types'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: 'unallocated' | 'registrations'
  feature?: Feature
}

// The church's work; each shows to the roles that open it (the owner sees all of it).
const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard' },
  { to: '/members', label: 'Members', icon: Users, feature: 'members' },
  { to: '/registrations', label: 'Registrations', icon: UserPlus, badge: 'registrations', feature: 'registrations' },
  { to: '/donations', label: 'Donations', icon: HandCoins, feature: 'giving' },
  { to: '/paybill', label: 'Paybill', icon: Smartphone, badge: 'unallocated', feature: 'paybill' },
  { to: '/donation-types', label: 'Donation Types', icon: Tags, feature: 'donation_types' },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, feature: 'attendance' },
  { to: '/branches', label: 'Branches', icon: Building2, feature: 'branches' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, feature: 'projects' },
  { to: '/sms', label: 'Bulk SMS', icon: MessageSquare, feature: 'sms' },
]

/** Under the name in the sidebar: "Owner", or the roles held. */
function roleSummary(user: User | null) {
  if (branding.platform) return 'Platform admin'
  if (!user) return ''
  if (user.is_owner) return 'Owner'
  return user.roles?.length ? user.roles.map((r) => roleLabel(r.role)).join(' · ') : 'No role yet'
}

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({ unallocated: 0, registrations: 0 })
  const location = useLocation()

  // Badges: Paybill payments waiting to be allocated, sign-ups waiting for review; on the platform,
  // churches whose owner hasn't confirmed their phone yet.
  useEffect(() => {
    if (branding.platform) {
      const loadWaiting = () => api.get<{ stats: { waiting: number } }>('/platform/registrations/', { status: 'waiting' })
        .then((d) => setCounts((c) => ({ ...c, registrations: d.stats.waiting }))).catch(() => {})
      loadWaiting()
      window.addEventListener('platform:registrations-changed', loadWaiting)
      return () => window.removeEventListener('platform:registrations-changed', loadWaiting)
    }
    const loadPaybill = () => api.get<Page<PaybillPayment>>('/cms/paybill-payments/', { status: 'unallocated', page_size: 1 })
      .then((d) => setCounts((c) => ({ ...c, unallocated: d.count }))).catch(() => {})
    const loadRegistrations = () => api.get<Page<Registration>>('/cms/registrations/', { status: 'pending', page_size: 1 })
      .then((d) => setCounts((c) => ({ ...c, registrations: d.count }))).catch(() => {})
    if (can(user, 'paybill')) loadPaybill()
    if (can(user, 'registrations')) loadRegistrations()
    window.addEventListener('cms:paybill-changed', loadPaybill)
    window.addEventListener('cms:registrations-changed', loadRegistrations)
    return () => {
      window.removeEventListener('cms:paybill-changed', loadPaybill)
      window.removeEventListener('cms:registrations-changed', loadRegistrations)
    }
  }, [location.pathname, user])
  const platform = branding.platform
  const nav: NavItem[] = [
    ...(branding.platform
      ? [{ to: '/platform', label: 'Overview', icon: LayoutDashboard }, { to: '/platform/churches', label: 'Churches', icon: Church },
          { to: '/platform/registrations', label: 'Registrations', icon: Inbox, badge: 'registrations' as const },
          { to: '/platform/payments', label: 'Payments', icon: CreditCard }, { to: '/platform/sms', label: 'SMS', icon: MessageSquare },
          { to: '/users', label: 'Platform admins', icon: ShieldCheck }]
      : [
          ...NAV.filter((item) => !item.feature || can(user, item.feature)),
          ...(isOwner(user) ? [{ to: '/users', label: 'Staff & roles', icon: ShieldCheck }, { to: '/super', label: 'System', icon: Gauge }] : []),
        ]),
    { to: '/settings', label: 'Settings', icon: Settings },
  ]

  const sidebar = (
    <div className={`flex h-full flex-col ${platform ? 'bg-mk-midnight text-mk-ivory/75' : 'bg-sidebar text-brand-100'}`}>
      {platform ? (
        // mKanisa's own: the ivory wordmark and the gold Platform admin badge
        <div className="flex flex-col gap-3 px-6 pb-6 pt-7">
          <img src="/logo-ivory.png" alt="mKanisa" className="h-7 w-auto self-start" />
          <span className="self-start rounded-full border border-mk-gold/45 bg-mk-gold/12 px-2.5 py-1 text-xs font-semibold text-mk-amber">Platform admin</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo tile className="h-12 w-12" />
          <div>
            <p className="font-semibold text-white">{branding.name}</p>
            <p className="text-xs text-brand-200">{branding.tagline}</p>
          </div>
        </div>
      )}
      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/platform'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                ? (platform ? 'bg-mk-mint/15 font-semibold text-white [&>svg]:text-mk-mint' : 'bg-primary font-semibold text-on-primary')
                : 'hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon className="h-5 w-5" /> {label}
            {badge && counts[badge] > 0 && (
              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${platform ? 'bg-mk-gold text-mk-forest' : 'bg-danger text-white'}`}
                title={platform ? 'Churches waiting on their owner' : badge === 'unallocated' ? 'Payments to allocate' : 'Sign-ups to review'}>{counts[badge]}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-white">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</p>
        <p className="mb-3 text-xs text-brand-200">{roleSummary(user)}</p>
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
                  : <><strong>View only.</strong> Your role lets you look, but not change anything.</>}
              </span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
