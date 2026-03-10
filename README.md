# PEDANG88 Lucky Spin Analytics Dashboard

A production-ready analytics dashboard for PEDANG88 Lucky Spin operations.

This project includes:
- **Frontend**: Next.js (React) admin dashboard UI
- **Backend**: Node.js + Express analytics API
- **Database**: MySQL schema and seed data for Lucky Spin reporting

## Project Overview
The dashboard provides operational visibility for Lucky Spin performance, including:
- KPI cards: search hits, logins, visitors, claimed vouchers, distributed vouchers, total prize out
- Activity trend chart
- Prize distribution chart
- Conversion funnel
- Latest voucher claims table
- Top lucky spin users table
- Filters (search, prize, date range), pagination, CSV export
- Loading, error, and empty states

## Folder Structure
```text
.
├── backend
│   ├── package.json
│   ├── sql
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── src
│       ├── db.js
│       └── server.js
├── frontend
│   ├── package.json
│   ├── next.config.mjs
│   └── app
│       ├── globals.css
│       ├── layout.js
│       └── page.js
├── package.json
└── README.md
```

## Install Steps
From repository root:
```bash
npm install
```

## Database Setup Steps
1. Ensure MySQL is running.
2. Create schema/tables:
```bash
mysql -u root -p < backend/sql/schema.sql
```
3. Seed sample data:
```bash
mysql -u root -p < backend/sql/seed.sql
```

## Environment Variables
Create `backend/.env`:
```env
PORT=4000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pedang88_lucky_spin
FRONTEND_ORIGIN=http://localhost:3000
```

Optional frontend override (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000/api
```

## How to Run Frontend and Backend
### Option A: Run both from monorepo root
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

### Option B: Run independently
Backend:
```bash
npm run dev -w backend
```

Frontend:
```bash
npm run dev -w frontend
```

Production mode (after build):
```bash
npm run build
npm run start
```

## Available API Endpoints
Base URL: `http://localhost:4000`

- `GET /health`
- `GET /api/summary`
- `GET /api/activity`
- `GET /api/claims`
- `GET /api/top-users`
- `GET /api/prize-distribution`
- `GET /api/funnel`
- `GET /api/alerts`

### Shared Query Parameters (where applicable)
- `search` (string)
- `prize` (string, use `all` for no prize filter)
- `startDate` (`YYYY-MM-DD`)
- `endDate` (`YYYY-MM-DD`)
- `page` (number, for paginated endpoints)
- `pageSize` (number, max 100)
