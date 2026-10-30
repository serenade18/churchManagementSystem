import { expect, test } from '@playwright/test'
import { ACCOUNTS, API, authHeader, login, randomPhone, unique } from './fixtures.js'

// Visitors: someone new scans a check-in code, comes back, is followed up and becomes a member.

/** A unique name of letters only (the ushers' check-in box reads digits as a membership number). */
const uniqueName = (prefix: string) => prefix + unique().replace(/\d/g, (d) => 'abcdefghij'[Number(d)]).toLowerCase()

test('a newcomer checks in by QR, comes back, and becomes a member', async ({ page, request }) => {
  const headers = await authHeader(request, ACCOUNTS.super)
  const points = await (await request.get(`${API}/cms/check-in-points/`, { headers })).json()
  const code = points.results[0].code
  const [local] = randomPhone()
  const first = uniqueName('Neema')

  // On their own phone: a number the church doesn't know asks for their name
  await page.goto(`/checkin/${code}`)
  await page.getByLabel('Your phone number').fill(local)
  await page.getByRole('button', { name: 'I’m here' }).click()
  await expect(page.getByText(`We don’t have ${local} yet`)).toBeVisible()
  await page.getByLabel('First name').fill(first)
  await page.getByLabel('Last name').fill('Atieno')
  await page.getByLabel(/How did you hear/).selectOption('friend')
  await page.getByRole('button', { name: 'Check me in' }).click()
  await expect(page.getByRole('heading', { name: `Welcome, ${first}!` })).toBeVisible()

  // Scanning again the same day: known now, and already in
  await page.goto(`/checkin/${code}`)
  await page.getByRole('button', { name: 'I’m here' }).click()
  await expect(page.getByRole('heading', { name: `Already checked in, ${first}` })).toBeVisible()

  // The office sees them among the visitors, to follow up
  await page.evaluate(() => localStorage.clear())
  await login(page, ACCOUNTS.super)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('link', { name: 'Visitors' }).click()
  await page.getByLabel('Search visitors').fill(first)
  const row = page.getByRole('row', { name: new RegExp(first) })
  await expect(row).toContainText('First visit')
  await expect(row).toContainText('A friend or family member')
  await expect(row).toContainText('To follow up')

  // Marked at another service: a repeat visitor
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const service = await (await request.post(`${API}/cms/services/`, { headers, data: { name: `Midweek ${unique()}`, date: yesterday } })).json()
  await page.goto(`/attendance/${service.id}`)
  await page.getByLabel('Check in').fill(`${first} Atieno`)
  await page.getByLabel('Check in').press('Enter')
  await expect(page.getByText(`${first} Atieno checked in.`)).toBeVisible()
  await page.goto('/visitors')
  await page.getByLabel('Search visitors').fill(first)
  await expect(row).toContainText('2 visits')

  // Followed up and welcomed as a member
  await row.click()
  const panel = page.getByRole('dialog', { name: `${first} Atieno` })
  await expect(panel.getByRole('listitem')).toHaveCount(2)
  await panel.getByRole('button', { name: 'Become a member' }).click()
  await page.getByRole('dialog', { name: `Welcome ${first} as a member` }).getByRole('button', { name: 'Make them a member' }).click()
  await expect(page.getByText(new RegExp(`${first} Atieno is now member \\w+`))).toBeVisible()
  await page.getByRole('button', { name: 'Became members' }).click()
  await expect(row).toBeVisible()
})

test('ushers add a visitor straight onto a service', async ({ page, request }) => {
  const headers = await authHeader(request, ACCOUNTS.super)
  const name = `Sunday ${unique()}`
  const service = await (await request.post(`${API}/cms/services/`, { headers, data: { name, date: new Date().toISOString().slice(0, 10) } })).json()
  const first = uniqueName('Baraka')

  await login(page, ACCOUNTS.super)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto(`/attendance/${service.id}`)
  await page.getByRole('button', { name: 'Add visitor' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add visitor' })
  await dialog.getByLabel('First name *').fill(first)
  await dialog.getByRole('button', { name: 'Add and mark present' }).click()
  await expect(page.getByText(`${first} added as a visitor and checked in.`)).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(first) })).toContainText('visitor')
  await expect(page.locator('main').getByText('Visitors', { exact: true }).locator('..')).toContainText('1')
})
