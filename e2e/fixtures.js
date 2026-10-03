import { expect } from '@playwright/test'

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
export const MEMBER = { number: 'M0001', name: 'Grace Njeri', phone: '254711000001' }

/** A short unique suffix so records created by one run never collide. */
export const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`.toUpperCase()

/** A random Kenyan mobile number: [local 07..., normalised 2547...]. */
export function randomPhone() {
  const rest = String(Math.floor(Math.random() * 1e8)).padStart(8, '0')
  return [`07${rest}`, `2547${rest}`]
}

export async function login(page, { username, password }) {
  await page.goto('/')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export const sidebarLinks = (page) => page.locator('aside nav a')

/** Texts the backend "sent" (captured by the e2e fake), newest last. */
export async function smsTo(request, phone) {
  const res = await request.get(`${API}/e2e/sms/`, { params: { phone } })
  expect(res.ok()).toBeTruthy()
  return res.json()
}

/** The 6-digit code in the latest SMS to ``phone``, waiting for it to arrive. */
export async function latestCode(request, phone) {
  let code
  await expect.poll(async () => {
    const messages = await smsTo(request, phone)
    code = messages.at(-1)?.text.match(/code is (\d{6})/)?.[1]
    return code
  }, { message: `no SMS code sent to ${phone}` }).toBeTruthy()
  return code
}

/** Sign in through the API and return a Bearer header for admin endpoints. */
export async function authHeader(request, { username, password }) {
  const res = await request.post(`${API}/auth/login/`, { data: { username, password } })
  expect(res.ok()).toBeTruthy()
  return { Authorization: `Bearer ${(await res.json()).access}` }
}

/** Act as Safaricom: post a Paybill (C2B) confirmation. */
export function postC2B(request, { transId, amount = 500, account, msisdn = '254799000000', firstName = 'E2E' }) {
  return request.post(`${API}/payments/c2b/${C2B_TOKEN}/confirmation/`, {
    data: {
      TransactionType: 'Pay Bill', TransID: transId, TransTime: '20261002120000', TransAmount: String(amount),
      BusinessShortCode: '174379', BillRefNumber: account, MSISDN: msisdn, FirstName: firstName, LastName: 'Giver',
    },
  })
}

/** Act as Safaricom: post the STK push result for ``checkoutId``. */
export function postStkCallback(request, checkoutId, { ok = true, amount = 100, phone = MEMBER.phone, receipt } = {}) {
  const stkCallback = {
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
