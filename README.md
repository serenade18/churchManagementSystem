# Church Management System (frontend)

React admin portal + public M-PESA giving page for the PCEA Milele church management system.
It talks to the Django API in [`pceaBackend`](https://github.com/serenade18/pceaBackend).

## Features

- **Public giving page** (`/give`): M-PESA STK push, with live payment status. Givers can also give towards a project.
- **Admin login** (`/`, the landing page): only staff accounts can sign in (JWT). Signed-in admins go straight to the dashboard.
- **Super admins** sign in to a **System overview** (`/super`): admin accounts, recent sign-ins and signups, and a system health checklist (M-PESA and SMS setup, callbacks, the pending-payment cron, SMS delivery; no secrets shown). Church data stays on the admin dashboard, which super admins can also open.
- **Super admin signup** (`/signup/superadmin`): needs the server's setup key (`SUPERADMIN_SETUP_KEY`) plus the SMS code.
- **Admin signup** (`/signup`): create an admin account, then enter the 6-digit code sent by SMS to verify the phone; verifying signs you in. An unverified account trying to sign in is offered "Verify my phone".
- **Dashboard**: giving today, this month, this year and all time; a 12-month trend; giving by type; top branches; project progress; recent donations.
- **Members**: register with search and filters (branch, status, gender), member profile with full giving history, CSV export.
- **Donations**: every M-PESA payment appears automatically. You can also record cash, bank and cheque giving, filter by date, type, status, channel, branch or project, see totals, and export to CSV. M-PESA donations can be re-assigned (member, branch, project, type) but not altered. Every successful donation sends the giver an SMS receipt; its delivery status shows in the list and can be resent.
- **Printable receipts & statements**: print (or save as PDF) an official receipt for any successful donation, and a giving statement for any member and period, from the Donations list, the donation editor and member profiles.
- **Branches**: congregations with member counts and total giving.
- **Projects**: fundraising target vs. amount raised, branch-specific or church-wide.
- **Paybill**: members pay to the Paybill with their phone number + a donation code as the account (e.g. `0712345678SCP`); payments are allocated and receipted automatically. Manage donation codes and allocate anything unrecognised from the Paybill page (the sidebar shows how many are waiting). A **Reconcile statement** tab imports any payments the system missed from an uploaded M-PESA statement.
- **Attendance**: create services (per branch or church-wide), tick members present or check them in by membership number, record visitors, export to CSV, see trends, and follow up (or SMS) members who have been away.
- **Bulk SMS**: message groups of members (by branch, status, gender) or specific people, with personalised placeholders, a live preview and a delivery log of sent and failed messages. Also reachable from the Members list and member profiles.
- **Admin users** (super admins only) and **Settings** (change password).

## Development

```bash
cp .env.example .env      # point VITE_API_URL at your API
npm install
npm run dev               # http://localhost:5173
```

## Production build

```bash
npm run build             # outputs to dist/
```

Upload the contents of `dist/` to the web root of `cms.pceamilele.or.ke`. The included
`.htaccess` routes every page to `index.html`, so links like `/members/12` work on Apache/cPanel.
`VITE_*` variables are baked in at build time, so set `.env` **before** building.

## End-to-end tests

Playwright drives this app against the real Django API in `../pceaBackend`. The backend runs with
`config.settings_e2e`: a throwaway SQLite database, fake SMS and M-PESA, and no outbound network.
Nobody gets texted or charged.

```bash
npx playwright install chromium   # once
npm run test:e2e                  # starts both servers, runs everything in e2e/
npm run test:e2e:ui               # same, in Playwright's UI mode
```

- Set `BACKEND_DIR` if the backend isn't at `../pceaBackend`, and `BACKEND_PYTHON` if its virtualenv isn't `.venv`.
- Set `E2E_BROWSER_PATH` to use an installed Chromium-based browser instead of Playwright's Chromium.
- Each run resets the database to the seed data in `pceaBackend/apps/e2e/management/commands/e2e_seed.py`.
- `e2e/api.spec.js` tests the backend's public M-PESA and auth endpoints over HTTP, the way Safaricom and the browser call them.
