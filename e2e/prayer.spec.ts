import { expect, test } from '@playwright/test'
import { ACCOUNTS, login, unique } from './fixtures.js'

// Prayer requests: someone sends one from the church's /pray page; a leader prays and follows up.

test('a prayer request reaches the church leaders', async ({ page }) => {
  const words = `Pray for our new baby ${unique()}`
  await page.goto('/')
  await page.getByRole('link', { name: /Prayer request/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Send a prayer request' })).toBeVisible()
  await page.getByLabel('What would you like us to pray for?').fill(words)
  await page.getByLabel(/Your name/).fill('amani kioko')
  await page.getByRole('checkbox', { name: /call or visit/ }).check()
  await page.getByRole('button', { name: 'Send my request' }).click()
  await expect(page.getByText('Give a phone number so someone can call you.')).toBeVisible()
  await page.getByLabel(/Phone number/).fill('0712 345 999')
  await page.getByRole('button', { name: 'Send my request' }).click()
  await expect(page.getByRole('heading', { name: 'Your request is with us' })).toBeVisible()
  await expect(page.getByText('Thank you, Amani. The church will be praying with you.')).toBeVisible()

  await login(page, ACCOUNTS.super)
  await expect(page).toHaveURL(/\/dashboard$/)
  const card = page.getByRole('region', { name: 'Prayer requests' })
  await expect(card).toContainText(words)
  await page.getByRole('link', { name: /Prayer requests/ }).first().click()
  await page.getByRole('button', { name: new RegExp(words) }).click()
  const panel = page.getByRole('dialog', { name: 'From Amani Kioko' })
  await expect(panel).toContainText('Would like a call')
  await expect(panel.getByRole('link', { name: '+254712345999' })).toBeVisible()
  await panel.getByLabel('Note for the leaders').fill('Called on Monday, will visit on Saturday')
  await panel.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('tab', { name: 'Praying' }).click()
  await expect(page.getByRole('button', { name: new RegExp(words) })).toContainText('Called on Monday')
})

test("the church's site has a way in for its admins", async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Admin login' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})
