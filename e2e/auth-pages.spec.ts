import { expect, test } from '@playwright/test'
import { ACCOUNTS, latestCode, randomPhone, unique } from './fixtures.js'

test.describe('Staff sign-in page', () => {
  test('a wrong password shows a calm error and marks the password', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await page.getByLabel('Username').fill(ACCOUNTS.clerk.username)
    await page.getByLabel('Password', { exact: true }).fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toHaveText('Incorrect username or password.')
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  })

  test('points members to My giving and staff to signing up', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText("You don't need an account here.")).toBeVisible()
    await page.getByRole('link', { name: /Sign in to My giving/ }).click()
    await expect(page).toHaveURL(/\/me$/)
    await expect(page.getByRole('heading', { name: 'My giving' })).toBeVisible()

    await page.goto('/admin')
    await page.getByRole('link', { name: 'Create a staff account' }).click()
    await expect(page).toHaveURL(/\/signup$/)
    await expect(page.getByRole('heading', { name: 'Create a staff account' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Your details' })).toHaveAttribute('aria-current', 'step')
  })
})

test('the signup code step can go back to change the number', async ({ page, request }) => {
  const id = unique().toLowerCase()
  const [phone, normalised] = randomPhone()
  await page.goto('/signup')
  await page.getByLabel('First name').fill('Ruth')
  await page.getByLabel('Last name').fill('Njeri')
  await page.getByLabel('Email').fill(`ruth.${id}@example.org`)
  await page.getByLabel('Phone number').fill(phone)
  await page.getByLabel('Username').fill(`ruth${id}`)
  await page.getByLabel('Password', { exact: true }).fill('Strong-pass-2026')
  await page.getByLabel('Confirm password').fill('Strong-pass-2026')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByRole('heading', { name: 'Check your phone' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Confirm your phone' })).toHaveAttribute('aria-current', 'step')
  await expect(page.getByText(/New code in \d:\d\d/)).toBeVisible() // resend waits a minute
  await latestCode(request, normalised)
  // Only the last 3 digits of the number are shown.
  await expect(page.getByText(`••• ${normalised.slice(-3)}`).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verify and continue' })).toBeDisabled()
  await page.getByLabel('Verification code').fill('12ab34') // letters are dropped
  await expect(page.getByLabel('Verification code')).toHaveValue('1234')

  await page.getByRole('button', { name: 'Change number' }).click()
  await expect(page.getByRole('heading', { name: 'Create a staff account' })).toBeVisible()
})

test.describe('Member portal sign-in', () => {
  test('the code step shows a masked number and can go back', async ({ page }) => {
    const [phone, normalised] = randomPhone()
    await page.goto('/me')
    await expect(page.getByText('Member portal')).toBeVisible()
    await expect(page.getByText('Every gift, with its receipt')).toBeVisible()
    await page.getByLabel('Your phone number').fill(phone)
    await page.getByRole('button', { name: 'Send me a code' }).click()

    await expect(page.getByRole('heading', { name: 'Enter the code' })).toBeVisible()
    await expect(page.getByText(`••• ${normalised.slice(-3)}`)).toBeVisible()
    await expect(page.getByText(/New code in \d:\d\d/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    await page.getByRole('button', { name: 'Use a different number' }).click()
    await expect(page.getByRole('heading', { name: 'My giving' })).toBeVisible()

    // A second number (the first must wait a minute before another code).
    await page.getByLabel('Your phone number').fill(randomPhone()[0])
    await page.getByRole('button', { name: 'Send me a code' }).click()
    await expect(page.getByRole('heading', { name: 'Enter the code' })).toBeVisible()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByLabel('Your phone number')).toBeVisible()
  })

  test('a wrong code is refused', async ({ page, request }) => {
    const [phone, normalised] = randomPhone()
    await page.goto('/me')
    await page.getByLabel('Your phone number').fill(phone)
    await page.getByRole('button', { name: 'Send me a code' }).click()
    await expect(page.getByRole('heading', { name: 'Enter the code' })).toBeVisible()
    const code = await latestCode(request, normalised)
    await page.getByLabel('6-digit code').fill(code === '000000' ? '111111' : '000000')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Enter the code' })).toBeVisible()
  })

  test('links to joining the church', async ({ page }) => {
    await page.goto('/me')
    await page.getByRole('link', { name: 'Not a member yet? Join the church' }).click()
    await expect(page).toHaveURL(/\/register$/)
    await expect(page.getByRole('heading', { name: 'Join the church' })).toBeVisible()
  })
})

test.describe('Joining the church', () => {
  test('visitors are asked fewer questions than members', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('radio', { name: 'A member' })).toBeChecked()
    await expect(page.getByLabel('Other names')).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Female' })).toBeVisible()

    await page.getByText('A visitor').click()
    await expect(page.getByRole('radio', { name: 'A visitor' })).toBeChecked()
    await expect(page.getByLabel('Other names')).toBeHidden()
    await expect(page.getByRole('radio', { name: 'Female' })).toBeHidden()
  })

  test('a visitor sends their details and is thanked by name', async ({ page }) => {
    await page.goto('/register')
    await page.getByText('A visitor').click()
    await page.getByLabel('First name').fill('Wanjiku')
    await page.getByLabel('Last name').fill(`Visitor${unique()}`)
    await page.getByLabel('Phone number').fill(randomPhone()[0])
    await page.getByText('A note for the church').click()
    await page.getByLabel('How did you hear about us?').fill('A friend invited me.')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Send my details' }).click()

    await expect(page.getByRole('heading', { name: 'Thank you, Wanjiku!' })).toBeVisible()
    await expect(page.getByRole('link', { name: /See your giving/ })).toBeVisible()
    await page.getByRole('button', { name: 'Register someone else' }).click()
    await expect(page.getByRole('heading', { name: 'Join the church' })).toBeVisible()
    await expect(page.getByLabel('First name')).toHaveValue('')
  })

  test('a member who picks a gender sends it', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('First name').fill('Otieno')
    await page.getByLabel('Last name').fill(`Member${unique()}`)
    await page.getByLabel('Phone number').fill(randomPhone()[0])
    await page.getByText('Male', { exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Male', exact: true })).toBeChecked()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Send my details' }).click()
    await expect(page.getByRole('heading', { name: 'Thank you, Otieno!' })).toBeVisible()
  })
})
