export const CHURCH_NAME = import.meta.env.VITE_CHURCH_NAME || 'PCEA Milele'

const kes = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 })
export const money = (value) => kes.format(Number(value || 0))
export const compactMoney = (value) =>
  'KES ' + new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))

export const date = (value) =>
  value ? new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
export const today = () => new Date().toISOString().slice(0, 10)

export const DONATION_TYPES = {
  general: 'General Offering',
  tithe: 'Tithe & First Fruit',
  development: 'Development',
  thanksgiving: 'Thanksgiving',
  group: 'Group Account',
  project: 'Project',
  other: 'Other',
}
export const CHANNELS = { mpesa: 'M-PESA', cash: 'Cash', bank: 'Bank', cheque: 'Cheque' }
export const DONATION_STATUS = { success: 'Success', pending: 'Pending', failed: 'Failed' }
export const MEMBER_STATUS = { active: 'Active', inactive: 'Inactive', transferred: 'Transferred', deceased: 'Deceased' }
export const GENDERS = { male: 'Male', female: 'Female' }
export const MARITAL = { single: 'Single', married: 'Married', widowed: 'Widowed', divorced: 'Divorced' }
export const PROJECT_STATUS = { planned: 'Planned', ongoing: 'Ongoing', on_hold: 'On Hold', completed: 'Completed' }

export const STATUS_TONES = {
  success: 'green', active: 'green', ongoing: 'blue', completed: 'green',
  pending: 'amber', planned: 'slate', on_hold: 'amber', inactive: 'slate',
  failed: 'red', transferred: 'purple', deceased: 'slate',
}

export const SERVICE_TYPES = {
  sunday_service: 'Sunday Service',
  midweek: 'Midweek Service',
  prayer: 'Prayer Meeting',
  bible_study: 'Bible Study',
  youth: 'Youth Meeting',
  fellowship: 'Fellowship',
  special: 'Special Event',
  other: 'Other',
}
