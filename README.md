# Church Management System (frontend)

React admin portal + public M-PESA giving page for the PCEA Milele church management system.
It talks to the Django API in [`pceaBackend`](https://github.com/serenade18/pceaBackend).

## Features

- **Public giving page** (`/`): M-PESA STK push, with live payment status. Givers can also give towards a project.
- **Admin login** (`/login`): only staff accounts can sign in (JWT).
- **Dashboard**: giving today, this month, this year and all time; a 12-month trend; giving by type; top branches; project progress; recent donations.
- **Members**: register with search and filters (branch, status, gender), member profile with full giving history, CSV export.
- **Donations**: every M-PESA payment appears automatically. You can also record cash, bank and cheque giving, filter by date, type, status, channel, branch or project, see totals, and export to CSV. M-PESA donations can be re-assigned (member, branch, project, type) but not altered.
- **Branches**: congregations with member counts and total giving.
- **Projects**: fundraising target vs. amount raised, branch-specific or church-wide.
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
