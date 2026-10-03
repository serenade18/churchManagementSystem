import { expect, test } from '@playwright/test'
import { ACCOUNTS, API, MEMBER, login, smsTo, unique } from './fixtures.js'

// PayPal is faked by the backend in config.settings_e2e: orders come back approved, as if the
// giver had paid on PayPal, and PayPal "redirects" straight to /give/paypal.

test('a giver abroad pays with PayPal; the gift is confirmed and admins see it in USD and KES', async ({ page, request }) => {
  const email = `giver.${unique()}@example.org`
  const before = (await smsTo(request, MEMBER.phone)).length

  await page.goto('/give')
  await page.getByRole('radio', { name: 'PayPal / card' }).click()
  await page.getByLabel('Membership number (if you have one)').fill(MEMBER.number)
  await page.getByLabel('Your name').fill('Grace Abroad')
  await page.getByLabel('Email for your receipt').fill(email)
  await page.getByLabel('Giving towards').selectOption({ label: 'Thanksgiving' })
  await page.getByLabel('Amount (USD)').fill('20')
  await expect(page.getByText(/About (Ksh|KES)\s?2,600/)).toBeVisible() // PAYPAL_KES_RATE=130 in e2e
  await page.getByRole('button', { name: /Give .*20.* with PayPal/ }).click()

  await expect(page).toHaveURL(/\/give\/paypal\?token=/)
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible()
  await expect(page.getByText(/(US\$|USD)\s?20\.00 towards Thanksgiving/)).toBeVisible()

  // Receipts: SMS to the member's phone and an email to the address given.
  await expect.poll(async () => (await smsTo(request, MEMBER.phone)).length).toBeGreaterThan(before)
  const emails = await (await request.get(`${API}/e2e/email/`, { params: { to: email } })).json()
  expect(emails.at(-1).body).toContain('we have received your generous contribution')

  await login(page, ACCOUNTS.clerk)
  await page.getByRole('link', { name: 'Donations', exact: true }).click()
  await page.locator('select').filter({ hasText: 'All channels' }).selectOption('paypal')
  const row = page.getByRole('row', { name: new RegExp(MEMBER.name) }).first()
  await expect(row).toContainText('PayPal')
  await expect(row).toContainText(/(Ksh|KES)\s?2,600/)
  await expect(row).toContainText(/(US\$|USD)\s?20\.00/)
})

test('a cancelled PayPal payment says nothing was charged', async ({ page }) => {
  await page.goto('/give?paypal=cancelled')
  await expect(page.getByText('Your PayPal payment was cancelled. Nothing was charged.')).toBeVisible()
})
