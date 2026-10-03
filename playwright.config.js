import { defineConfig, devices } from '@playwright/test'
import { API, BACKEND_URL, FRONTEND_URL } from './e2e/fixtures.js'

// End-to-end tests: the real React app against the real Django API (pceaBackend), running with
// config.settings_e2e — a throwaway SQLite database, fake SMS / M-PESA and no outbound network.
const BACKEND_DIR = process.env.BACKEND_DIR || '../pceaBackend'
const PYTHON = process.env.BACKEND_PYTHON || '.venv/bin/python'

export default defineConfig({
  testDir: './e2e',
  // One shared database, so run the specs one at a time.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/global-setup.js',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      // Optional: drive an installed Chromium-based browser instead of `npx playwright install chromium`.
      launchOptions: process.env.E2E_BROWSER_PATH ? { executablePath: process.env.E2E_BROWSER_PATH } : {},
    },
  }],
  webServer: [
    {
      command: `rm -f e2e.sqlite3 && ${PYTHON} manage.py migrate --noinput -v0 && ${PYTHON} manage.py runserver ${new URL(BACKEND_URL).host} --noreload`,
      cwd: BACKEND_DIR,
      env: { DJANGO_SETTINGS_MODULE: 'config.settings_e2e' },
      url: `${API}/e2e/sms/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${new URL(FRONTEND_URL).port} --strictPort`,
      env: { VITE_API_URL: API },
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
