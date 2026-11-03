import { expect, test } from '@playwright/test'
import { ACCOUNTS, latestCode, login, randomPhone, smsTo, unique } from './fixtures.js'

test('someone registers on the public site, confirms their phone, and they sign in to the member portal', async ({ page, request }) => {
  const [phone, normalised] = randomPhone()
  const last = `Tester${unique()}`

  // The church's home page leads to registration.
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /^Welcome to / })).toBeVisible()
  await page.getByRole('link', { name: /Register/ }).first().click()
  await expect(page).toHaveURL(/\/register$/)

  await page.getByLabel('First name').fill('Amani')
  await page.getByLabel('Last name').fill(last)
  await page.getByLabel('Phone number').fill(phone)
  await page.getByText('More about you').click()
  await page.getByLabel('Anything you would like us to know?').fill('New to the area.')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Send my details' }).click()

  // They confirm their phone with the SMS code.
  await expect(page.getByRole('heading', { name: 'Enter the code' })).toBeVisible()
  await page.getByLabel('6-digit code').fill(await latestCode(request, normalised))
  await page.getByRole('button', { name: 'Confirm and join' }).click()
  await expect(page.getByRole('heading', { name: 'Thank you, Amani!' })).toBeVisible()
  // The sign-up is approved straight away: they get their membership number on screen and by SMS.
  const thanks = await page.getByText(/Your membership number is \S+\./).textContent()
  const number = thanks!.match(/Your membership number is (\S+)\./)![1]
  await login(page, ACCOUNTS.clerk)

  // They are welcomed by SMS with their membership number, and are on the member list.
  await expect.poll(async () => (await smsTo(request, normalised)).at(-1)?.text || '').toContain(`Your membership number is ${number}`)
  await page.getByRole('link', { name: 'Members', exact: true }).click()
  await page.getByPlaceholder(/Search/).first().fill(last)
  await expect(page.getByRole('row', { name: new RegExp(last) })).toContainText(number)

  // In the member portal they sign in with their phone and see their church.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.goto('/me')
  await page.getByLabel('Your phone number').fill(phone)
  await page.getByRole('button', { name: 'Send me a code' }).click()
  const code = await latestCode(request, normalised)
  await page.getByLabel('6-digit code').fill(code)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome, Amani!' })).toBeVisible()
  await page.getByRole('tab', { name: 'Churches' }).click()
  await expect(page.getByText(number)).toBeVisible()

  // Signing out asks for the phone again.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByLabel('Your phone number')).toBeVisible()
})
