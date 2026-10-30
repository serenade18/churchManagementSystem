/** The countries churches can sign up from (mirrors apps/core/countries.py): name, calling code, currency. */
export const COUNTRIES: Record<string, { name: string; dial: string; currency: string; example: string }> = {
  KE: { name: 'Kenya', dial: '254', currency: 'KES', example: '0712 345 678' },
  NG: { name: 'Nigeria', dial: '234', currency: 'NGN', example: '0803 123 4567' },
  GH: { name: 'Ghana', dial: '233', currency: 'GHS', example: '024 412 3456' },
  UG: { name: 'Uganda', dial: '256', currency: 'UGX', example: '0772 123 456' },
  TZ: { name: 'Tanzania', dial: '255', currency: 'TZS', example: '0712 345 678' },
  RW: { name: 'Rwanda', dial: '250', currency: 'RWF', example: '0788 123 456' },
  ZA: { name: 'South Africa', dial: '27', currency: 'ZAR', example: '082 123 4567' },
  ZM: { name: 'Zambia', dial: '260', currency: 'ZMW', example: '097 123 4567' },
  US: { name: 'United States', dial: '1', currency: 'USD', example: '+1 202 555 0123' },
  GB: { name: 'United Kingdom', dial: '44', currency: 'GBP', example: '07700 900123' },
}
export const DEFAULT_COUNTRY = 'KE'
