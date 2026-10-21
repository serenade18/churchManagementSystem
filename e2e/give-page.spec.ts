import { expect, test } from '@playwright/test'
import { postStkCallback, randomPhone, unique } from './fixtures.js'

// A visitor's number: gifts here stay off the seeded member, whose donations giving.spec looks up.
const masked = (phone: string) => `${phone.slice(0, 4)} ••• ${phone.slice(-3)}`

test.describe('The give page', () => {
  test('quick amounts, Other and the summary line', async ({ page }) => {
    await page.goto('/give')
    await expect(page.getByRole('heading', { name: /^Give to / })).toBeVisible()
    await page.getByRole('radio', { name: 'Thanksgiving' }).check()
    await page.getByRole('button', { name: '2,000', exact: true }).click()
    await expect(page.getByRole('button', { name: '2,000', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Amount (KES)')).toHaveValue('2,000') // shillings shown with a thousands comma
    await expect(page.getByRole('button', { name: /^Give .*2,000 with M-PESA/ })).toBeVisible()

    await page.getByRole('button', { name: 'Other' }).click()
    await expect(page.getByLabel('Amount (KES)')).toHaveValue('')
    await expect(page.getByLabel('Amount (KES)')).toBeFocused()
    await page.getByLabel('Amount (KES)').pressSequentially('7a5') // only digits
    await expect(page.getByLabel('Amount (KES)')).toHaveValue('75')
    await expect(page.getByRole('button', { name: /^Give .*75 with M-PESA/ })).toBeVisible()
  })

  test('the Paybill box lists the gift codes', async ({ page }) => {
    await page.route('**/api/branding/', async (route) => {
      const res = await route.fetch()
      await route.fulfill({ response: res, json: { ...(await res.json()), paybill: '247247' } })
    })
    await page.goto('/give')
    const box = page.getByRole('region', { name: 'Prefer the M-PESA menu?' })
    await expect(box).toBeVisible()
    await expect(box).toContainText('247247')
    await expect(box.getByRole('listitem').filter({ hasText: 'Tithe & First Fruit' })).toContainText('TTH')
    await expect(box).not.toContainText('Project') // projects are chosen on the page, not by code
  })

  test('a project link opens with that project chosen, with its progress', async ({ page }) => {
    await page.route('**/api/public/projects/', (route) => route.fulfill({
      json: [{ id: 999, name: 'Clean water for Ruai', target_amount: '450000', amount_raised: '310000', percent: 69, image_url: null }],
    }))
    await page.goto('/give?project=999')
    const project = page.getByRole('radio', { name: /Clean water for Ruai/ })
    await expect(project).toBeChecked()
    await expect(page.getByText('Or a church project')).toBeVisible()
    await expect(page.getByText(/of (Ksh|KES)\s?450,000 · 69%/)).toBeVisible()
  })

  test('waiting shows the masked phone; Cancel goes back to the form', async ({ page }) => {
    const [phone] = randomPhone()
    await page.goto('/give')
    await page.getByLabel('M-PESA phone number').fill(phone)
    await page.getByRole('button', { name: /^Give/ }).click()
    await expect(page.getByRole('heading', { name: 'Check your phone' })).toBeVisible()
    await expect(page.getByText(masked(phone))).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send it again' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByLabel('M-PESA phone number')).toHaveValue(phone)
  })

  test('the thank-you card shows the M-PESA code and links to My giving', async ({ page, request }) => {
    const receipt = `TY${unique()}`.slice(0, 10)
    const [phone] = randomPhone()
    await page.goto('/give')
    await page.getByLabel('M-PESA phone number').fill(phone)
    await page.getByRole('button', { name: '500', exact: true }).click()
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/mpay/pay/') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /^Give/ }).click(),
    ])
    await postStkCallback(request, (await response.json()).data.payment.checkout_request_id, { amount: 500, receipt })
    await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(receipt)).toBeVisible()
    await expect(page.getByText(`An SMS receipt is on its way to ${masked(phone)}.`)).toBeVisible()
    await expect(page.getByRole('link', { name: 'See all my giving' })).toHaveAttribute('href', '/me')
    await page.getByRole('button', { name: 'Give again' }).click()
    await expect(page.getByRole('heading', { name: /^Give to / })).toBeVisible()
  })
})
