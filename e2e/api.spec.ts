// Backend end-to-end: the public M-PESA / auth endpoints exercised over real HTTP, the way
// Safaricom and the browser call them.
import { expect, test } from '@playwright/test'
import { ACCOUNTS, API, C2B_TOKEN, MEMBER, authHeader, postC2B, postStkCallback, unique } from './fixtures.js'

test.describe('Paybill (C2B) callbacks', () => {
  test('need the secret token', async ({ request }) => {
    const res = await request.post(`${API}/payments/c2b/wrong-token/confirmation/`, { data: { TransID: 'X' } })
    expect(res.status()).toBe(404)
  })

  test('validation accepts every payment', async ({ request }) => {
    const res = await request.post(`${API}/payments/c2b/${C2B_TOKEN}/validation/`, { data: { TransID: 'X', TransAmount: '10' } })
    expect(await res.json()).toEqual({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  test('a repeated confirmation is recorded once', async ({ request }) => {
    const transId = `E2E${unique()}`.slice(0, 12)
    for (let i = 0; i < 2; i++) {
      const res = await postC2B(request, { transId, account: `${MEMBER.number}TTH`, msisdn: MEMBER.phone })
      expect((await res.json()).ResultCode).toBe(0)
    }
    const headers = await authHeader(request, ACCOUNTS.clerk)
    const list = await (await request.get(`${API}/cms/paybill-payments/`, { headers, params: { search: transId } })).json()
    expect(list.count).toBe(1)
    expect(list.results[0].status).toBe('allocated')
  })

  test('a malformed confirmation is still acknowledged so Safaricom does not retry forever', async ({ request }) => {
    const res = await request.post(`${API}/payments/c2b/${C2B_TOKEN}/confirmation/`, { data: { nonsense: true } })
    expect(await res.json()).toEqual({ ResultCode: 0, ResultDesc: 'Accepted' })
  })
})

test.describe('STK push', () => {
  test('pay → callback → status', async ({ request }) => {
    const pay = await request.post(`${API}/mpay/pay/`, {
      data: { phone_number: MEMBER.phone, amount: 50, reference: MEMBER.number, description: 'thanksgiving' },
    })
    expect(pay.ok()).toBeTruthy()
    const checkoutId = (await pay.json()).data.payment.checkout_request_id
    const status = () => request.get(`${API}/mpay/check_status/`, { params: { checkout_request_id: checkoutId } })
    expect((await (await status()).json()).data.status).toBe('pending')

    expect((await postStkCallback(request, checkoutId, { amount: 50 })).ok()).toBeTruthy()
    const done = (await (await status()).json()).data
    expect(done.status).toBe('success')
    expect(done.member_name || done.membership_number).toBeTruthy()

    // A duplicate callback changes nothing.
    expect((await (await postStkCallback(request, checkoutId, { amount: 50 })).json()).message).toBe('Payment already processed.')
  })

  test('rejects incomplete requests and unknown payments', async ({ request }) => {
    expect((await request.post(`${API}/mpay/pay/`, { data: { amount: 10 } })).status()).toBe(400)
    expect((await request.post(`${API}/mpay/callback/`, { data: {} })).status()).toBe(400)
    expect((await postStkCallback(request, 'ws_CO_UNKNOWN')).status()).toBe(404)
    expect((await request.get(`${API}/mpay/check_status/`)).status()).toBe(400)
  })
})

test.describe('Auth API', () => {
  test('admin endpoints need a signed-in admin', async ({ request }) => {
    for (const path of ['/cms/members/', '/cms/donations/', '/cms/paybill-payments/', '/auth/me/']) {
      expect((await request.get(`${API}${path}`)).status(), path).toBe(401)
    }
    const headers = await authHeader(request, ACCOUNTS.clerk)
    expect((await request.get(`${API}/cms/members/`, { headers })).status()).toBe(200)
    expect((await request.get(`${API}/cms/users/`, { headers })).status()).toBe(403) // super admins only
  })

  test('password reset never reveals accounts', async ({ request }) => {
    const known = await (await request.post(`${API}/auth/password-reset/`, { data: { username: 'super' } })).json()
    const unknown = await (await request.post(`${API}/auth/password-reset/`, { data: { username: 'ghost' } })).json()
    expect(unknown).toEqual(known)
    const bad = await request.post(`${API}/auth/password-reset/confirm/`, {
      data: { username: 'ghost', code: '123456', new_password: 'Whatever-pass-2026', confirm_password: 'Whatever-pass-2026' },
    })
    expect(bad.status()).toBe(400)
    expect((await bad.json()).code).toBeTruthy()
  })
})
