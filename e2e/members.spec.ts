import { expect, test } from '@playwright/test'
import { ACCOUNTS, login, unique } from './fixtures.js'

test.beforeEach(async ({ page }) => {
  await login(page, ACCOUNTS.clerk)
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('add a branch, then a member in it, and find them again', async ({ page }) => {
  const id = unique()
  const branch = `Kahawa ${id}`
  await page.getByRole('link', { name: 'Branches' }).click()
  await page.getByRole('button', { name: 'Add branch' }).click()
  await page.getByLabel('Name *').fill(branch)
  await page.getByLabel('Code').fill(`K${id}`.slice(0, 12))
  await page.getByLabel('Location').fill('Kahawa West')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: branch })).toBeVisible()

  await page.getByRole('link', { name: 'Members' }).click()
  await page.getByRole('button', { name: 'Add member' }).click()
  await page.getByLabel('Membership number *').fill(`E${id}`.slice(0, 12))
  await page.getByLabel('First name *').fill('Peter')
  await page.getByLabel('Last name *').fill(`Kamau${id}`)
  await page.getByLabel('Phone number').fill('254722000111')
  await page.getByLabel('Branch').selectOption({ label: branch })
  await page.getByRole('button', { name: 'Save member' }).click()

  await expect(page).toHaveURL(/\/members\/\d+$/)
  await expect(page.getByRole('heading', { name: `Peter Kamau${id}` })).toBeVisible()

  await page.getByRole('link', { name: 'Members' }).click()
  await page.getByPlaceholder('Search name, number, phone…').fill(`Kamau${id}`)
  const row = page.getByRole('row', { name: new RegExp(`Kamau${id}`) })
  await expect(row).toBeVisible()
  await expect(row).toContainText(branch)
  await expect(page.getByRole('row')).toHaveCount(2) // header + the one match
})

test('a duplicate membership number is refused', async ({ page }) => {
  await page.getByRole('link', { name: 'Members' }).click()
  await page.getByRole('button', { name: 'Add member' }).click()
  await page.getByLabel('Membership number *').fill('M0001') // seeded
  await page.getByLabel('First name *').fill('Copy')
  await page.getByLabel('Last name *').fill('Cat')
  await page.getByRole('button', { name: 'Save member' }).click()
  await expect(page.getByText(/already exists/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save member' })).toBeVisible() // still on the form
})
