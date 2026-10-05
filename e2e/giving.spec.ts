import { expect, test, type Page } from '@playwright/test'
import { ACCOUNTS, MEMBER, login, postStkCallback, smsTo, unique } from './fixtures.js'

/** Fill the public giving form and return the STK CheckoutRequestID the backend created. */
async function startGift(page: Page, { amount, phone = '0711 000 001', towards = 'Tithe & First Fruit' }: { amount: number; phone?: string; towards?: string }) {
  await page.goto('/give')
  await page.getByLabel('Membership number').fill(MEMBER.number)
  await page.getByLabel('M-PESA phone number').fill(phone)
  await page.getByLabel('Giving towards').selectOption({ label: towards })
  await page.getByLabel('Amount (KES)').fill(String(amount))
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/mpay/pay/') && r.request().method() === 'POST'),
    page.getByRole('button', { name: /^Give/ }).click(),
  ])
  expect(response.ok()).toBeTruthy()
  await expect(page.getByRole('heading', { name: 'Check your phone' })).toBeVisible()
  return (await response.json()).data.payment.checkout_request_id
}

test('a member gives online; the M-PESA callback confirms it and admins see it', async ({ page, request }) => {
  const receipt = `E2E${unique()}`.slice(0, 10)
  const before = (await smsTo(request, MEMBER.phone)).length
  const checkoutId = await startGift(page, { amount: 250 })

  const res = await postStkCallback(request, checkoutId, { amount: 250, receipt })
  expect(res.ok()).toBeTruthy()
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('KES 250')).toBeVisible()

  // The giver got an SMS receipt.
  await expect.poll(async () => (await smsTo(request, MEMBER.phone)).length).toBeGreaterThan(before)
  expect((await smsTo(request, MEMBER.phone)).at(-1)?.text).toContain('with gratitude we acknowledge your')

  // An admin finds it in Donations.
  await login(page, ACCOUNTS.clerk)
  await page.getByRole('link', { name: 'Donations' }).click()
  await page.getByPlaceholder('Search member, phone, receipt…').fill(receipt)
  const row = page.getByRole('row', { name: new RegExp(MEMBER.name) })
  await expect(row).toBeVisible()
  await expect(row).toContainText('250')
})

test('a cancelled M-PESA prompt shows the failure and lets the giver retry', async ({ page, request }) => {
  const checkoutId = await startGift(page, { amount: 75, towards: 'General Offering' })
  await postStkCallback(request, checkoutId, { ok: false })
  await expect(page.getByRole('heading', { name: 'Payment not completed' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Request cancelled by user')).toBeVisible()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Give online' })).toBeVisible()
})

test('the giving form rejects an invalid phone number before calling M-PESA', async ({ page }) => {
  let called = false
  page.on('request', (r) => { if (r.url().includes('/mpay/pay/')) called = true })
  await page.goto('/give')
  await page.getByLabel('Membership number').fill(MEMBER.number)
  await page.getByLabel('M-PESA phone number').fill('12345')
  await page.getByLabel('Amount (KES)').fill('100')
  await page.getByRole('button', { name: /^Give/ }).click()
  await expect(page.getByText('Enter a valid Safaricom number')).toBeVisible()
  expect(called).toBe(false)
})
