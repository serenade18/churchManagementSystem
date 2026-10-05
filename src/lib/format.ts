import { BRAND } from '../brand'
import type { Channel, DonationStatus, Gender, MaritalStatus, MemberStatus, ProjectStatus, Tone } from '../types'

const kes = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 })
type MoneyValue = string | number | null | undefined

export const money = (value: MoneyValue) => kes.format(Number(value || 0))
/** Amount in any currency, e.g. USD 25.00 for PayPal gifts. */
export const currencyMoney = (value: MoneyValue, currency = 'KES') =>
  currency === 'KES' ? money(value) : new Intl.NumberFormat('en-KE', { style: 'currency', currency }).format(Number(value || 0))
export const compactMoney = (value: MoneyValue) =>
  'KES ' + new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))

export const date = (value: string | number | Date | null | undefined) =>
  value ? new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const dateTime = (value: string | number | Date | null | undefined) =>
  value
    ? new Date(value).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
export const today = () => new Date().toISOString().slice(0, 10)

export const CHANNELS: Record<Channel, string> = { mpesa: 'M-PESA', paybill: 'M-PESA Paybill', paypal: 'PayPal', cash: 'Cash', bank: 'Bank', cheque: 'Cheque' }
// Donations confirmed by M-PESA or PayPal can't be edited (amount/status) or deleted.
export const PROVIDER_CHANNELS: readonly string[] = ['mpesa', 'paybill', 'paypal'] satisfies Channel[]
export const PAYBILL_NUMBER = BRAND.paybill
export const DONATION_STATUS: Record<DonationStatus, string> = { success: 'Success', pending: 'Pending', failed: 'Failed' }
export const MEMBER_STATUS: Record<MemberStatus, string> = { active: 'Active', inactive: 'Inactive', transferred: 'Transferred', deceased: 'Deceased' }
export const GENDERS: Record<Gender, string> = { male: 'Male', female: 'Female' }
export const MARITAL: Record<MaritalStatus, string> = { single: 'Single', married: 'Married', widowed: 'Widowed', divorced: 'Divorced' }
export const PROJECT_STATUS: Record<ProjectStatus, string> = { planned: 'Planned', ongoing: 'Ongoing', on_hold: 'On Hold', completed: 'Completed' }

export const STATUS_TONES: Record<string, Tone> = {
  success: 'green', active: 'green', ongoing: 'blue', completed: 'green',
  pending: 'amber', planned: 'slate', on_hold: 'amber', inactive: 'slate',
  failed: 'red', transferred: 'purple', deceased: 'slate',
}

export const SERVICE_TYPES: Record<string, string> = {
  sunday_service: 'Sunday Service',
  midweek: 'Midweek Service',
  prayer: 'Prayer Meeting',
  bible_study: 'Bible Study',
  youth: 'Youth Meeting',
  fellowship: 'Fellowship',
  special: 'Special Event',
  other: 'Other',
}
