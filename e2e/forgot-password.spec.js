import { expect, test } from '@playwright/test'
import { ACCOUNTS, latestCode, login, smsTo } from './fixtures.js'

const NEW_PASSWORD = 'Brand-new-pass-2026'

test('an admin resets a forgotten password with an SMS code', async ({ page, request }) => {
  const { username, password, phone } = ACCOUNTS.forgetful
  await page.goto('/')
  await page.getByLabel('Username').fill(username)
  await page.getByRole('link', { name: 'Forgot password?' }).click()

  await expect(page).toHaveURL(/\/forgot-password$/)
  await expect(page.getByLabel('Username or phone number')).toHaveValue(username) // carried over from sign in
  await page.getByRole('button', { name: 'Send code' }).click()
  await expect(page.getByText(/we sent a 6-digit code/)).toBeVisible()
  const code = await latestCode(request, phone)
  expect((await smsTo(request, phone)).at(-1).text).toContain('password reset code')

  // Mismatched passwords and a wrong code are both refused.
  await page.getByLabel('Code', { exact: true }).fill(code)
  await page.getByLabel(/^New password/).fill(NEW_PASSWORD)
  await page.getByLabel('Confirm new password').fill('something-else-2026')
  await page.getByRole('button', { name: 'Reset password and sign in' }).click()
  await expect(page.getByText('Passwords do not match.')).toBeVisible()

  await page.getByLabel('Code', { exact: true }).fill(code === '000000' ? '111111' : '000000')
  await page.getByLabel('Confirm new password').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Reset password and sign in' }).click()
  await expect(page.getByText(/Incorrect code/)).toBeVisible()

  await page.getByLabel('Code', { exact: true }).fill(code)
  await page.getByRole('button', { name: 'Reset password and sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  // The old password no longer works; the new one does.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await login(page, { username, password })
  await expect(page.getByText('Incorrect username or password.')).toBeVisible()
  await login(page, { username, password: NEW_PASSWORD })
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('the reply does not reveal whether an account exists', async ({ page, request }) => {
  const before = (await smsTo(request)).length
  await page.goto('/forgot-password')
  await page.getByLabel('Username or phone number').fill('no-such-admin')
  await page.getByRole('button', { name: 'Send code' }).click()
  await expect(page.getByText(/If an active admin account matches/)).toBeVisible()
  expect((await smsTo(request)).length).toBe(before)
})

test('a reset can be requested by phone number', async ({ page, request }) => {
  const before = (await smsTo(request, ACCOUNTS.clerk.phone)).length
  await page.goto('/forgot-password')
  await page.getByLabel('Username or phone number').fill('0700 000 002')
  await page.getByRole('button', { name: 'Send code' }).click()
  await expect(page.getByLabel('Code', { exact: true })).toBeVisible()
  await expect.poll(async () => (await smsTo(request, ACCOUNTS.clerk.phone)).length).toBe(before + 1)
})
