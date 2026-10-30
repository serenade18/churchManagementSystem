import type { Feature, RoleKey, User } from '../types'
import { useAuth } from './auth'

/** The staff roles a church owner can give (mirrors apps/accounts/roles.py). */
export const ROLES: { key: RoleKey; label: string; description: string }[] = [
  { key: 'branch_admin', label: 'Branch admin', description: 'Runs their branches day to day: members, registrations, giving, attendance, projects and SMS.' },
  { key: 'treasurer', label: 'Treasurer / Finance', description: 'Giving, the Paybill inbox, matching payments, M-PESA reconciliation, donation types, statements, the wallet and payroll.' },
  { key: 'secretary', label: 'Secretary / Membership', description: 'Members, approving registrations, attendance, and departments and groups.' },
  { key: 'communications', label: 'Communications', description: 'Sends SMS to members.' },
  { key: 'pastor', label: 'Pastor', description: 'Sees members, attendance, registrations and giving; looks after prayer requests.' },
  { key: 'team_lead', label: 'Team lead', description: 'Leads departments or groups: manages the members of the ones they are assigned to.' },
  { key: 'viewer', label: 'Viewer', description: 'Can look at everything but change nothing.' },
]
export const roleLabel = (key: string) => ROLES.find((r) => r.key === key)?.label || key

/** Everything in the church: the church owner and platform admins. */
export const isOwner = (user: User | null) => Boolean(user && (user.is_owner || user.is_platform_admin))

/** Whether the signed-in user may see (or, with ``write``, change) a part of the app. */
export function can(user: User | null, feature: Feature, write = false) {
  if (!user) return false
  if (isOwner(user)) return true
  const access = user.access?.[feature]
  return Boolean(access && (!write || access.write))
}

/** The pages of the admin app and the feature each needs, in menu order. */
export const PAGE_FEATURES: [string, Feature][] = [
  ['/dashboard', 'dashboard'], ['/members', 'members'], ['/registrations', 'registrations'], ['/donations', 'giving'],
  ['/paybill', 'paybill'], ['/donation-types', 'donation_types'], ['/attendance', 'attendance'], ['/branches', 'branches'],
  ['/projects', 'projects'], ['/sms', 'sms'], ['/payments', 'wallet'], ['/groups', 'groups'], ['/prayer-requests', 'prayer'],
]

/** Where a church admin lands: the first page their roles open, or the "no access yet" page. */
export function firstPage(user: User | null) {
  if (isOwner(user)) return '/dashboard'
  return PAGE_FEATURES.find(([, feature]) => can(user, feature))?.[0] || (leadsGroups(user) ? '/groups' : '/no-access')
}

/** Departments and groups: roles that run them, and team leads (their own groups only). */
export const leadsGroups = (user: User | null) => Boolean(user?.led_groups)
export const seesGroups = (user: User | null) => can(user, 'groups') || leadsGroups(user)

/** ``can`` for the signed-in user, inside components. */
export function useCan() {
  const { user } = useAuth()
  return (feature: Feature, write = false) => can(user, feature, write)
}
