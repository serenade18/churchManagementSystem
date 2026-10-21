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

  test("shows mKanisa's own side and sends church people to their church", async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByText('Platform admin', { exact: true })).toBeVisible()
    await expect(page.getByText('For the people who run mKanisa.')).toBeVisible()
    await expect(page.getByText('Add a church and invite its first owner')).toBeVisible()
    await expect(page.getByText(/^yourchurch\..+\/admin$/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Find your church' })).toHaveAttribute('href', '/#directory')
    await expect(page.getByText('For mKanisa staff only')).toBeVisible()
    // Platform signup is reached by its address only.
    await expect(page.getByRole('link', { name: /Create .*account/ })).toHaveCount(0)
    await expect(page.getByText("You don't need an account here.")).toHaveCount(0)
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
