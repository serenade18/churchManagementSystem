/**
 * Demo mode: the whole admin app running on sample data built here, in the browser.
 *
 * A super admin switches demo mode on (System page); the sign-in page then offers "Explore the demo".
 * While a visitor is in the demo, every admin API request is answered from this file instead of the
 * server, so real members and giving are never read, and nothing can be changed (view only).
 */

import type { Channel, DonationStatus, Gender, MaritalStatus, MemberStatus, Params, ProjectStatus, SmsMessage, User } from '../types'

const FLAG = 'cms-demo'
export const DEMO_MESSAGE = 'This is a demo with sample data: you can look around, but changes are turned off.'

export const isDemo = () => {
  try { return localStorage.getItem(FLAG) === '1' } catch { return false }
}
export const startDemo = () => localStorage.setItem(FLAG, '1')
export const endDemo = () => localStorage.removeItem(FLAG)

// --- sample data --------------------------------------------------------------------------------

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST = {
  male: ['Brian', 'Kevin', 'Dennis', 'Samuel', 'Peter', 'John', 'David', 'James', 'Joseph', 'Daniel', 'Michael', 'Stephen', 'Paul', 'Moses', 'Collins', 'Victor'],
  female: ['Grace', 'Faith', 'Mercy', 'Esther', 'Joy', 'Ruth', 'Mary', 'Ann', 'Jane', 'Lucy', 'Purity', 'Caroline', 'Beatrice', 'Agnes', 'Naomi', 'Winnie'],
}
const LAST = ['Kamau', 'Wanjiru', 'Otieno', 'Achieng', 'Mwangi', 'Njeri', 'Kiprotich', 'Chebet', 'Mutua', 'Mwende', 'Omondi', 'Atieno', 'Kariuki', 'Wambui', 'Kiplagat', 'Odhiambo', 'Nyambura', 'Maina', 'Wekesa']
const DAY = 86400000
const iso = (d: number | Date) => new Date(d).toISOString()
const ymd = (d: number | Date) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const amt = (n: number) => Number(n).toFixed(2)

// The sample records, kept close to the database rows; the *Json functions below shape them like the API.
interface DemoBranch {
  id: number; name: string; code: string; location: string; leader_name: string
  phone_number: string; email: string; is_active: boolean; created_at: string; updated_at: string
}
interface DemoProject {
  id: number; name: string; description: string; target_amount: number; status: ProjectStatus; branch: number | null
  start: number; start_date: string; end_date: string | null; created_at: string; updated_at: string
}
interface DemoType {
  id: number; code: string; name: string; project: number | null; branch: null; is_active: boolean
  is_default: boolean; show_on_give: boolean; created_at: string; updated_at: string
}
interface DemoMember {
  id: number; membership_number: string; first_name: string; last_name: string; other_names: string; full_name: string
  gender: Gender; date_of_birth: string; phone_number: string; email: string; national_id: string; address: string
  marital_status: MaritalStatus; branch: number; status: MemberStatus; date_joined: string; is_baptized: boolean
  is_confirmed: boolean; notes: string; created_at: string; updated_at: string
}
interface DemoDonation {
  id: number; at: number; type: DemoType; member: DemoMember | null; channel: Channel; status: DonationStatus
  receipt: string | null; amount: number; phone: string; reference: string; branch: number | null; project: number | null
  unallocated: boolean; account?: string; payer?: string
}
interface DemoPaybill {
  id: number; donation: DemoDonation; trans_id: string | null; trans_time: string; amount: number; account: string
  payer_name: string; status: 'allocated' | 'unallocated'; reason: string
}
interface DemoService {
  id: number; name: string; service_type: string; date: string; start_time: string; branch: number | null
  visitor_count: number; present: number[]
}
type DemoSms = SmsMessage & { to: DemoMember[] }
interface Db {
  now: number; branches: DemoBranch[]; projects: DemoProject[]; types: DemoType[]; members: DemoMember[]
  donations: DemoDonation[]; paybill: DemoPaybill[]; services: DemoService[]; sms: DemoSms[]
}
/** Query parameters as the routes see them: non-empty, as strings. */
type Query = Record<string, string>

let DB: Db | null = null

function build(): Db {
  const r = rng(2026)
  const pick = <T>(list: readonly T[]): T => list[Math.floor(r() * list.length)]
  const weighted = <T>(pairs: [T, number][]): T => { let x = r() * pairs.reduce((s, p) => s + p[1], 0); for (const [v, w] of pairs) { if ((x -= w) < 0) return v } return pairs[0][0] }
  const now = Date.now()
  const created = iso(now - 400 * DAY)

  const branches: DemoBranch[] = [
    { id: 1, name: 'Central', code: 'CEN', location: 'Town centre', leader_name: 'Rev. Kamau' },
    { id: 2, name: 'Eastlands', code: 'EST', location: 'Umoja', leader_name: 'Rev. Otieno' },
    { id: 3, name: 'Hillside', code: 'HIL', location: 'Kiambu Road', leader_name: 'Rev. Mwangi' },
  ].map((b) => ({ ...b, phone_number: '', email: '', is_active: true, created_at: created, updated_at: created }))

  const projects: DemoProject[] = ([
    { id: 1, name: 'Sanctuary Construction', description: 'New main sanctuary seating 1,200.', target_amount: 5000000, status: 'ongoing', branch: 1, start: 300 },
    { id: 2, name: 'Youth Centre', description: 'Library, computer lab and hall for the youth.', target_amount: 1200000, status: 'ongoing', branch: null, start: 240 },
    { id: 3, name: 'Community Borehole', description: 'Clean water for the neighbourhood.', target_amount: 650000, status: 'completed', branch: null, start: 360 },
  ] satisfies Omit<DemoProject, 'start_date' | 'end_date' | 'created_at' | 'updated_at'>[]).map((p) => ({ ...p, start_date: ymd(now - p.start * DAY), end_date: p.status === 'completed' ? ymd(now - 40 * DAY) : null, created_at: created, updated_at: created }))

  const types: DemoType[] = ([
    [1, 'GEN', 'General Offering', null, true], [2, 'TTH', 'Tithe & First Fruit', null, false], [3, 'DEV', 'Development', null, false],
    [4, 'THX', 'Thanksgiving', null, false], [5, 'GRP', 'Group Account', null, false], [6, 'PRJ', 'Project', null, false],
    [7, 'OTH', 'Other', null, false], [8, 'BLD', 'Sanctuary Building Fund', 1, false], [9, 'YTH', 'Youth Centre Fund', 2, false],
  ] as [number, string, string, number | null, boolean][]).map(([id, code, name, project, isDefault]) => ({
    id, code, name, project, branch: null, is_active: true, is_default: isDefault, show_on_give: code !== 'OTH',
    created_at: created, updated_at: created,
  }))

  const members: DemoMember[] = Array.from({ length: 64 }, (_, i) => {
    const gender: Gender = r() < 0.5 ? 'male' : 'female'
    const joined = now - Math.floor(30 + r() * 3000) * DAY
    return {
      id: i + 1, membership_number: `M${String(i + 1).padStart(4, '0')}`,
      first_name: pick(FIRST[gender]), last_name: pick(LAST), other_names: '', full_name: '', gender,
      date_of_birth: ymd(new Date(1958 + Math.floor(r() * 48), Math.floor(r() * 12), 1 + Math.floor(r() * 27))),
      phone_number: `07${String(10000000 + Math.floor(r() * 89999999))}`, email: '', national_id: '', address: '',
      marital_status: weighted<MaritalStatus>([['single', 3], ['married', 6], ['widowed', 1]]),
      branch: 1 + Math.floor(r() * 3), status: weighted<MemberStatus>([['active', 90], ['inactive', 7], ['transferred', 3]]),
      date_joined: ymd(joined), is_baptized: r() < 0.8, is_confirmed: r() < 0.6, notes: '',
      created_at: iso(joined), updated_at: iso(joined),
    }
  })
  members.forEach((m) => { m.full_name = `${m.first_name} ${m.last_name}` })
  // A few people joined this month.
  members.slice(-4).forEach((m, i) => { const d = now - (i + 2) * DAY; m.date_joined = ymd(d); m.created_at = iso(d) })
  const active = members.filter((m) => m.status === 'active')

  const ref = () => `S${'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(r() * 24)]}${Array.from({ length: 8 }, () => '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(r() * 34)]).join('')}`
  const donations: DemoDonation[] = []
  const paybill: DemoPaybill[] = []
  for (let n = 0; n < 430; n++) {
    const days = r() < 0.75 ? r() * 364 : Math.min(364, -Math.log(1 - r() * 0.98) * 60) // steady, a bit more recently
    const at = now - days * DAY - Math.floor(r() * 10) * 3600000
    const typeId = weighted([[2, 30], [1, 30], [4, 10], [3, 8], [8, 14], [9, 8]])
    const type = types.find((t) => t.id === typeId)!
    const member = r() < 0.85 ? pick(active) : null
    const channel = weighted<Channel>([['mpesa', 30], ['paybill', 40], ['cash', 22], ['bank', 8]])
    const status: DonationStatus = channel === 'mpesa' && r() < 0.04 ? pick(['pending', 'failed'] as const) : 'success'
    const receipt = ['mpesa', 'paybill'].includes(channel) && status === 'success' ? ref() : null
    donations.push({
      id: 0, at, type, member, channel, status, receipt,
      amount: pick([100, 200, 250, 500, 500, 1000, 1000, 1500, 2000, 3000, 5000, 10000]),
      phone: member ? member.phone_number : `07${String(20000000 + Math.floor(r() * 79999999))}`,
      reference: channel === 'cash' ? `RB-${1000 + n}` : channel === 'bank' ? `BNK${20000 + n}` : receipt || '',
      branch: member ? member.branch : type.project ? projects[type.project - 1].branch : null,
      project: type.project, unallocated: false,
    })
  }
  // Paybill payments still waiting for an admin.
  for (const [i, account] of ['OFFERING', 'HARAMBEE', '0711BLD'].entries()) {
    donations.push({
      id: 0, at: now - (i + 1) * DAY + 3 * 3600000, type: types[0], member: null, channel: 'paybill', status: 'success',
      receipt: ref(), amount: pick([300, 1000, 2500]), phone: '', reference: '', branch: null, project: null,
      unallocated: true, account, payer: pick(['JOHN DOE', 'MARY W', 'PETER K']),
    })
  }
  donations.sort((a, b) => a.at - b.at).forEach((d, i) => { d.id = i + 1; if (!d.reference) d.reference = d.receipt || '' })
  donations.filter((d) => d.channel === 'paybill').forEach((d, i) => {
    paybill.push({
      id: i + 1, donation: d, trans_id: d.receipt, trans_time: iso(d.at), amount: d.amount,
      account: d.account || `${d.phone}${d.type.code}`, payer_name: d.payer || (d.member ? d.member.full_name.toUpperCase() : 'WELL WISHER'),
      status: d.unallocated ? 'unallocated' : 'allocated',
      reason: d.unallocated ? `Unrecognised code "${d.account}".` : '',
    })
  })

  // Weekly Sunday services in each branch, and a midweek prayer every other week.
  const services: DemoService[] = []
  // A few members who have stopped coming, so follow-up has someone to show.
  const lapsed = new Set(active.filter((_, i) => i % 9 === 4).map((m) => m.id))
  const lastSunday = new Date(now - new Date(now).getDay() * DAY); lastSunday.setHours(9, 0, 0, 0)
  let sid = 0
  for (let w = 11; w >= 0; w--) {
    const day = lastSunday.getTime() - w * 7 * DAY
    for (const b of branches) {
      const present = active.filter((m) => m.branch === b.id && r() < 0.74 && !(lapsed.has(m.id) && w < 7)).map((m) => m.id)
      services.push({ id: ++sid, name: 'Sunday Service', service_type: 'sunday_service', date: ymd(day), start_time: '09:00:00', branch: b.id, visitor_count: 3 + Math.floor(r() * 12), present })
    }
    if (w % 2 === 0) {
      services.push({ id: ++sid, name: 'Midweek Prayer', service_type: 'prayer', date: ymd(day - 4 * DAY), start_time: '18:00:00', branch: null, visitor_count: Math.floor(r() * 5), present: active.filter(() => r() < 0.2).map((m) => m.id) })
    }
  }

  services.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)

  const sms: DemoSms[] = ([
    [2, 'Reminder: Harambee for the Sanctuary this Sunday after the 2nd service. All welcome!', 'All active members'],
    [9, 'Youth camp registration closes Friday. See the youth office.', 'Eastlands branch'],
    [30, 'Thank you for your faithful giving this month. God bless you.', 'All active members'],
  ] as [number, string, string][]).map(([days, message, label], i) => {
    const to = label.startsWith('Eastlands') ? active.filter((m) => m.branch === 2) : active
    return { id: i + 1, message, audience: {}, audience_label: label, status: 'sent' as const, recipient_count: to.length, sent_count: to.length, failed_count: 0, skipped_count: 0, sent_by_name: 'treasurer', created_at: iso(now - days * DAY), to }
  })

  DB = { now, branches, projects, types, members, donations, paybill, services, sms }
  return DB
}

const db = () => DB || build()

// --- API shapes (mirror the real API) -----------------------------------------------------------

const branchName = (id: number | null) => db().branches.find((b) => b.id === id)?.name || null
const projectName = (id: number | null) => db().projects.find((p) => p.id === id)?.name || null

function donationJson(d: DemoDonation) {
  const m = d.member
  return {
    id: d.id, membership_number: m?.membership_number || '', phone_number: d.phone, giver_name: '', email: '',
    donation_type: d.type.id, donation_type_name: d.type.name, donation_type_code: d.type.code,
    amount: amt(d.amount), currency: 'KES', amount_original: null, channel: d.channel, status: d.status,
    reference: d.reference, receipt: d.receipt || d.reference || null, notes: d.unallocated ? `Paybill account: ${d.account}` : '',
    member: m?.id || null, member_name: m?.full_name || null, branch: d.branch, branch_name: branchName(d.branch),
    project: d.project, project_name: projectName(d.project),
    payment: d.channel === 'mpesa' ? {
      id: d.id, checkout_request_id: `ws_CO_${d.id}`, phone_number: d.phone, amount: amt(d.amount), status: d.status,
      result_code: d.status === 'failed' ? '1032' : null, result_description: d.status === 'failed' ? 'Request cancelled by user' : null,
      receipt: d.receipt, transaction_date: d.status === 'success' ? iso(d.at) : null, created_at: iso(d.at), updated_at: iso(d.at),
    } : null,
    recorded_by_name: ['cash', 'bank'].includes(d.channel) ? 'treasurer' : null,
    receipt_sms_status: d.status === 'success' && !d.unallocated ? 'sent' : '', receipt_sms_error: '',
    receipt_sms_at: d.status === 'success' && !d.unallocated ? iso(d.at) : null,
    unallocated: d.unallocated, created_at: iso(d.at), updated_at: iso(d.at),
  }
}

const success = () => db().donations.filter((d) => d.status === 'success')
const sum = (list: { amount: number }[]) => list.reduce((s, d) => s + d.amount, 0)

function memberJson(m: DemoMember) {
  return { ...m, branch_name: branchName(m.branch), total_given: amt(sum(success().filter((d) => d.member === m))) }
}

function serviceJson(s: DemoService) {
  return {
    id: s.id, name: s.name, service_type: s.service_type, date: s.date, start_time: s.start_time, branch: s.branch,
    branch_name: branchName(s.branch), visitor_count: s.visitor_count, notes: '', members_present: s.present.length,
    total_attendance: s.present.length + s.visitor_count, created_by_name: 'secretary', created_at: `${s.date}T12:00:00Z`, updated_at: `${s.date}T12:00:00Z`,
  }
}

function typeJson(t: DemoType) {
  const given = success().filter((d) => d.type === t)
  return {
    ...t, project_name: projectName(t.project), branch_name: null, total_given: amt(sum(given)),
    donation_count: db().donations.filter((d) => d.type === t).length,
    payment_count: db().paybill.filter((p) => p.donation.type === t).length,
  }
}

function paybillJson(p: DemoPaybill) {
  const d = p.donation
  return {
    id: p.id, trans_id: p.trans_id, trans_time: p.trans_time, amount: amt(p.amount), account: p.account, payer_name: p.payer_name,
    msisdn: '2547*****' + d.phone.slice(-3), parsed_phone: d.unallocated ? '' : `254${d.phone.slice(1)}`, source: 'callback',
    parsed_code: d.unallocated ? null : d.type.id, parsed_code_label: d.unallocated ? null : d.type.code,
    parsed_member: d.member?.id || null, parsed_member_name: d.member?.full_name || null,
    phone_check: d.unallocated ? '' : 'match', status: p.status, reason: p.reason, donation: d.id,
    donation_summary: { id: d.id, member_name: d.member?.full_name || null, donation_type: d.type.id, donation_type_name: d.type.name, project_name: projectName(d.project), receipt_sms_status: d.unallocated ? '' : 'sent' },
    allocated_by_name: null, allocated_at: d.unallocated ? null : p.trans_time, created_at: p.trans_time,
  }
}

function page<T>(list: T[], params: Query, size = 20) {
  const pageSize = Number(params.page_size) || size
  const n = Math.max(1, Number(params.page) || 1)
  const results = list.slice((n - 1) * pageSize, n * pageSize)
  return { count: list.length, next: n * pageSize < list.length ? 'next' : null, previous: n > 1 ? 'previous' : null, results }
}

const matches = (query: string | undefined, ...fields: (string | null | undefined)[]) => {
  const q = String(query || '').trim().toLowerCase()
  return !q || fields.some((f) => String(f || '').toLowerCase().includes(q))
}

function filterDonations(params: Query) {
  const from = params.date_from ? new Date(`${params.date_from}T00:00:00`).getTime() : null
  const to = params.date_to ? new Date(`${params.date_to}T23:59:59`).getTime() : null
  return db().donations.filter((d) =>
    (!params.status || d.status === params.status)
    && (!params.channel || d.channel === params.channel)
    && (!params.donation_type || d.type.id === Number(params.donation_type))
    && (!params.branch || d.branch === Number(params.branch))
    && (!params.project || d.project === Number(params.project))
    && (!params.member || d.member?.id === Number(params.member))
    && (params.allocation !== 'unallocated' || d.unallocated)
    && (from === null || d.at >= from) && (to === null || d.at <= to)
    && matches(params.search, d.member?.full_name, d.member?.membership_number, d.phone, d.reference, d.receipt))
}

function groupTotals<K, L extends object>(list: DemoDonation[], key: (d: DemoDonation) => K, label: (d: DemoDonation) => L) {
  const groups = new Map<K, L & { total: number; count: number }>()
  list.forEach((d) => {
    const k = key(d)
    const g = groups.get(k) || { ...label(d), total: 0, count: 0 }
    g.total += d.amount; g.count += 1; groups.set(k, g)
  })
  return [...groups.values()].sort((a, b) => b.total - a.total).map((g) => ({ ...g, total: amt(g.total) }))
}

// The organisation's real name and branding (public), so the demo looks like their app.
const context: { name: string; branding: object } = { name: 'Demo Church', branding: {} }
export const setDemoContext = (name: string, branding?: object) => { context.name = name; context.branding = branding || {} }

function church() {
  return { name: context.name, address: 'P.O. Box 1234 - 00100, Nairobi', phone: '0700 000 000', email: 'office@example.org', paybill: '123456' }
}

const UNITS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
function words(n: number): string {
  if (n < 20) return UNITS[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${UNITS[n % 10]}` : '')
  if (n < 1000) return `${UNITS[Math.floor(n / 100)]} Hundred${n % 100 ? ` and ${words(n % 100)}` : ''}`
  for (const [size, name] of [[1e6, 'Million'], [1e3, 'Thousand']] as const) {
    if (n >= size) return `${words(Math.floor(n / size))} ${name}${n % size ? ` ${words(n % size)}` : ''}`
  }
  return ''
}
const inWords = (n: number) => `${words(Math.round(n)) || 'Zero'} Shillings Only`
const CHANNEL: Record<Channel, string> = { mpesa: 'M-PESA', paybill: 'M-PESA Paybill', cash: 'Cash', bank: 'Bank', cheque: 'Cheque', paypal: 'PayPal' }

function dashboard() {
  const { now, members, branches, projects, services } = db()
  const ok = success()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime()
  const yearStart = new Date(today.getFullYear(), 0, 1).getTime()
  const since = (t: number) => ok.filter((d) => d.at >= t)
  const trend = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1)
    const end = new Date(today.getFullYear(), today.getMonth() - 10 + i, 1)
    return { month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`, total: amt(sum(ok.filter((d) => d.at >= start.getTime() && d.at < end.getTime()))) }
  })
  const last = [...services].reverse().find((s) => s.branch)
  const unallocated = db().donations.filter((d) => d.unallocated)
  return {
    unallocated_payments: unallocated.length,
    unallocated_amount: amt(sum(unallocated)),
    last_service: last && { id: last.id, name: last.name, date: last.date, branch_name: branchName(last.branch), members_present: last.present.length, visitors: last.visitor_count, total: last.present.length + last.visitor_count },
    members: { total: members.length, active: members.filter((m) => m.status === 'active').length, new_this_month: members.filter((m) => new Date(m.created_at).getTime() >= monthStart).length },
    branches: { total: branches.length, active: branches.length },
    projects: { total: projects.length, ongoing: projects.filter((p) => p.status === 'ongoing').length },
    donations: {
      today: amt(sum(since(today.getTime()))), this_month: amt(sum(since(monthStart))), this_year: amt(sum(since(yearStart))),
      all_time: amt(sum(ok)), pending: db().donations.filter((d) => d.status === 'pending').length,
    },
    trend,
    by_type: groupTotals(since(yearStart), (d) => d.type.id, (d) => ({ donation_type: d.type.id, name: d.type.name })).map(({ count, ...t }) => t),
    top_branches: branches.map((b) => ({ id: b.id, name: b.name, total: sum(since(yearStart).filter((d) => d.branch === b.id)), member_count: members.filter((m) => m.branch === b.id).length }))
      .sort((a, b) => b.total - a.total).map((b) => ({ ...b, total: amt(b.total) })),
    recent_donations: [...db().donations].reverse().slice(0, 8).map(donationJson),
    active_projects: projects.filter((p) => p.status !== 'completed').map((p) => ({ id: p.id, name: p.name, target_amount: amt(p.target_amount), amount_raised: amt(sum(ok.filter((d) => d.project === p.id))), status: p.status })),
  }
}

function attendanceStats(params: Query) {
  const { now, services, members } = db()
  const weeks = Number(params.weeks) || 4
  const branch = params.branch ? Number(params.branch) : null
  const list = services.filter((s) => !branch || s.branch === branch)
  const byDate = new Map<string, { date: string; services: number; members_present: number; visitors: number; name: string; total: number }>()
  list.forEach((s) => {
    const g = byDate.get(s.date) || { date: s.date, services: 0, members_present: 0, visitors: 0, name: s.name, total: 0 }
    g.services += 1; g.members_present += s.present.length; g.visitors += s.visitor_count; g.total += s.present.length + s.visitor_count
    byDate.set(s.date, g)
  })
  const trend = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  const sundays = trend.filter((t) => t.name === 'Sunday Service')
  const cutoff = ymd(now - weeks * 7 * DAY)
  const lastSeen = (m: DemoMember) => list.filter((s) => s.present.includes(m.id)).map((s) => s.date).sort().pop() || null
  const absent = members.filter((m) => m.status === 'active' && (!branch || m.branch === branch))
    .map((m) => ({ m, last: lastSeen(m) })).filter(({ last }) => !last || last < cutoff)
  const last = list[list.length - 1]
  const monthStart = ymd(new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1))
  return {
    trend,
    average_attendance: sundays.length ? Math.round(sundays.reduce((s, t) => s + t.total, 0) / sundays.length) : 0,
    last_service: last && { id: last.id, name: last.name, date: last.date, branch_name: branchName(last.branch), total: last.present.length + last.visitor_count },
    services_this_month: list.filter((s) => s.date >= monthStart).length,
    follow_up_weeks: weeks,
    follow_up_count: absent.length,
    follow_up: absent.map(({ m, last: l }) => ({ id: m.id, full_name: m.full_name, membership_number: m.membership_number, phone_number: m.phone_number, branch_name: branchName(m.branch), last_attended: l })),
  }
}

function statement(member: DemoMember, params: Query) {
  const today = new Date(db().now)
  const from = params.date_from || `${today.getFullYear()}-01-01`
  const to = params.date_to || ymd(today)
  const gifts = success().filter((d) => d.member === member && ymd(d.at) >= from && ymd(d.at) <= to)
  const total = sum(gifts)
  return {
    church: church(),
    member: { full_name: member.full_name, membership_number: member.membership_number, phone_number: member.phone_number, branch: branchName(member.branch) },
    date_from: from, date_to: to, printed_at: iso(Date.now()),
    donations: gifts.map((d) => ({ receipt_number: `RCT-${new Date(d.at).getFullYear()}-${String(d.id).padStart(6, '0')}`, date: iso(d.at), description: d.type.name + (d.project ? ` - ${projectName(d.project)}` : ''), channel: CHANNEL[d.channel], reference: d.receipt || d.reference || null, amount: amt(d.amount) })),
    by_type: groupTotals(gifts, (d) => (d.project ? projectName(d.project) : d.type.name), (d) => ({ label: d.project ? projectName(d.project) : d.type.name })).map(({ count, ...g }) => g),
    total: amt(total), total_in_words: inWords(total),
  }
}

function receipt(d: DemoDonation) {
  return {
    church: church(), receipt_number: `RCT-${new Date(d.at).getFullYear()}-${String(d.id).padStart(6, '0')}`,
    date: iso(d.at), printed_at: iso(Date.now()), received_from: d.member?.full_name || 'Well-wisher',
    membership_number: d.member?.membership_number || null, phone_number: d.phone, branch: branchName(d.branch),
    donation_type: d.type.name, project: projectName(d.project), amount: amt(d.amount), amount_in_words: inWords(d.amount),
    paid_amount: null, paid_currency: null, channel: CHANNEL[d.channel], reference: d.receipt || d.reference || null, notes: '',
    recorded_by: ['cash', 'bank'].includes(d.channel) ? 'Treasurer' : null,
  }
}

function csv(rows: unknown[][]) {
  const text = rows.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  return new Response(text, { headers: { 'Content-Type': 'text/csv' } })
}

export const DEMO_USER: User = {
  id: 0, username: 'demo', email: '', first_name: 'Demo', last_name: 'Visitor', is_active: true, is_superuser: false,
  last_login: null, date_joined: null, status: 'active', phone_number: '', signed_up: false, view_only: true,
}

const ROUTES: [RegExp, (params: Query, ids: string[]) => unknown][] = [
  [/^\/auth\/me\/$/, () => DEMO_USER],
  [/^\/cms\/dashboard\/$/, dashboard],
  [/^\/cms\/members\/$/, (p) => page(db().members.filter((m) =>
    (!p.branch || m.branch === Number(p.branch)) && (!p.status || m.status === p.status) && (!p.gender || m.gender === p.gender)
    && matches(p.search, m.full_name, m.membership_number, m.phone_number))
    .sort((a, b) => a.first_name.localeCompare(b.first_name)).map(memberJson), p)],
  [/^\/cms\/members\/export\/$/, () => csv([['Membership No', 'Name', 'Phone', 'Branch', 'Status'],
    ...db().members.map((m) => [m.membership_number, m.full_name, m.phone_number, branchName(m.branch), m.status])])],
  [/^\/cms\/members\/(\d+)\/$/, (_p, [id]) => memberJson(findOr404(db().members, id))],
  [/^\/cms\/members\/(\d+)\/donations\/$/, (p, [id]) => page([...db().donations].reverse().filter((d) => d.member?.id === Number(id)).map(donationJson), p)],
  [/^\/cms\/members\/(\d+)\/attendance-summary\/$/, (_p, [id]) => {
    const m = findOr404(db().members, id)
    const cutoff = ymd(db().now - 90 * DAY)
    const relevant = db().services.filter((s) => s.date >= cutoff && (!s.branch || s.branch === m.branch))
    const attended = relevant.filter((s) => s.present.includes(m.id))
    return { services_last_90_days: relevant.length, attended_last_90_days: attended.length, rate: relevant.length ? Math.round(attended.length * 100 / relevant.length) : 0, last_attended: attended.map((s) => s.date).sort().pop() || null }
  }],
  [/^\/cms\/members\/(\d+)\/statement\/$/, (p, [id]) => statement(findOr404(db().members, id), p)],
  [/^\/cms\/donations\/$/, (p) => page([...filterDonations(p)].reverse().map(donationJson), p)],
  [/^\/cms\/donations\/summary\/$/, (p) => {
    const list = filterDonations(p).filter((d) => d.status === 'success')
    const un = list.filter((d) => d.unallocated)
    return {
      total: amt(sum(list)), count: list.length, unallocated: { total: amt(sum(un)), count: un.length },
      by_type: groupTotals(list, (d) => d.type.id, (d) => ({ donation_type: d.type.id, name: d.type.name })),
      by_channel: groupTotals(list, (d) => d.channel, (d) => ({ channel: d.channel })),
    }
  }],
  [/^\/cms\/donations\/export\/$/, (p) => csv([['Date', 'Member', 'Phone', 'Type', 'Amount (KES)', 'Channel', 'Status', 'Receipt / Ref'],
    ...[...filterDonations(p)].reverse().map((d) => [ymd(d.at), d.member?.full_name || '', d.phone, d.type.name, amt(d.amount), CHANNEL[d.channel], d.status, d.receipt || d.reference])])],
  [/^\/cms\/donations\/(\d+)\/$/, (_p, [id]) => donationJson(findOr404(db().donations, id))],
  [/^\/cms\/donations\/(\d+)\/receipt\/$/, (_p, [id]) => receipt(findOr404(db().donations, id))],
  [/^\/cms\/paybill-payments\/$/, (p) => page([...db().paybill].reverse()
    .filter((x) => (!p.status || x.status === p.status) && matches(p.search, x.trans_id, x.account, x.payer_name)).map(paybillJson), p)],
  [/^\/cms\/donation-codes\/$/, (p) => page([...db().types].sort((a, b) => a.name.localeCompare(b.name)).map(typeJson), p)],
  [/^\/cms\/branches\/$/, (p) => page(db().branches.map((b) => ({ ...b, member_count: db().members.filter((m) => m.branch === b.id).length, total_donations: amt(sum(success().filter((d) => d.branch === b.id))) })), p)],
  [/^\/cms\/projects\/$/, (p) => page(db().projects.filter((x) => !p.status || x.status === p.status).map(({ start, ...x }) => {
    const given = success().filter((d) => d.project === x.id)
    return { ...x, branch_name: branchName(x.branch), target_amount: amt(x.target_amount), amount_raised: amt(sum(given)), donation_count: given.length }
  }), p)],
  [/^\/cms\/services\/$/, (p) => page([...db().services].reverse()
    .filter((s) => (!p.branch || s.branch === Number(p.branch)) && (!p.service_type || s.service_type === p.service_type)).map(serviceJson), p)],
  [/^\/cms\/services\/(\d+)\/$/, (_p, [id]) => serviceJson(findOr404(db().services, id))],
  [/^\/cms\/services\/(\d+)\/roster\/$/, (p, [id]) => {
    const s = findOr404(db().services, id)
    return db().members.filter((m) => s.present.includes(m.id) || (p.all === 'true' ? true : m.status === 'active' && (!s.branch || m.branch === s.branch)))
      .sort((a, b) => a.first_name.localeCompare(b.first_name))
      .map((m) => ({ id: m.id, membership_number: m.membership_number, full_name: m.full_name, phone_number: m.phone_number, branch_name: branchName(m.branch), status: m.status, present: s.present.includes(m.id) }))
  }],
  [/^\/cms\/services\/(\d+)\/export\/$/, (_p, [id]) => {
    const s = findOr404(db().services, id)
    return csv([['Membership No', 'Name', 'Phone', 'Present'], ...db().members.filter((m) => s.present.includes(m.id)).map((m) => [m.membership_number, m.full_name, m.phone_number, 'Yes'])])
  }],
  [/^\/cms\/attendance\/stats\/$/, attendanceStats],
  [/^\/cms\/sms\/$/, (p) => page(db().sms.map(({ to, ...s }) => s), p)],
  [/^\/cms\/sms\/(\d+)\/recipients\/$/, (p, [id]) => {
    const s = findOr404(db().sms, id)
    return page(s.to.filter(() => !p.status || p.status === 'sent').map((m, i) => ({ id: i + 1, member: m.id, name: m.full_name, phone_number: m.phone_number, text: s.message, status: 'sent', error: '' })), p)
  }],
  [/^\/cms\/reconciliation\/$/, () => [{
    id: 1, filename: 'MPESA_statement_last_week.csv', created_at: iso(db().now - 3 * DAY), run_by: 'treasurer',
    period_start: iso(db().now - 10 * DAY), period_end: iso(db().now - 3 * DAY), rows: 46, already_recorded: 44, imported: 2,
    linked: 0, needs_review: 0, amount_imported: '3500.00', synced: true, amounts_fixed: 0, marked_not_received: 0,
  }]],
  [/^\/cms\/users\/$/, (p) => page([], p)],
  [/^\/cms\/branding\/$/, () => ({ ...context.branding })],
]

function findOr404<T extends { id: number }>(list: T[], id: string | number): T {
  const found = list.find((x) => x.id === Number(id))
  if (!found) throw Object.assign(new Error('Not found.'), { status: 404 })
  return found
}

/** Answer an admin API request from the sample data. Returns data, or a Response for CSV downloads. */
export function demoRequest(path: string, { method = 'GET', params = {}, body }: { method?: string; params?: Params; body?: unknown } = {}): unknown {
  if (method === 'POST' && path === '/cms/sms/preview/') {
    const to = db().members.filter((m) => m.status === 'active')
    const text = String((body as { message?: string } | undefined)?.message || '')
    return { recipient_count: to.length, skipped_count: 0, audience_label: 'All active members', sample: to.slice(0, 3).map((m) => ({ name: m.full_name, phone_number: m.phone_number, text: text.replace(/\{first_name\}/g, m.first_name).replace(/\{name\}/g, m.full_name) })) }
  }
  if (method !== 'GET') throw Object.assign(new Error(DEMO_MESSAGE), { status: 403 })
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]))
  for (const [pattern, handler] of ROUTES) {
    const match = path.match(pattern)
    if (match) return handler(clean, match.slice(1))
  }
  return { count: 0, next: null, previous: null, results: [] }
}
