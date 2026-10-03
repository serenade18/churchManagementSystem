import { expect, test } from '@playwright/test'
import { ACCOUNTS, login, sidebarLinks } from './fixtures.js'

test.describe('Sign in', () => {
  test('rejects a wrong password', async ({ page }) => {
    await login(page, { username: 'clerk', password: 'not-the-password' })
    await expect(page.getByText('Incorrect username or password.')).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })

  test('show password toggles what was typed', async ({ page }) => {
    await page.goto('/')
    const password = page.getByLabel('Password', { exact: true })
    await password.fill('secret-123')
    await expect(password).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(password).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(password).toHaveAttribute('type', 'password')
  })

  test('an admin lands on the dashboard with the church menu, then signs out', async ({ page }) => {
    await login(page, ACCOUNTS.clerk)
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(sidebarLinks(page)).toHaveText(
      ['Dashboard', 'Members', 'Donations', 'Paybill', 'Attendance', 'Branches', 'Projects', 'Bulk SMS', 'Settings'],
    )
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('a super admin lands on the system overview and only sees admin pages', async ({ page }) => {
    await login(page, ACCOUNTS.super)
    await expect(page).toHaveURL(/\/super$/)
    await expect(page.getByRole('heading', { name: 'System overview' })).toBeVisible()
    await expect(sidebarLinks(page)).toHaveText(['System', 'Admin Users', 'Settings'])
  })

  test('a signed-out visitor is sent to sign in, then back to the page they wanted', async ({ page }) => {
    await page.goto('/members')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await page.getByLabel('Username').fill(ACCOUNTS.clerk.username)
    await page.getByLabel('Password', { exact: true }).fill(ACCOUNTS.clerk.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/members$/)
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible()
  })

  test('an admin cannot open super admin pages', async ({ page }) => {
    await login(page, ACCOUNTS.clerk)
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto('/users')
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})
