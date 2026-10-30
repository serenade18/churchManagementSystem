import { expect, test } from '@playwright/test'
import { ACCOUNTS, API, authHeader, login, smsTo, unique } from './fixtures.js'

// The church's wallet: money paid to mKanisa's SasaPay merchant code, and a withdrawal to M-PESA
// confirmed with an SMS code. (The e2e backend fakes SasaPay; see apps/e2e/fakes.py.)

const SASAPAY_IPN = `${API}/payments/sasapay/e2e-sasapay-token/ipn/`

test('gifts fill the wallet and the treasurer withdraws with a code', async ({ page, request }) => {
  const headers = await authHeader(request, ACCOUNTS.super)
  const before = Number((await (await request.get(`${API}/cms/wallet/`, { headers })).json()).balance)
  const paid = await request.post(SASAPAY_IPN, { data: {
    MerchantCode: '600980', BusinessShortCode: '600980', TransID: `E2E${unique()}`, FullName: 'GRACE NJERI',
    MSISDN: '254711000001', TransAmount: '50000.00', TransTime: '20261029100000', BillRefNumber: '0711000001',
  } })
  expect(paid.ok()).toBeTruthy()
  const wallet = await (await request.get(`${API}/cms/wallet/`, { headers })).json()
  expect(Number(wallet.balance) - before).toBe(49000) // less the 2% fee

  await login(page, ACCOUNTS.super)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('link', { name: 'Payments' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Payments' })).toBeVisible()
  await expect(page.getByText('Wallet balance')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Paid to merchant code · GRACE NJERI' }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Loans and credit' })).toContainText('Coming soon')

  await page.getByRole('button', { name: 'Withdraw', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Withdraw to M-PESA' })
  await dialog.getByLabel('Amount (KES)').fill('10000')
  await dialog.getByLabel('M-PESA number').fill('0722000003')
  await dialog.getByRole('button', { name: 'Send me a code' }).click()
  await expect(dialog).toContainText('We sent a 6-digit code')

  let code = ''
  await expect.poll(async () => {
    code = (await smsTo(request, ACCOUNTS.super.phone)).at(-1)?.text.match(/^(\d{6}) is your code for withdrawing KES 10,000/)?.[1] || ''
    return code
  }).toBeTruthy()
  await dialog.getByLabel('Code').fill(code)
  await dialog.getByRole('button', { name: 'Withdraw', exact: true }).click()
  await expect(page.getByText('KES 10,000 is on its way to 0722000003')).toBeVisible()
  await expect(page.getByRole('row', { name: /KES 10,000 .*0722000003.*Sending/ }).first()).toBeVisible()
  const after = await (await request.get(`${API}/cms/wallet/`, { headers })).json()
  expect(Number(after.balance)).toBe(Number(wallet.balance) - 10000)
})

test('the treasurer pays salaries from the wallet', async ({ page, request }) => {
  const headers = await authHeader(request, ACCOUNTS.super)
  await request.post(SASAPAY_IPN, { data: {
    MerchantCode: '600980', BusinessShortCode: '600980', TransID: `E2E${unique()}`, FullName: 'GRACE NJERI',
    MSISDN: '254711000001', TransAmount: '30000.00', TransTime: '20261029100000', BillRefNumber: '0711000001',
  } })
  const before = Number((await (await request.get(`${API}/cms/wallet/`, { headers })).json()).balance)
  const name = `Caretaker ${unique()}`

  // The clerk is a treasurer (and gets their own code: the owner may have just had one)
  await login(page, ACCOUNTS.clerk)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/payments')
  await page.getByRole('button', { name: 'Payroll' }).click()
  await page.getByRole('button', { name: 'Add staff' }).click()
  const form = page.getByRole('dialog', { name: 'Add staff' })
  await form.getByLabel('Name *').fill(name)
  await form.getByLabel('M-PESA number *').fill('0722000009')
  await form.getByLabel('Monthly salary (KES) *').fill('8000')
  await form.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('KES 8,000')

  await page.getByRole('button', { name: 'Pay salaries' }).click()
  const pay = page.getByRole('dialog', { name: 'Pay salaries' })
  // Only this person: others may be on the payroll from earlier runs
  for (const box of await pay.getByRole('checkbox').all()) await box.uncheck()
  await pay.getByRole('listitem').filter({ hasText: name }).getByRole('checkbox').check()
  await pay.getByLabel(`Pay ${name}`).fill('8500')
  await pay.getByRole('button', { name: 'Send me a code' }).click()
  let code = ''
  await expect.poll(async () => {
    code = (await smsTo(request, ACCOUNTS.clerk.phone)).at(-1)?.text.match(/^(\d{6}) is your code for paying KES 8,500 in salaries/)?.[1] || ''
    return code
  }).toBeTruthy()
  await pay.getByLabel('Code').fill(code)
  await pay.getByRole('button', { name: 'Pay KES 8,500' }).click()
  await expect(page.getByText(/KES 8,500 in salaries for .* is on its way\./)).toBeVisible()
  await expect(page.getByRole('row', { name: new RegExp(name) })).not.toContainText('Not yet')
  const after = Number((await (await request.get(`${API}/cms/wallet/`, { headers })).json()).balance)
  expect(before - after).toBe(8500)
})
