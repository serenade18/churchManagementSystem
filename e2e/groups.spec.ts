import { expect, test } from '@playwright/test'
import { ACCOUNTS, API, MEMBER, authHeader, login, unique } from './fixtures.js'

// Departments and groups: the owner makes one and names its team lead; the team lead, with no other
// role, signs in to their own group and manages its members.

test('a team lead manages the members of their own group', async ({ page, request }) => {
  const headers = await authHeader(request, ACCOUNTS.super)
  const lead = { username: `lead${unique().toLowerCase()}`, password: 'Lead-pass-2026!' }
  const created = await request.post(`${API}/cms/users/`, { headers, data: {
    ...lead, first_name: 'Tabitha', last_name: 'Lead', is_active: true, roles: [{ role: 'team_lead', branches: [] }],
  } })
  expect(created.ok(), await created.text()).toBeTruthy()
  const choir = `Choir ${unique()}`

  // The owner creates the department and chooses its team lead
  await login(page, ACCOUNTS.super)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('link', { name: 'Departments & groups' }).click()
  await page.getByRole('button', { name: 'New department or group' }).click()
  const form = page.getByRole('dialog', { name: 'New department or group' })
  await form.getByLabel('Name *').fill(choir)
  await form.getByRole('checkbox', { name: new RegExp(`Tabitha Lead \\(${lead.username}\\)`) }).check()
  await form.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { level: 1, name: choir })).toBeVisible()
  await expect(page.getByText('Led by Tabitha Lead')).toBeVisible()
  await page.evaluate(() => localStorage.clear())

  // The team lead signs in: straight to the groups they lead, and nothing else
  await login(page, lead)
  await expect(page).toHaveURL(/\/groups$/)
  await expect(page.locator('aside nav a')).toHaveText(['Departments & groups', 'Settings'])
  await expect(page.getByText('Team lead', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: choir }).click()

  await page.getByLabel('Add members').fill(MEMBER.name)
  await page.getByRole('button', { name: `Add ${MEMBER.name}` }).first().click()
  await expect(page.getByText(`${MEMBER.name} added to ${choir}.`)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Members (1)' })).toBeVisible()

  await page.getByRole('button', { name: `Remove ${MEMBER.name}` }).click()
  await page.getByRole('dialog', { name: 'Remove member' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('heading', { name: 'Members (0)' })).toBeVisible()
  // Running the department itself stays with the owner
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0)
})
