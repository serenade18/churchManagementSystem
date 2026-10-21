import { expect, test, type Page } from '@playwright/test'
import { ACCOUNTS, login, sidebarLinks } from './fixtures.js'

// The e2e backend serves a church, not mkanisa.com: sign in for real as the church owner, then let the
// app see the platform (branding) and answer the platform's own endpoints with this overview.
const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
const OVERVIEW = {
  period: '12m',
  today: '2026-10-21',
  churches: { live: 48, new_this_month: 3, joined_this_year: 27, pending: 1, closed: 1, own_paybill: 31 },
  members: { total: 21430, new_30_days: 612 },
  giving: {
    this_month: '11200000.00', last_month: '16400000.00', change: -31.7,
    series: months.map((label, i) => ({ start: `2026-${String(i + 1).padStart(2, '0')}-01`, label, amount: String((10 + i) * 1e6), partial: i === 11 })),
    channels: [
      { key: 'prompt', label: 'Mobile money prompt', amount: '6500000.00', share: 58 },
      { key: 'paybill', label: 'Paybill', amount: '3800000.00', share: 34 },
      { key: 'paypal', label: 'Card / PayPal', amount: '600000.00', share: 5 },
      { key: 'recorded', label: 'Recorded by staff', amount: '300000.00', share: 3 },
    ],
  },
  prompts: { sent_30_days: 18904, confirmed_rate: 94.2, change_points: -0.6 },
  sms: { sent_30_days: 38210, ok_rate: 98.1 },
  growth: months.map((label, i) => ({ start: `2026-${i + 1}-01`, label, churches: 21 + i * 2 + (i === 11 ? 5 : 0) })),
  attention: [
    { kind: 'failing', church: 5, name: 'PCEA Ruai', text: '4 M-PESA prompts failed in the last day and none went through.' },
    { kind: 'unallocated', church: 4, name: "St Andrew's", url: 'https://standrews.mkanisa.com', text: "14 Paybill payments couldn't be matched to a gift code." },
    { kind: 'waiting', church: 9, name: 'Grace Fellowship', username: 'graceowner', text: "Registered 2 days ago; the owner hasn't confirmed their phone." },
  ],
  church_rows: [
    { id: 1, name: 'Neema Community Church', slug: 'neema', url: 'https://neema.mkanisa.com', domain: 'neema.mkanisa.com', status: 'open', members: 2140,
      given_this_month: '1420000.00', change: 12, weekly: ['8', '9', '9', '11', '10', '12', '11', '13', '12', '14', '13', '15'], own_paybill: true, created_at: '2025-01-01' },
    { id: 5, name: 'PCEA Ruai', slug: 'ruai', url: 'https://ruai.mkanisa.com', domain: 'ruai.mkanisa.com', status: 'open', members: 640,
      given_this_month: '220000.00', change: -31, weekly: ['5', '5', '6', '5', '6', '5', '6', '5', '4', '3', '2', '2'], own_paybill: true, created_at: '2025-01-01' },
    { id: 9, name: 'Grace Fellowship', slug: 'grace', url: 'https://grace.mkanisa.com', domain: 'grace.mkanisa.com', status: 'pending', members: 0,
      given_this_month: '0.00', change: null, weekly: Array(12).fill('0'), own_paybill: false, created_at: '2026-10-19' },
  ],
}

async function asPlatformAdmin(page: Page) {
  await page.route('**/api/branding/', async (route) => {
    const res = await route.fetch()
    await route.fulfill({ response: res, json: { ...(await res.json()), name: 'mKanisa', platform: true } })
  })
  const periods: string[] = []
  await page.route('**/api/platform/overview/**', (route) => {
    const period = new URL(route.request().url()).searchParams.get('period') || '12m'
    periods.push(period)
    route.fulfill({ json: { ...OVERVIEW, period } })
  })
  await page.route('**/api/platform/churches/**', (route) => route.fulfill({ json: [
    { id: 5, name: 'PCEA Ruai', slug: 'ruai', custom_domain: null, url: 'https://ruai.mkanisa.com', domain: 'ruai.mkanisa.com', is_active: true, is_listed: true,
      mpesa_shortcode: '174379', mpesa_shortcode_type: 'Paybill', has_own_mpesa: true, sasapay_merchant_code: '', admin_count: 2, member_count: 640, created_at: '2025-01-01' },
  ] }))
  await login(page, ACCOUNTS.super)
  await expect(page).toHaveURL(/\/platform$/)
  return periods
}

test.describe('Platform overview', () => {
  test('headline numbers, charts and the platform menu', async ({ page }) => {
    await asPlatformAdmin(page)
    await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible()
    await expect(sidebarLinks(page)).toHaveText(['Overview', 'Churches', 'Registrations', 'Payments', 'SMS', 'Platform admins', 'Settings'])
    await expect(page.getByRole('img', { name: 'mKanisa' }).first()).toBeVisible()

    await expect(page.getByText('Churches live')).toBeVisible()
    await expect(page.getByText('21,430')).toBeVisible()
    await expect(page.getByText('94.2%')).toBeVisible()
    await expect(page.getByText('−0.6 pts')).toBeVisible()
    await expect(page.getByText('98.1%')).toBeVisible()

    // How people give, and the Paybill split
    const channels = page.getByRole('region', { name: 'How people give' })
    await expect(channels).toContainText('Mobile money prompt')
    await expect(channels).toContainText('58%')
    await expect(channels).toContainText('31 of 48')
  })

  test('the giving chart has a hover tooltip, a table and periods', async ({ page }) => {
    const periods = await asPlatformAdmin(page)
    const giving = page.getByRole('region', { name: 'Giving across all churches' })
    await giving.getByRole('img').locator('rect[aria-label^="Sep"]').hover()
    await expect(giving.getByRole('status')).toContainText('KES 20M')

    await giving.getByRole('button', { name: 'Show as a table' }).click()
    await expect(giving.getByRole('table')).toContainText('(so far)')
    await giving.getByRole('button', { name: 'Show as a chart' }).click()

    await page.getByRole('radio', { name: '30 days' }).click()
    await expect(page.getByRole('radio', { name: '30 days' })).toHaveAttribute('aria-checked', 'true')
    await expect.poll(() => periods.at(-1)).toBe('30d')
    await expect(giving).toContainText('by day')
  })

  test('needs attention links to the fix', async ({ page }) => {
    await asPlatformAdmin(page)
    const attention = page.getByRole('region', { name: 'Needs attention' })
    await expect(attention.getByRole('listitem')).toHaveCount(3)
    await expect(attention.getByRole('listitem').first()).toContainText('Failing')
    await expect(attention.getByRole('link', { name: /Open their Paybill/ })).toHaveAttribute('href', 'https://standrews.mkanisa.com/paybill')

    let resent = ''
    await page.route('**/api/platform/registrations/*/resend/', (route) => {
      resent = new URL(route.request().url()).pathname
      route.fulfill({ json: { detail: 'A new code was sent to 0711 ••• 001.' } })
    })
    await attention.getByRole('button', { name: /Resend code/ }).click()
    await expect(attention.getByText('A new code was sent to 0711 ••• 001.')).toBeVisible()
    expect(resent).toBe('/api/platform/registrations/9/resend/')

    // "Check M-PESA keys" opens that church's settings.
    await attention.getByRole('link', { name: /Check M-PESA keys/ }).click()
    await expect(page).toHaveURL(/\/platform\/churches$/)
    await expect(page.getByRole('dialog', { name: 'Edit PCEA Ruai' })).toBeVisible()
  })

  test('the churches table searches and filters', async ({ page }) => {
    await asPlatformAdmin(page)
    const table = page.getByRole('region', { name: 'Churches' })
    await expect(table.getByRole('row')).toHaveCount(4) // header + 3
    await expect(table.getByRole('row').nth(1)).toContainText('Neema Community Church')
    await expect(table.getByRole('row').nth(3)).toContainText('Waiting on owner')

    await table.getByPlaceholder('Search churches').fill('ruai')
    await expect(table.getByRole('row')).toHaveCount(2)
    await table.getByPlaceholder('Search churches').fill('')
    await table.getByLabel('Status').selectOption('pending')
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(table.getByRole('row').nth(1)).toContainText('Grace Fellowship')

    await page.getByRole('link', { name: 'Add a church' }).click()
    await expect(page.getByRole('dialog', { name: 'Add a church' })).toBeVisible()
  })
})
