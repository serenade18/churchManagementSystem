import { expect, test, type Page } from '@playwright/test'
import { ACCOUNTS, latestCode, randomPhone, unique } from './fixtures.js'

const SETUP_KEY = 'e2e-setup-key' // config.settings_e2e; the platform falls back to it

/** Show the app as mkanisa.com: the e2e backend serves a church, so mark its branding as the platform's. */
async function asPlatform(page: Page) {
  await page.route('**/api/branding/', async (route) => {
    const res = await route.fetch()
    await route.fulfill({ response: res, json: { ...(await res.json()), name: 'mKanisa', platform: true } })
  })
}

test.describe('Platform admin sign-in', () => {
  test.beforeEach(async ({ page }) => asPlatform(page))

  test("shows mKanisa's own side, with ways in for churches and members", async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'mKanisa' })).toBeVisible() // the ivory wordmark, not a church's logo
    await expect(page.getByText('Every church on mKanisa, looked after from one place.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Bring your church' })).toHaveAttribute('href', '/start')
    await expect(page.getByRole('link', { name: /Sign in to My giving/ })).toHaveAttribute('href', '/me')
    // The badge is for the hidden platform signup; church staff sign in here too.
    await expect(page.getByText('Platform admin', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Create a staff account' })).toHaveCount(0)
  })

  test('church staff signing in here are taken to their own church office', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Admin login' }).first().click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    // The platform answers a church's staff with a one-time link into their office (see test_handoff.py)
    await page.route('**/api/auth/login/', (route) => route.fulfill({ status: 400, json: {
      detail: "Church admins sign in at their church's address.", church_url: ['https://kikuyu.mkanisa.com'],
      open_url: [new URL('/admin/open#e2e-token', page.url()).href],
    } }))
    await page.getByLabel('Username').fill('kikuyu-owner')
    await page.getByLabel('Password', { exact: true }).fill('whatever-it-is')
    await page.unroute('**/api/branding/') // the link leads to the church's own address
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/admin\/open$/)
    await expect(page.getByRole('heading', { name: 'Opening the church office' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText("This link isn't valid.") // a made-up token, refused
  })

  test('a wrong password is refused', async ({ page }) => {
    await page.goto('/admin')
    await page.getByLabel('Username').fill(ACCOUNTS.super.username)
    await page.getByLabel('Password', { exact: true }).fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toHaveText('Incorrect username or password.')
  })
})

test.describe('Platform admin signup', () => {
  test.beforeEach(async ({ page }) => asPlatform(page))

  test('needs the setup key, then confirms the phone', async ({ page, request }) => {
    const id = unique().toLowerCase()
    const [phone, normalised] = randomPhone()
    await page.goto('/signup/platform')
    await expect(page.getByText('Step 1 of 2')).toBeVisible()
    await expect(page.getByText('Platform admin', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create a platform admin account' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Setup key and your details' })).toHaveAttribute('aria-current', 'step')
    await expect(page.getByText('PLATFORM_SETUP_KEY')).toBeVisible()
    await expect(page.getByText("This page isn't linked anywhere.")).toBeVisible()

    await page.getByLabel('Platform setup key').fill('not-the-key')
    await page.getByLabel('First name').fill('Anne')
    await page.getByLabel('Last name').fill('Kamau')
    await page.getByLabel('Email').fill(`anne.${id}@example.org`)
    await page.getByLabel('Phone number').fill(phone)
    await page.getByLabel('Username').fill(`anne${id}`)
    await page.getByLabel('Password', { exact: true }).fill('Strong-pass-2026')
    await page.getByLabel('Confirm password').fill('Strong-pass-2026')
    await page.getByRole('button', { name: 'Create platform admin account' }).click()
    await expect(page.getByText('Invalid setup key.')).toBeVisible()
    await expect(page.getByLabel('Platform setup key')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Platform setup key').fill(SETUP_KEY)
    await page.getByRole('button', { name: 'Create platform admin account' }).click()
    await expect(page.getByRole('heading', { name: 'Check your phone' })).toBeVisible()
    await expect(page.getByText('Step 2 of 2')).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Confirm your phone' })).toHaveAttribute('aria-current', 'step')

    const code = await latestCode(request, normalised)
    await page.getByLabel('Verification code').fill(code === '000000' ? '111111' : '000000')
    await page.getByRole('button', { name: 'Verify and open the platform' }).click()
    await expect(page.getByText(/Incorrect code/)).toBeVisible()
  })
})
