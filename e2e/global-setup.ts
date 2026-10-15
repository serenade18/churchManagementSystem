import { request } from '@playwright/test'
import { API } from './fixtures.js'

// Start every run from the same seed data (see `manage.py e2e_seed` in pceaBackend).
export default async function globalSetup() {
  const ctx = await request.newContext()
  const res = await ctx.post(`${API}/e2e/reset/`)
  if (!res.ok()) throw new Error(`E2E reset failed (${res.status()}). Is the backend running with config.settings_e2e?`)
  await ctx.dispose()
}
