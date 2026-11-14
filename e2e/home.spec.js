import { expect, test } from '@playwright/test'
import { ACCOUNTS, login } from './fixtures.js'

// The parish homepage at /: its own words, with the Paybill codes and project progress from the API.
test('the homepage shows the parish, its Paybill codes and the way in for staff', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /A household of faith/ })).toBeVisible()
  await expect(page.getByText('Every Sunday at Milele')).toBeVisible()

  const giving = page.locator('#give')
  await expect(giving.getByText('Paybill account codes')).toBeVisible()
  await expect(giving.getByRole('cell', { name: 'GEN', exact: true })).toBeVisible() // the default type is listed first
  await expect(giving.getByRole('cell').first()).toHaveText('GEN')
  await giving.getByRole('link', { name: 'Give online' }).click()
  await expect(page).toHaveURL(/\/give$/)

  await page.goto('/')
  await page.getByRole('link', { name: 'Staff sign in' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})

test('a homepage photo uploaded in Settings shows in the hero', async ({ page }) => {
  await login(page, ACCOUNTS.clerk)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('link', { name: 'Settings' }).click()
  // A tiny real JPEG
  const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')
  await page.getByText('Homepage photo (optional)').locator('..').locator('input[type=file]').setInputFiles({ name: 'church.jpg', mimeType: 'image/jpeg', buffer: jpeg })
  await page.getByRole('button', { name: 'Save branding' }).click()
  await page.waitForLoadState('networkidle')

  await page.goto('/')
  await expect(page.locator('#about img[src*="/branding/cover/"]')).toBeVisible()
})
