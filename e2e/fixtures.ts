import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://127.0.0.1:8001'
export const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://127.0.0.1:5174'
export const API = `${BACKEND_URL}/api`
export const C2B_TOKEN = 'e2e-c2b-token' // config/settings_e2e.py

// Seeded by `manage.py e2e_seed` in pceaBackend; keep in sync.
export const ACCOUNTS = {
  super: { username: 'super', password: 'Super-pass-2026!', phone: '254700000001' },
  clerk: { username: 'clerk', password: 'Clerk-pass-2026!', phone: '254700000002' },
  forgetful: { username: 'forgetful', password: 'Forgot-pass-2026!', phone: '254700000003' },
}
export interface Credentials {
  username: string
  password: string
}

/** A text captured by the backend's e2e SMS fake. */
export interface SentSms {
  phone: string
  text: string
}

export const MEMBER = { number: 'M0001', name: 'Grace Njeri', phone: '254711000001' }

/** A short unique suffix so records created by one run never collide. */
export const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`.toUpperCase()

/** A random Kenyan mobile number: [local 07..., normalised 2547...]. */
export function randomPhone(): [string, string] {
  const rest = String(Math.floor(Math.random() * 1e8)).padStart(8, '0')
  return [`07${rest}`, `2547${rest}`]
}

export async function login(page: Page, { username, password }: Credentials) {
  await page.goto('/')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export const sidebarLinks = (page: Page) => page.locator('aside nav a')

/** Texts the backend "sent" (captured by the e2e fake), newest last. */
export async function smsTo(request: APIRequestContext, phone?: string): Promise<SentSms[]> {
  const res = await request.get(`${API}/e2e/sms/`, { params: phone === undefined ? {} : { phone } })
  expect(res.ok()).toBeTruthy()
  return res.json()
}

/** The 6-digit code in the latest SMS to ``phone``, waiting for it to arrive. */
export async function latestCode(request: APIRequestContext, phone: string): Promise<string> {
  let code: string | undefined
  await expect.poll(async () => {
    const messages = await smsTo(request, phone)
    code = messages.at(-1)?.text.match(/code is (\d{6})/)?.[1]
    return code
  }, { message: `no SMS code sent to ${phone}` }).toBeTruthy()
  return code!
}

/** Sign in through the API and return a Bearer header for admin endpoints. */
export async function authHeader(request: APIRequestContext, { username, password }: Credentials) {
  const res = await request.post(`${API}/auth/login/`, { data: { username, password } })
  expect(res.ok()).toBeTruthy()
  return { Authorization: `Bearer ${(await res.json()).access}` }
}

/** Act as Safaricom: post a Paybill (C2B) confirmation. */
interface C2BPayment {
  transId: string
  amount?: number
  account: string
  msisdn?: string
  firstName?: string
}

export function postC2B(request: APIRequestContext, { transId, amount = 500, account, msisdn = '254799000000', firstName = 'E2E' }: C2BPayment) {
  return request.post(`${API}/payments/c2b/${C2B_TOKEN}/confirmation/`, {
    data: {
      TransactionType: 'Pay Bill', TransID: transId, TransTime: '20261002120000', TransAmount: String(amount),
      BusinessShortCode: '174379', BillRefNumber: account, MSISDN: msisdn, FirstName: firstName, LastName: 'Giver',
    },
  })
}

/** Act as Safaricom: post the STK push result for ``checkoutId``. */
interface StkResult {
  ok?: boolean
  amount?: number
  phone?: string
  receipt?: string
}

export function postStkCallback(request: APIRequestContext, checkoutId: string, { ok = true, amount = 100, phone = MEMBER.phone, receipt }: StkResult = {}) {
  const stkCallback: Record<string, unknown> = {
    MerchantRequestID: 'e2e', CheckoutRequestID: checkoutId,
    ResultCode: ok ? 0 : 1032,
    ResultDesc: ok ? 'The service request is processed successfully.' : 'Request cancelled by user',
  }
  if (ok) {
    stkCallback.CallbackMetadata = { Item: [
      { Name: 'Amount', Value: amount },
      { Name: 'MpesaReceiptNumber', Value: receipt || `E2E${unique()}`.slice(0, 10) },
      { Name: 'TransactionDate', Value: 20261002120000 },
      { Name: 'PhoneNumber', Value: Number(phone) },
    ] }
  }
  return request.post(`${API}/mpay/callback/`, { data: { Body: { stkCallback } } })
}
