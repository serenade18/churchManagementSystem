import { expect, test } from '@playwright/test'
import { latestCode, randomPhone, unique } from './fixtures.js'

test('a new admin signs up, verifies their phone by SMS code and is signed in', async ({ page, request }) => {
  const id = unique().toLowerCase()
  const [phone, normalised] = randomPhone()
  await page.goto('/')
  await page.getByRole('link', { name: 'Create one' }).click()

  await page.getByLabel('First name').fill('Peter')
  await page.getByLabel('Last name').fill('Mwangi')
  await page.getByLabel('Email').fill(`peter.${id}@example.org`)
  await page.getByLabel('Phone number').fill(phone)
  await page.getByLabel('Username').fill(`peter${id}`)
  await page.getByLabel('Password', { exact: true }).fill('Strong-pass-2026')
  await page.getByLabel('Confirm password').fill('Strong-pass-2026')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Verify your phone number')).toBeVisible()
  const code = await latestCode(request, normalised)

  await page.getByLabel('Verification code').fill(code === '000000' ? '111111' : '000000')
  await page.getByRole('button', { name: 'Verify and sign in' }).click()
  await expect(page.getByText(/Incorrect code/)).toBeVisible()

  await page.getByLabel('Verification code').fill(code)
  await page.getByRole('button', { name: 'Verify and sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Peter Mwangi')).toBeVisible()
})

test('signup shows field errors from the server', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('First name').fill('Dup')
  await page.getByLabel('Last name').fill('User')
  await page.getByLabel('Email').fill(`dup.${unique().toLowerCase()}@example.org`)
  await page.getByLabel('Phone number').fill(randomPhone()[0])
  await page.getByLabel('Username').fill('clerk') // seeded, so taken
  await page.getByLabel('Password', { exact: true }).fill('Strong-pass-2026')
  await page.getByLabel('Confirm password').fill('Different-pass-2026')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('This username is taken.')).toBeVisible()
  await expect(page.getByText('Passwords do not match.')).toBeVisible()
})
