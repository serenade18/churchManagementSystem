/**
 * Shapes of the Django API's JSON (pceaBackend), as the app reads them. Money comes back as decimal
 * strings ("1500.00"); dates as ISO strings.
 */

export type Id = number
/** A decimal amount as the API sends it, e.g. "1500.00". */
export type Amount = string

export interface Page<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Query-string values; empty ones are dropped before sending. */
export type Params = Record<string, string | number | boolean | null | undefined>

export type Tone = 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'

// --- accounts -----------------------------------------------------------------------------------

export type AccountStatus = 'active' | 'disabled' | 'unverified'

export type Feature = 'dashboard' | 'members' | 'registrations' | 'giving' | 'paybill' | 'reconciliation'
  | 'donation_types' | 'projects' | 'attendance' | 'sms' | 'branches'
export type RoleKey = 'branch_admin' | 'treasurer' | 'secretary' | 'communications' | 'pastor' | 'viewer'
export interface RoleAssignment {
  role: RoleKey
  /** Empty: the whole church. */
  branches: Id[]
}
export interface FeatureAccess {
  write: boolean
  /** null: the whole church. */
  branches: Id[] | null
}

export interface User {
  id: Id
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_superuser: boolean
  last_login: string | null
  date_joined: string | null
  status: AccountStatus
  phone_number: string
  signed_up: boolean
  /** Staff roles, each for the whole church (no branches) or for chosen branches. */
  roles: RoleAssignment[]
  /** Only from /auth/me: no role lets this account change anything. */
  view_only?: boolean
  /** Only from /auth/me: the church owner (can do everything, manages staff). */
  is_owner?: boolean
  /** Only from /auth/me: what this account may see and change. */
  access?: Partial<Record<Feature, FeatureAccess>>
  /** The church this admin works for; null for platform admins. */
  church?: ChurchRef | null
  is_platform_admin?: boolean
}

export interface Tokens {
  access?: string
  refresh?: string
}

// --- organisation -------------------------------------------------------------------------------

export interface Branch {
  id: Id
  name: string
  code: string
  location: string
  leader_name: string
  phone_number: string
  email: string
  is_active: boolean
  member_count?: number
  total_donations?: Amount
  created_at: string
  updated_at: string
}

export type ProjectStatus = 'planned' | 'ongoing' | 'on_hold' | 'completed'

export interface Project {
  id: Id
  name: string
  description: string
  target_amount: Amount
  amount_raised?: Amount
  donation_count?: number
  status: ProjectStatus
  branch: Id | null
  branch_name?: string | null
  start_date: string | null
  end_date: string | null
  /** Listed on the public home and give pages while planned or ongoing. */
  show_on_site: boolean
  image_url: string | null
  created_at: string
  updated_at: string
}

/** The church's public home page (Settings > Public home page). */
export interface PublicPage {
  about?: string
  location?: string
  contact_phone?: string
  contact_email?: string
  website?: string
  service_times?: string
  facebook_url?: string
  youtube_url?: string
  instagram_url?: string
}

export interface Branding extends PublicPage {
  name?: string
  custom_name?: string
  tagline?: string
  primary_color?: string
  sidebar_color?: string
  logo_url?: string | null
  logo_mark_url?: string | null
  cover_url?: string | null
  version?: number
  demo_enabled?: boolean
  /** True on the platform's own address (mkanisa.com): no church, just mKanisa. */
  platform?: boolean
  /** The church this address serves. */
  church?: ChurchRef | null
  /** The church's Paybill number (its own, else the platform's). */
  paybill?: string
  /** Platform only: who to contact about bringing a church on. */
  contact_email?: string
}

export interface ChurchRef {
  id: Id
  name: string
  slug: string
  url: string
}

/** A church as platform admins manage it (secrets are write-only). */
export interface PlatformChurch extends ChurchRef {
  custom_domain: string | null
  domain: string
  is_active: boolean
  is_listed: boolean
  mpesa_shortcode: string
  mpesa_shortcode_type: 'Paybill' | 'Till'
  has_own_mpesa: boolean
  sasapay_merchant_code: string
  admin_count: number
  member_count: number
  created_at: string
}

/** A church in the public directory on the platform's home page. */
export interface DirectoryChurch {
  name: string
  slug: string
  url: string
  location: string
  logo_mark_url: string | null
}

export interface Church {
  name: string
  address?: string
  phone?: string
  email?: string
  paybill?: string
}

// --- members ------------------------------------------------------------------------------------

export type MemberStatus = 'active' | 'inactive' | 'transferred' | 'deceased' | 'visitor'
export type Gender = 'male' | 'female'
export type MaritalStatus = 'single' | 'married' | 'widowed' | 'divorced'

export interface Member {
  id: Id
  membership_number: string
  first_name: string
  last_name: string
  other_names: string
  full_name: string
  gender: Gender | ''
  date_of_birth: string | null
  phone_number: string
  email: string
  national_id: string
  address: string
  marital_status: MaritalStatus | ''
  branch: Id | null
  branch_name: string | null
  status: MemberStatus
  date_joined: string | null
  is_baptized: boolean
  is_confirmed: boolean
  notes: string
  total_given: Amount
  given_this_year?: Amount | null
  last_gift_at?: string | null
  last_attended?: string | null
  created_at: string
  updated_at: string
}

export interface MemberSummary { total: number; active: number; new_this_month: number; gave_this_month: number | null; away: number; no_phone: number }

/** The fields a member picker needs; a full Member fits too. */
export interface MemberRef {
  id: Id
  full_name: string | null
  membership_number: string
  branch?: Id | null
  branch_name?: string | null
}

// --- self-registration (/register) ---------------------------------------------------------------

export type RegistrationKind = 'member' | 'visitor'
export type RegistrationStatus = 'pending' | 'approved' | 'rejected'

/** An existing member a sign-up may already be. */
export interface PossibleMatch {
  id: Id
  full_name: string
  membership_number: string
  phone_number: string
  branch: string | null
  reason: string
}

export interface Registration {
  id: Id
  kind: RegistrationKind
  first_name: string
  last_name: string
  other_names: string
  full_name: string
  phone_number: string
  email: string
  gender: Gender | ''
  date_of_birth: string | null
  marital_status: MaritalStatus | ''
  address: string
  branch: Id | null
  branch_name: string | null
  previous_church: string
  message: string
  consent_at: string
  status: RegistrationStatus
  member: Id | null
  member_number: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  review_note: string
  possible_matches: PossibleMatch[]
  suggested_number: string | null
  created_at: string
}

export interface RegisterPage {
  church: string
  branches: { id: Id; name: string }[]
}

export interface AttendanceSummary {
  services_last_90_days: number
  attended_last_90_days: number
  rate: number | null
  last_attended: string | null
  sundays?: { date: string; state: 'came' | 'missed' | 'none' }[]
}

// --- giving -------------------------------------------------------------------------------------

export type Channel = 'mpesa' | 'paybill' | 'paypal' | 'sasapay' | 'cash' | 'bank' | 'cheque'
export type DonationStatus = 'success' | 'pending' | 'failed'
export type ReceiptSmsStatus = 'sent' | 'failed' | 'no_phone' | ''

export interface DonationType {
  id: Id
  code: string
  name: string
  project: Id | null
  project_name: string | null
  branch: Id | null
  branch_name: string | null
  is_active: boolean
  is_default: boolean
  show_on_give: boolean
  total_given: Amount
  donation_count: number
  payment_count: number
  created_at: string
  updated_at: string
}

/** A donation type as the public give page lists it. */
export interface PublicDonationType {
  id: Id
  code?: string
  name: string
  /** The project this type stands for, if any. */
  project?: Id | null
  is_default?: boolean
  asks_project?: boolean
}

export interface MpesaPayment {
  id: Id
  checkout_request_id: string
  phone_number: string
  amount: Amount
  status: DonationStatus
  result_code: string | null
  result_description: string | null
  receipt: string | null
  transaction_date: string | null
  created_at: string
  updated_at: string
}

export interface Donation {
  id: Id
  membership_number: string
  phone_number: string
  giver_name: string
  email: string
  donation_type: Id
  donation_type_name: string
  donation_type_code: string
  amount: Amount
  currency: string
  amount_original: Amount | null
  channel: Channel
  status: DonationStatus
  reference: string
  receipt: string | null
  notes: string
  member: Id | null
  member_name: string | null
  branch: Id | null
  branch_name: string | null
  project: Id | null
  project_name: string | null
  payment: MpesaPayment | null
  recorded_by_name: string | null
  receipt_sms_status: ReceiptSmsStatus
  receipt_sms_error: string
  receipt_sms_at: string | null
  unallocated: boolean
  created_at: string
  updated_at: string
}

export interface DonationSummary {
  total: Amount
  count: number
  unallocated: { total: Amount; count: number }
  by_type: { donation_type: Id; name: string; total: Amount; count: number }[]
  by_channel: { channel: Channel; total: Amount; count: number }[]
}

export type PaybillStatus = 'unallocated' | 'allocated' | 'ignored'
export type PhoneCheck = 'match' | 'mismatch' | 'unknown' | ''

export interface PaybillPayment {
  id: Id
  trans_id: string
  trans_time: string
  amount: Amount
  account: string
  payer_name: string
  msisdn: string
  parsed_phone: string
  source: string
  parsed_code: Id | null
  parsed_code_label: string | null
  parsed_member: Id | null
  parsed_member_name: string | null
  phone_check: PhoneCheck
  status: PaybillStatus
  reason: string
  donation: Id | null
  donation_summary: {
    id: Id
    member_name: string | null
    donation_type: Id
    donation_type_name: string
    project_name: string | null
    receipt_sms_status: ReceiptSmsStatus
  } | null
  allocated_by_name: string | null
  allocated_at: string | null
  created_at: string
}

export interface Receipt {
  church: Church
  receipt_number: string
  date: string
  printed_at: string
  received_from: string
  membership_number: string | null
  phone_number: string
  branch: string | null
  donation_type: string
  project: string | null
  amount: Amount
  amount_in_words: string
  paid_amount: Amount | null
  paid_currency: string | null
  channel: string
  reference: string | null
  notes: string
  recorded_by: string | null
}

export interface Statement {
  church: Church
  member: { full_name: string; membership_number: string; phone_number: string; branch: string | null }
  date_from: string
  date_to: string
  printed_at: string
  donations: { receipt_number: string; date: string; description: string; channel: string; reference: string | null; amount: Amount }[]
  by_type: { label: string; total: Amount }[]
  total: Amount
  total_in_words: string
}

// --- M-PESA statement sync ----------------------------------------------------------------------

export type ReconcileOutcome = 'import' | 'link_online' | 'mismatch' | 'not_on_statement' | 'stale' | 'review' | 'recorded' | 'skip'

export interface ReconcileSummary {
  rows: number
  period_start: string | null
  period_end: string | null
  statement_total: Amount
  system_total: Amount
  system_total_after?: Amount | null
  counts: Partial<Record<ReconcileOutcome | 'fixed', number>>
  to_import: number
  to_fix: number
  to_mark: number
  amount_to_import: Amount
  applied?: boolean
}

export interface ReconcileRow {
  time: string | null
  receipt: string
  payer: string
  account: string
  outcome: ReconcileOutcome
  detail: string
  amount: Amount
}

export interface ReconcileResult {
  summary: ReconcileSummary
  rows: ReconcileRow[]
}

export interface ReconcileRun {
  id: Id
  filename: string
  created_at: string
  run_by: string
  period_start: string | null
  period_end: string | null
  rows: number
  already_recorded: number
  imported: number
  linked: number
  needs_review: number
  amount_imported: Amount
  synced: boolean
  amounts_fixed: number
  marked_not_received: number
}

// --- attendance ---------------------------------------------------------------------------------

export interface Service {
  id: Id
  name: string
  service_type: string
  date: string
  start_time: string | null
  branch: Id | null
  branch_name: string | null
  visitor_count: number
  first_timers?: number
  notes: string
  members_present: number
  total_attendance: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface RosterMember {
  id: Id
  membership_number: string
  full_name: string
  phone_number: string
  branch_name: string | null
  status: MemberStatus
  present: boolean
}

export interface FollowUpMember {
  id: Id
  full_name: string
  membership_number: string
  phone_number: string
  branch_name: string | null
  last_attended: string | null
}

export interface AttendanceStats {
  trend: { date: string; services: number; members_present: number; visitors: number; name: string; total: number }[]
  average_attendance: number
  last_service: { id: Id; name: string; date: string; branch_name: string | null; total: number } | null
  services_this_month: number
  follow_up_weeks: number
  follow_up_count: number
  follow_up: FollowUpMember[]
}

// --- dashboards ---------------------------------------------------------------------------------

export interface DashboardData {
  unallocated_payments: number
  unallocated_amount: Amount
  last_service: { id: Id; name: string; date: string; branch_name: string | null; members_present: number; visitors: number; first_timers?: number; total: number } | null
  members: { total: number; active: number; new_this_month: number }
  branches: { total: number; active: number }
  projects: { total: number; ongoing: number }
  donations: {
    today: Amount; this_month: Amount; this_year: Amount; all_time: Amount; pending: number
    last_month?: Amount; last_year_to_date?: Amount; by_phone_share?: number | null
  }
  trend: { month: string; total: Amount }[]
  by_type: { donation_type: Id; name: string; total: Amount }[]
  month_by_type?: { donation_type: Id; name: string; total: Amount }[]
  top_branches: { id: Id; name: string; total: Amount; member_count: number }[]
  branch_rows?: { id: Id; name: string; total: Amount; member_count: number }[]
  attendance_trend?: { date: string; members: number; visitors: number; first_timers: number; services: number; total: number }[]
  pending_registrations?: { count: number; names: string[] } | null
  failed_receipts?: { count: number; phones: string[] }
  recent_donations: Donation[]
  active_projects: { id: Id; name: string; target_amount: Amount; amount_raised: Amount; status: ProjectStatus }[]
}

// --- SMS ----------------------------------------------------------------------------------------

export type SmsStatus = 'sent' | 'partial' | 'failed'

export interface SmsMessage {
  id: Id
  message: string
  audience: Record<string, unknown>
  audience_label: string
  status: SmsStatus
  recipient_count: number
  sent_count: number
  failed_count: number
  skipped_count: number
  sent_by_name: string
  created_at: string
}

export interface SmsRecipient {
  id: Id
  member: Id | null
  name: string
  phone_number: string
  text: string
  status: 'sent' | 'failed'
  error: string
}

export interface SmsPreview {
  recipient_count: number
  skipped_count: number
  audience_label?: string
  sample: { name: string; phone_number: string; text: string }[]
}

// --- public giving ------------------------------------------------------------------------------

export interface PublicProject {
  id: Id
  name: string
  description?: string
  target_amount?: Amount
  amount_raised?: Amount
  /** Null when the project has no target. */
  percent?: number | null
  end_date?: string | null
  image_url?: string | null
}

/** What the give page offers for mobile money (GET /payments/mobile/). */
export interface MobileMoneyConfig {
  /** Which service sends the payment prompt. */
  provider: 'daraja' | 'sasapay'
  /** e.g. 63902 M-PESA, 63903 Airtel Money (SasaPay network codes). */
  networks: { code: string; label: string }[]
}

export interface PaypalConfig {
  enabled: boolean
  currency: string
  kes_rate: number | string
}

export interface PaypalGift {
  order_id: string
  status: 'created' | 'completed' | string
  amount: Amount
  currency: string
  message: string
  donation_type: string | null
}

// --- member portal (MKanisa ID) ------------------------------------------------------------------

export interface PortalPerson {
  name: string
  phone_number: string
  email: string
}

export interface PortalGift {
  id: Id
  date: string
  donation_type: string
  project: string | null
  amount: Amount
  paid_amount: Amount | null
  paid_currency: string | null
  channel: string
  receipt_number: string
  church: string
}

export interface PortalChurch {
  id: Id
  url: string
  name: string
  relationship: string
  status: string
  memberships: { full_name: string; membership_number: string; branch: string | null; status: string; date_joined: string | null }[]
}

export interface PortalMe {
  person: PortalPerson
  churches: PortalChurch[]
  giving: {
    year: number
    year_total: Amount
    year_count: number
    all_time_total: Amount
    last_gift: PortalGift | null
  }
}

export interface PortalGiving {
  years: number[]
  results: PortalGift[]
}

/** GET /platform/overview/: how every church on the platform is doing. */
export type OverviewPeriod = '30d' | 'quarter' | '12m'
export interface PlatformOverview {
  period: OverviewPeriod
  today: string
  churches: { live: number; new_this_month: number; joined_this_year: number; pending: number; closed: number; own_paybill: number }
  members: { total: number; new_30_days: number }
  giving: {
    this_month: Amount
    last_month: Amount
    change: number | null
    /** Oldest first; the last one is still running. */
    series: { start: string; label: string; amount: Amount; partial: boolean }[]
    channels: { key: 'prompt' | 'paybill' | 'paypal' | 'recorded'; label: string; amount: Amount; share: number }[]
  }
  prompts: { sent_30_days: number; confirmed_rate: number | null; change_points: number | null }
  sms: { sent_30_days: number; ok_rate: number | null }
  growth: { start: string; label: string; churches: number }[]
  attention: {
    kind: 'failing' | 'unallocated' | 'waiting' | 'quiet'
    church: Id
    name: string
    text: string
    url?: string
    username?: string
  }[]
  church_rows: {
    id: Id
    name: string
    slug: string
    url: string
    domain: string
    status: 'open' | 'closed' | 'pending'
    members: number
    given_this_month: Amount
    change: number | null
    weekly: Amount[]
    own_paybill: boolean
    created_at: string
  }[]
}

/** GET /platform/registrations/ */
export interface ChurchRegistration {
  id: Id
  name: string
  slug: string
  domain: string
  url: string
  location: string
  status: 'waiting' | 'opened' | 'expired'
  created_at: string
  opened_at: string | null
  minutes_to_open: number | null
  owner: { name: string; username: string; phone: string; email: string; codes_sent: number } | null
  log: { at: string; what: 'registered' | 'code_sent' | 'code_resent' | 'code_failed' | 'opened'; by: string | null }[]
}
export interface RegistrationsPage {
  stats: { registered_this_month: number; opened_this_month: number; minutes_to_open: number | null; waiting: number; oldest_waiting_days: number | null }
  period: 'month' | 'quarter' | 'all'
  counts: { waiting: number; opened: number; expired: number; all: number }
  results: ChurchRegistration[]
}

/** GET /platform/payments/ */
export interface PlatformPayment {
  key: string
  at: string
  church: { id: Id; name: string; slug: string; url: string }
  channel: string
  from: string
  amount: Amount
  currency: string
  receipt: string
  status: 'confirmed' | 'failed' | 'waiting' | 'unmatched'
  reason: string
  for: string
}
export interface PaymentsPage {
  days: number
  stats: {
    received_today: Amount; received_today_count: number; received_change: number | null
    prompts_sent: number; prompts_confirmed_rate: number | null
    unmatched: number; unmatched_amount: Amount; waiting_over_an_hour: number
    paypal_month: Amount; paypal_month_kes: Amount; paypal_month_count: number
  }
  reasons: { failed: number; sent: number; items: { key: string; label: string; count: number; share: number }[] }
  trouble: { kind: 'failing' | 'unmatched' | 'stale'; church: PlatformPayment['church']; text: string }[]
  total: number
  page: number
  has_more: boolean
  results: PlatformPayment[]
}

/** GET /platform/sms/ */
export interface SmsPage {
  days: number
  stats: { sent: number; change: number | null; accepted_rate: number | null; refused: number; receipts_per_gift: number | null; churches_sending_bulk: number; churches_live: number }
  series: { day: string; count: number }[]
  kinds: { key: string; label: string; count: number; share: number }[]
  balance: { credits: number | null; days_left: number | null; low: boolean; sender_id: string }
  failures: { church: string; kind: string; count: number; text: string }[]
  churches: { id: Id; name: string; slug: string; receipts: number; bulk: number; failed: number; accepted_rate: number | null; last_bulk: { text: string; at: string } | null }[]
}
