import { expect, test } from '@playwright/test'
import { ACCOUNTS, login, unique } from './fixtures.js'

test('a super admin adds an admin who can then sign in', async ({ page, browser }) => {
  const username = `deacon${unique().toLowerCase()}`
  await login(page, ACCOUNTS.super)
  await page.getByRole('link', { name: 'Admin Users' }).click()
  await page.getByRole('button', { name: 'Add admin' }).click()
  await page.getByLabel('Username *').fill(username)
  await page.getByLabel('First name').fill('Daniel')
  await page.getByLabel('Last name').fill('Otieno')
  await page.getByLabel(/^Password \*/).fill('Deacon-pass-2026')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('row', { name: new RegExp(username) })).toContainText('Active')

  const other = await browser.newPage()
  await login(other, { username, password: 'Deacon-pass-2026' })
  await expect(other).toHaveURL(/\/dashboard$/)
  await other.close()
})

test('an admin changes their own password in Settings', async ({ page }) => {
  // Use a fresh admin so other specs keep the seeded passwords.
  const username = `elder${unique().toLowerCase()}`
  await login(page, ACCOUNTS.super)
  await page.getByRole('link', { name: 'Admin Users' }).click()
  await page.getByRole('button', { name: 'Add admin' }).click()
  await page.getByLabel('Username *').fill(username)
  await page.getByLabel(/^Password \*/).fill('Elder-pass-2026')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('row', { name: new RegExp(username) })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()

  await login(page, { username, password: 'Elder-pass-2026' })
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByLabel('Current password').fill('wrong-password')
  await page.getByLabel('New password', { exact: true }).fill('Elder-new-2026')
  await page.getByLabel('Confirm new password').fill('Elder-new-2026')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByText('Current password is incorrect.')).toBeVisible()

  await page.getByLabel('Current password').fill('Elder-pass-2026')
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByText('Your password has been updated.')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await login(page, { username, password: 'Elder-new-2026' })
  await expect(page).toHaveURL(/\/dashboard$/)
})
