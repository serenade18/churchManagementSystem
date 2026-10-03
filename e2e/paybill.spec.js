import { expect, test } from '@playwright/test'
import { ACCOUNTS, MEMBER, login, postC2B, smsTo, unique } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  await login(page, ACCOUNTS.clerk)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('link', { name: 'Paybill' }).click()
  await expect(page.getByRole('heading', { name: 'Paybill' })).toBeVisible()
})

test('create a donation code; a Paybill payment using it is allocated automatically', async ({ page, request }) => {
  // Codes avoid O/I (read as 0/1), so build one from safe letters.
  const code = `B${unique().replace(/[^A-HJ-NP-Z]/g, '').slice(0, 4).padEnd(2, 'X')}`
  await page.getByRole('button', { name: 'Donation codes' }).click()
  await page.getByRole('button', { name: 'New code' }).click()
  await page.getByLabel('Code *').fill(code)
  await page.getByLabel('Name *').fill('Building fund')
  await page.getByLabel('Donation type').selectOption({ label: 'Development' })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('row', { name: new RegExp(`${code}.*Building fund`) })).toBeVisible()

  const transId = `E2E${unique()}`.slice(0, 12)
  const res = await postC2B(request, { transId, amount: 1200, account: `0711000001${code}`, msisdn: MEMBER.phone })
  expect((await res.json()).ResultCode).toBe(0)

  await page.getByRole('button', { name: 'Payments' }).click()
  await page.locator('select').first().selectOption('allocated')
  await page.getByPlaceholder('Search ref, account, name…').fill(transId)
  const row = page.getByRole('row', { name: new RegExp(transId) })
  await expect(row).toContainText(MEMBER.name)
  await expect(row).toContainText('Development')
  await expect(row).toContainText('Allocated')
  expect((await smsTo(request, MEMBER.phone)).at(-1).text).toContain(transId)
})

test('an unrecognised Paybill payment waits for an admin to allocate it', async ({ page, request }) => {
  const transId = `E2E${unique()}`.slice(0, 12)
  await postC2B(request, { transId, amount: 300, account: 'HELLO', firstName: 'MYSTERY' })

  await page.reload()
  await page.getByPlaceholder('Search ref, account, name…').fill(transId)
  const row = page.getByRole('row', { name: new RegExp(transId) })
  await expect(row).toContainText('Unallocated')
  await row.getByRole('button', { name: 'Allocate' }).click()

  await expect(page.getByRole('heading', { name: 'Allocate payment' })).toBeVisible()
  await page.getByPlaceholder('Search by name or member number…').fill('Grace')
  await page.getByRole('button', { name: new RegExp(`${MEMBER.name}.*${MEMBER.number}`) }).click()
  await page.getByLabel('Donation code').selectOption({ label: 'TTH · Tithe' })
  await page.getByRole('button', { name: 'Allocate', exact: true }).click()

  await expect(page.getByText('Payment updated.')).toBeVisible()
  await expect(page.getByRole('row', { name: new RegExp(transId) })).toHaveCount(0) // gone from Unallocated
  await page.locator('select').first().selectOption('allocated')
  await expect(page.getByRole('row', { name: new RegExp(transId) })).toContainText(MEMBER.name)
})
