import { expect, test, type Page, type Route } from '@playwright/test'
import { ACCOUNTS, login, sidebarLinks } from './fixtures.js'

// As in platform-overview.spec: sign in for real as the church owner, show the platform's look, and
// answer the platform's own endpoints with sample data (the e2e backend serves a church).
const today = new Date().toISOString()
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

const REGISTRATIONS = {
  stats: { registered_this_month: 3, opened_this_month: 1, minutes_to_open: 4, waiting: 1, oldest_waiting_days: 2 },
  period: 'month',
  counts: { waiting: 1, opened: 1, expired: 1, all: 3 },
  results: [
    { id: 9, name: 'Grace Fellowship', slug: 'grace', domain: 'grace.mkanisa.com', url: 'https://grace.mkanisa.com', location: 'Thika', status: 'waiting',
      created_at: hoursAgo(50), opened_at: null, minutes_to_open: null,
      owner: { name: 'Peter Mwangi', username: 'graceowner', phone: '0722 ••• 418', email: 'peter@grace.org', codes_sent: 3 },
      log: [{ at: hoursAgo(50), what: 'registered', by: null }, { at: hoursAgo(50), what: 'code_sent', by: null }, { at: hoursAgo(2), what: 'code_resent', by: 'Anne Kamau' }] },
    { id: 4, name: 'Neema Community Church', slug: 'neema', domain: 'neema.mkanisa.com', url: 'https://neema.mkanisa.com', location: 'Kasarani', status: 'opened',
      created_at: hoursAgo(100), opened_at: hoursAgo(99.9), minutes_to_open: 6,
      owner: { name: 'Joyce Wanjiru', username: 'joyce', phone: '0733 ••• 902', email: 'joyce@neema.org', codes_sent: 1 },
      log: [{ at: hoursAgo(100), what: 'registered', by: null }, { at: hoursAgo(99.9), what: 'opened', by: null }] },
    { id: 7, name: "St Mark's", slug: 'stmarks', domain: 'stmarks.mkanisa.com', url: 'https://stmarks.mkanisa.com', location: 'Ruiru', status: 'expired',
      created_at: hoursAgo(400), opened_at: null, minutes_to_open: null,
      owner: { name: 'Daniel Kiprop', username: 'daniel', phone: '0790 ••• 554', email: 'd@x.org', codes_sent: 1 }, log: [] },
  ],
}

const church = { id: 5, name: 'PCEA Ruai', slug: 'ruai', url: 'https://ruai.mkanisa.com' }
const PAYMENTS = {
  days: 30,
  stats: { received_today: '412000.00', received_today_count: 1204, received_change: 8, prompts_sent: 18904, prompts_confirmed_rate: 94.2,
    unmatched: 14, unmatched_amount: '38200.00', waiting_over_an_hour: 3, paypal_month: '4120.00', paypal_month_kes: '535600.00', paypal_month_count: 12 },
  reasons: { failed: 100, sent: 18904, items: [
    { key: 'cancelled', label: 'Cancelled by the giver', count: 41, share: 41 }, { key: 'keys', label: "A church's M-PESA keys", count: 7, share: 7 }] },
  trouble: [
    { kind: 'failing', church, text: '4 prompts failed: “Invalid credentials”. None went through.' },
    { kind: 'stale', church: { ...church, id: 1, name: 'Neema' }, text: '3 prompts with no answer from M-PESA yet.' },
  ],
  total: 2, page: 1, has_more: false,
  results: [
    { key: 'prompt-1', at: today, church, channel: 'Prompt', from: '0711 ••• 001', amount: '2000.00', currency: 'KES', receipt: 'SJL7K2M9PQ', status: 'confirmed', reason: '', for: 'Tithe' },
    { key: 'paybill-2', at: today, church, channel: 'Paybill', from: '2547 ***** 552', amount: '1500.00', currency: 'KES', receipt: 'QXU1', status: 'unmatched', reason: 'Account “OFRING”', for: '' },
  ],
}

const SMS = {
  days: 30,
  stats: { sent: 38210, change: 6, accepted_rate: 98.1, refused: 725, receipts_per_gift: 1, churches_sending_bulk: 29, churches_live: 48 },
  series: Array.from({ length: 30 }, (_, i) => ({ day: new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10), count: i % 7 === 6 ? 3000 : 1200 })),
  kinds: [{ key: 'receipt', label: 'Gift receipt', count: 24870, share: 65 }, { key: 'bulk', label: 'Bulk message', count: 9940, share: 26 }],
  balance: { credits: 61400, days_left: 48, low: false, sender_id: 'MKANISA' },
  failures: [{ church: 'Deliverance Church Umoja', kind: 'invalid', count: 286, text: 'Invalid numbers (check them in the member list).' }],
  churches: [
    { id: 1, name: 'Neema Community Church', slug: 'neema', receipts: 4120, bulk: 1240, failed: 18, accepted_rate: 99.6, last_bulk: { text: 'Sunday service moves to 9:00', at: hoursAgo(48) } },
    { id: 2, name: 'Deliverance Church Umoja', slug: 'umoja', receipts: 2940, bulk: 2210, failed: 312, accepted_rate: 93.9, last_bulk: null },
  ],
}

async function asPlatformAdmin(page: Page) {
  await page.route('**/api/branding/', async (route) => {
    const res = await route.fetch()
    await route.fulfill({ response: res, json: { ...(await res.json()), name: 'mKanisa', platform: true } })
  })
  const calls: string[] = []
  const answer = (json: unknown) => (route: Route) => { calls.push(route.request().url()); return route.fulfill({ json }) }
  await page.route('**/api/platform/overview/**', answer({ period: '12m', today, churches: { live: 2, new_this_month: 0, joined_this_year: 2, pending: 1, closed: 0, own_paybill: 1 },
    members: { total: 0, new_30_days: 0 }, giving: { this_month: '0', last_month: '0', change: null, series: [], channels: [] },
    prompts: { sent_30_days: 0, confirmed_rate: null, change_points: null }, sms: { sent_30_days: 0, ok_rate: null }, growth: [], attention: [], church_rows: [] }))
  await page.route('**/api/platform/registrations/?**', answer(REGISTRATIONS))
  await page.route('**/api/platform/payments/?**', answer(PAYMENTS))
  await page.route('**/api/platform/sms/?**', answer(SMS))
  await page.route('**/api/platform/churches/**', (route) => route.fulfill({ json: [{ ...church, custom_domain: null, domain: 'ruai.mkanisa.com', is_active: true, is_listed: true,
    mpesa_shortcode: '174379', mpesa_shortcode_type: 'Paybill', has_own_mpesa: true, sasapay_merchant_code: '', admin_count: 1, member_count: 640, created_at: today }] }))
  await login(page, ACCOUNTS.super)
  await expect(page).toHaveURL(/\/platform$/)
  return calls
}

test.describe('Platform registrations', () => {
  test('lists registrations with their history, and the menu shows who is waiting', async ({ page }) => {
    await asPlatformAdmin(page)
    await expect(sidebarLinks(page).filter({ hasText: 'Registrations' })).toContainText('1')
    await page.getByRole('link', { name: /Registrations/ }).click()
    await expect(page.getByRole('heading', { name: 'Registrations', level: 1 })).toBeVisible()
    await expect(page.getByText('1 of 3')).toBeVisible()

    const table = page.getByRole('region', { name: 'Church registrations' })
    await expect(table.getByRole('row')).toHaveCount(4)
    await expect(table.getByRole('row', { name: /Grace Fellowship/ })).toContainText('3 codes sent')
    await expect(table.getByRole('row', { name: /Neema/ })).toContainText('Opened in 6 min')
    await expect(table.getByRole('row', { name: /St Mark/ })).toContainText('Expired')

    // The waiting one opens on the right, with what has happened.
    const detail = page.getByRole('complementary', { name: 'Grace Fellowship' })
    await expect(detail).toContainText('Code sent again by Anne Kamau')
    await expect(detail).toContainText('Owner enters the code; the church opens')
    await table.getByRole('row', { name: /Neema/ }).click()
    await expect(page.getByRole('complementary', { name: 'Neema Community Church' })).toContainText('Owner confirmed; the church opened')
  })

  test('resend and discard', async ({ page }) => {
    await asPlatformAdmin(page)
    await page.goto('/platform/registrations')
    let resent = ''
    await page.route('**/api/platform/registrations/9/resend/', (route) => { resent = route.request().method(); return route.fulfill({ json: { detail: 'A new code was sent to 0722 ••• 418.' } }) })
    await page.getByRole('complementary', { name: 'Grace Fellowship' }).getByRole('button', { name: 'Resend code' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'A new code was sent to 0722 ••• 418.' })).toBeVisible()
    expect(resent).toBe('POST')

    let discarded = ''
    await page.route('**/api/platform/registrations/7/', (route) => { discarded = route.request().method(); return route.fulfill({ status: 204, body: '' }) })
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('row', { name: /St Mark/ }).getByRole('button', { name: 'Discard' }).click()
    await expect(page.getByText("St Mark's's registration was discarded.")).toBeVisible()
    expect(discarded).toBe('DELETE')
  })

  test('tabs and search ask the server', async ({ page }) => {
    const calls = await asPlatformAdmin(page)
    await page.goto('/platform/registrations')
    await page.getByRole('tab', { name: /Waiting on owner/ }).click()
    await expect.poll(() => calls.at(-1)).toContain('status=waiting')
    await page.getByPlaceholder('Search church or owner').fill('grace')
    await expect.poll(() => calls.at(-1)).toContain('q=grace')
    await page.getByLabel('Period').selectOption('all')
    await expect.poll(() => calls.at(-1)).toContain('period=all')
  })
})

test.describe('Platform payments', () => {
  test('numbers, trouble, reasons and every payment', async ({ page }) => {
    const calls = await asPlatformAdmin(page)
    await page.getByRole('link', { name: 'Payments' }).click()
    await expect(page.getByRole('heading', { name: 'Payments', level: 1 })).toBeVisible()
    await expect(page.getByText('94.2%')).toBeVisible()
    await expect(page.getByText('KES 38.2K to allocate')).toBeVisible()

    const trouble = page.getByRole('region', { name: 'Churches with payment trouble' })
    await expect(trouble.getByRole('link', { name: 'Check keys' })).toHaveAttribute('href', '/platform/churches?edit=5')
    await page.route('**/api/platform/payments/check/1/', (route) => route.fulfill({ json: { detail: 'Asked M-PESA about 3 prompts; 2 answered.' } }))
    await trouble.getByRole('button', { name: 'Check status' }).click()
    await expect(page.getByText('Asked M-PESA about 3 prompts; 2 answered.')).toBeVisible()

    await expect(page.getByRole('region', { name: 'Why prompts fail' })).toContainText("A church's M-PESA keys")

    const list = page.getByRole('region', { name: 'Every payment' })
    await expect(list.getByRole('row', { name: /SJL7K2M9PQ/ })).toContainText('Confirmed')
    await expect(list.getByRole('row', { name: /QXU1/ })).toContainText('Account “OFRING”')
    await list.getByRole('tab', { name: /Failed/ }).click()
    await expect.poll(() => calls.at(-1)).toContain('tab=failed')
    await list.getByLabel('Channel').selectOption('paypal')
    await expect.poll(() => calls.at(-1)).toContain('channel=paypal')
    await list.getByLabel('Church', { exact: true }).selectOption('5')
    await expect.poll(() => calls.at(-1)).toContain('church=5')
    await page.getByLabel('Period').first().selectOption('7')
    await expect.poll(() => calls.at(-1)).toContain('days=7')
  })

  test('exports the list as CSV', async ({ page }) => {
    await asPlatformAdmin(page)
    await page.goto('/platform/payments')
    let asked = ''
    await page.route('**/api/platform/payments/?**export=csv**', (route) => { asked = route.request().url(); return route.fulfill({ body: 'Time,Church\n', contentType: 'text/csv' }) })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export CSV' }).click()
    expect((await download).suggestedFilename()).toBe('mkanisa-payments.csv')
    expect(asked).toContain('export=csv')
  })
})

test.describe('Platform SMS', () => {
  test('numbers, the daily chart, balance, failures and churches', async ({ page }) => {
    const calls = await asPlatformAdmin(page)
    await page.getByRole('link', { name: 'SMS', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'SMS', level: 1 })).toBeVisible()
    await expect(page.getByText('38,210').first()).toBeVisible()
    await expect(page.getByText('29 of 48')).toBeVisible()

    const chart = page.getByRole('region', { name: 'SMS sent per day' })
    await chart.locator('rect[aria-label]').last().hover()
    await expect(chart.getByRole('status')).toContainText('SMS')
    await chart.getByRole('button', { name: 'Show as a table' }).click()
    await expect(chart.getByRole('table').getByRole('row')).toHaveCount(31)

    await expect(page.getByRole('region', { name: 'Onfon SMS balance' })).toContainText('61,400')
    await expect(page.getByRole('region', { name: 'Onfon SMS balance' })).toContainText('MKANISA')
    await expect(page.getByRole('region', { name: 'Recent failures' })).toContainText('286 numbers')

    const byChurch = page.getByRole('region', { name: 'By church' })
    await expect(byChurch.getByRole('row', { name: /Neema/ })).toContainText('Sunday service moves to 9:00')
    await expect(byChurch.getByRole('row', { name: /Umoja/ })).toContainText('No bulk messages')
    await byChurch.getByPlaceholder('Search churches').fill('umoja')
    await expect(byChurch.getByRole('row')).toHaveCount(2)

    await page.getByLabel('Period').selectOption('90')
    await expect.poll(() => calls.at(-1)).toContain('days=90')
  })
})
