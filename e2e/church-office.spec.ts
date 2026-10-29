import { expect, test } from '@playwright/test'
import { ACCOUNTS, API, MEMBER, authHeader, login, smsTo, unique } from './fixtures.js'

// The church office pages as redesigned: the dashboard, members, a member, a service and Bulk SMS,
// against the real API.

test.beforeEach(async ({ page }) => {
  await login(page, ACCOUNTS.super)
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('the dashboard greets, shows the numbers and records a gift', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), / })).toBeVisible()
  await expect(page.getByText('Active members', { exact: true })).toBeVisible()
  await expect(page.getByText('Given this year', { exact: true }).first()).toBeVisible()

  const giving = page.getByRole('region', { name: 'Giving', exact: true })
  await giving.getByRole('button', { name: 'Show as a table' }).click()
  await expect(giving.getByRole('table')).toContainText('(so far)')
  await giving.getByRole('button', { name: 'Show as a chart' }).click()
  await expect(giving.getByRole('img')).toBeVisible()

  await expect(page.getByRole('region', { name: 'Latest gifts' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Sunday attendance' })).toBeVisible()

  await page.getByRole('button', { name: 'Record a gift' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')

  // One branch at a time
  const branch = page.getByRole('combobox', { name: 'Show branch' })
  if (await branch.isVisible()) {
    const reply = page.waitForResponse((r) => r.url().includes('/cms/dashboard/?branch='))
    await branch.selectOption({ index: 1 })
    expect((await reply).ok()).toBeTruthy()
  }
})

test('the dashboard shares the church page as a link and a QR code', async ({ page }) => {
  const share = page.getByRole('region', { name: 'Share your church page' })
  const host = new URL(page.url()).host
  await expect(share.getByRole('img', { name: `QR code for ${host}` })).toBeVisible()
  await expect(share.getByRole('link', { name: host })).toHaveAttribute('href', `${new URL(page.url()).origin}/`)

  const download = page.waitForEvent('download')
  await share.getByRole('button', { name: 'Download QR code' }).click()
  expect((await download).suggestedFilename()).toMatch(/-qr\.png$/)
})

test('members show their activity and the summary tiles', async ({ page }) => {
  await page.getByRole('link', { name: 'Members', exact: true }).click()
  for (const tile of ['Active members', 'Gave this month', 'Away 4+ weeks', 'Have no phone']) {
    await expect(page.getByText(tile, { exact: true })).toBeVisible()
  }
  await expect(page.getByRole('columnheader', { name: 'Last gift · last at church' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Given this year' })).toBeVisible()

  await page.getByPlaceholder('Search name, number, phone…').fill(MEMBER.number)
  await page.getByRole('row', { name: new RegExp(MEMBER.name) }).click()
  await expect(page.getByRole('heading', { level: 1, name: MEMBER.name })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Giving', exact: true })).toContainText('All time')
  await expect(page.getByRole('list', { name: 'Last 12 Sundays' }).getByRole('listitem')).toHaveCount(12)
})

test('a service counts first-timers and checks people in by name', async ({ page, request }) => {
  const headers = await authHeader(request, ACCOUNTS.super)
  const name = `Service ${unique()}`
  const res = await request.post(`${API}/cms/services/`, { headers, data: { name, date: new Date().toISOString().slice(0, 10), visitor_count: 5, first_timers: 2 } })
  expect(res.status()).toBe(201)
  const service = await res.json()
  expect(service.first_timers).toBe(2)
  const tooMany = await request.post(`${API}/cms/services/`, { headers, data: { name, date: service.date, visitor_count: 1, first_timers: 3 } })
  expect(tooMany.status()).toBe(400)

  await page.goto(`/attendance/${service.id}`)
  await expect(page.getByText('5 (2 new)')).toBeVisible()
  await page.getByLabel('Check in').fill(MEMBER.name)
  await page.getByLabel('Check in').press('Enter')
  await expect(page.getByText(`${MEMBER.name} checked in.`)).toBeVisible()
  await page.getByLabel('Check in').fill('Nobody Byth-isname')
  await page.getByLabel('Check in').press('Enter')
  await expect(page.getByText(/No one on this list matches/)).toBeVisible()
})

test('Bulk SMS sends a test to my own phone first', async ({ page, request }) => {
  await page.getByRole('link', { name: 'Bulk SMS' }).click()
  const text = `Test ${unique()}: see you Sunday, {first_name}`
  await page.getByLabel('Message').fill(text)
  await expect(page.getByText(/\d+ characters · 1 SMS/)).toBeVisible()
  await page.getByRole('button', { name: 'Send me a test' }).click()
  await expect(page.getByText(/^Sent to your phone/)).toBeVisible()
  await expect.poll(async () => (await smsTo(request, ACCOUNTS.super.phone)).at(-1)?.text).toContain(text.split(':')[0])
})
