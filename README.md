# Church Management System (frontend)

React admin portal + public M-PESA giving page for the PCEA Milele church management system.
It talks to the Django API in [`pceaBackend`](https://github.com/serenade18/pceaBackend).

## Features

- **Public giving page** (`/give`): M-PESA STK push, with live payment status. Givers can also give towards a project.
- **Admin login** (`/`, the landing page): only staff accounts can sign in (JWT). Signed-in admins go straight to the dashboard.
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
