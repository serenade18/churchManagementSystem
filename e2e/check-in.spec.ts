import { expect, test } from '@playwright/test'
import { ACCOUNTS, API, MEMBER, authHeader, login, smsTo, unique } from './fixtures.js'

// Members checking themselves in: scanning a check-in QR code, and opening their own SMS link.

const first = MEMBER.name.split(' ')[0]

test('admins make check-in codes and members scan one to check in', async ({ page, request }) => {
  await login(page, ACCOUNTS.super)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/attendance')
  const codes = page.getByRole('region', { name: 'Check-in QR codes' })
  await expect(codes.getByRole('listitem', { name: 'Sunday service' })).toBeVisible()

  const name = `Kesha ${unique()}`
  await codes.getByRole('button', { name: 'New check-in code' }).click()
  await page.getByRole('dialog').getByLabel('Name *').fill(name)
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  const card = codes.getByRole('listitem', { name })
  await expect(card.getByRole('img', { name: `QR code to check in to ${name}` })).toBeVisible()
  const link = await card.getByRole('link').getAttribute('href')

  // The member scans it, on their own phone
  const phone = await page.context().browser()!.newPage()
  await phone.goto(new URL(link!).pathname)
  await expect(phone.getByRole('heading', { level: 1, name })).toBeVisible()
  await phone.getByLabel('Your phone number').fill(`0${MEMBER.phone.slice(3)}`)
  await phone.getByRole('button', { name: 'I’m here' }).click()
  const who = phone.getByRole('group', { name: /Who’s here/ })
  if (await who.isVisible().catch(() => false)) { // others share the test member's phone
    await who.getByRole('checkbox', { name: new RegExp(`^${first}`) }).check()
    await phone.getByRole('button', { name: 'Check us in' }).click()
  }
  await expect(phone.getByRole('heading', { name: new RegExp(`You’re checked in, .*${first}`) })).toBeVisible()

  // The phone remembers the number; a second scan the same day changes nothing
  await phone.reload()
  await expect(phone.getByLabel('Your phone number')).toHaveValue(`0${MEMBER.phone.slice(3)}`)

  // The admin sees the day's list, with how and when
  await page.reload()
  await expect(card).toContainText('1 checked in today')
  await card.getByRole('button', { name: 'Today’s list' }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(MEMBER.name) })).toContainText(/QR \d\d:\d\d/)
  await phone.close()

  // ...and in the day-by-day report
  await page.goto('/attendance')
  const daily = page.getByRole('region', { name: 'Daily attendance' })
  await expect(daily.getByRole('row', { name: new RegExp(name) })).toContainText(/\d+ by QR/)

  const headers = await authHeader(request, ACCOUNTS.super)
  expect((await request.get(`${API}/cms/services/?search=${encodeURIComponent(name)}`, { headers })).ok()).toBeTruthy()
})

test('members confirm from the link in their SMS', async ({ page, request }) => {
  const headers = await authHeader(request, ACCOUNTS.super)
  const name = `Service ${unique()}`
  const res = await request.post(`${API}/cms/services/`, { headers, data: { name, date: new Date().toISOString().slice(0, 10) } })
  const service = await res.json()

  await login(page, ACCOUNTS.super)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto(`/attendance/${service.id}`)
  await page.getByRole('button', { name: 'Send check-in links' }).click()
  const dialog = page.getByRole('dialog', { name: 'Send check-in links' })
  await expect(dialog).toContainText(`are you at ${name} today? Tap to confirm:`)
  await dialog.getByRole('button', { name: /^Send \d+ SMS$/ }).click()
  await expect(page.getByText(/Check-in links sent to \d+ member/)).toBeVisible()

  const sms = (await smsTo(request, MEMBER.phone)).filter((m) => m.text.includes(name) && m.text.includes(`${first},`)).at(-1)
  const path = sms!.text.match(/\/a\/\w+/)![0]
  await page.goto(path)
  await expect(page.getByRole('heading', { name: `Thank you, ${first}!` })).toBeVisible()
  await expect(page.getByRole('status')).toContainText(`marked present at ${name}`)
  await page.reload()
  await expect(page.getByRole('heading', { name: `Already confirmed, ${first}` })).toBeVisible()
})
