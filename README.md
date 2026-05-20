# GetCompressly

GetCompressly is a production-ready PDF and image compression SaaS monorepo with React, Vite, TypeScript, Tailwind CSS, Express, Prisma, PostgreSQL, sharp, and optional Ghostscript/qpdf PDF compression.

## Apps

- `frontend`: React + Vite + TypeScript + Tailwind CSS
- `backend`: Node.js + Express + TypeScript + Prisma
- `shared`: shared DTO and enum-style TypeScript types

## Branch Strategy

- `main` = production
- `develop` = active development
- `feature/*` = features
- `fix/*` = bug fixes
- `release/*` = release preparation
- `hotfix/*` = urgent production fixes

## Setup

```bash
pnpm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
pnpm --filter @getcompressly/backend prisma:generate
pnpm --filter @getcompressly/backend prisma:migrate
pnpm --filter @getcompressly/backend seed
pnpm dev
```

Backend runs on `http://localhost:5000`; frontend runs on `http://localhost:5173`.

## Environment

Backend:

```bash
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/getcompressly?schema=public
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE_MB=25
UPLOAD_DIR=uploads
TEMP_FILE_EXPIRY_HOURS=24
FREE_DAILY_LIMIT=5
PRO_DAILY_LIMIT=100
```

Frontend:

```bash
VITE_API_URL=http://localhost:5000/api
```

## Scripts

Root:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
```

Backend:

```bash
pnpm --filter @getcompressly/backend dev
pnpm --filter @getcompressly/backend build
pnpm --filter @getcompressly/backend start
pnpm --filter @getcompressly/backend prisma:generate
pnpm --filter @getcompressly/backend prisma:migrate
pnpm --filter @getcompressly/backend prisma:studio
pnpm --filter @getcompressly/backend seed
pnpm --filter @getcompressly/backend cleanup
```

Frontend:

```bash
pnpm --filter @getcompressly/frontend dev
pnpm --filter @getcompressly/frontend build
pnpm --filter @getcompressly/frontend preview
pnpm --filter @getcompressly/frontend lint
```

## Compression

Images use `sharp` and preserve JPG/JPEG, PNG, and WebP formats where possible.

- low: quality 85
- medium: quality 70
- high: quality 55

PDFs use Ghostscript first, then qpdf. If neither is installed, the job is marked failed with a clear error and the API process keeps running.

## Deployment

Frontend on Vercel:

- Root directory: `frontend`
- Build command: `pnpm build`
- Output directory: `dist`
- Set `VITE_API_URL=https://your-api.example.com/api`

Backend on Render or Railway:

- Root directory: `backend`
- Build command: `pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build`
- Start command: `pnpm start`
- Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, and upload/limit env vars

PostgreSQL:

- Neon is recommended for managed PostgreSQL.
- Run migrations in production with `pnpm --filter @getcompressly/backend prisma migrate deploy`.

## Manual Testing Checklist

- Register a new user and confirm redirect to dashboard.
- Log out and log back in.
- Upload JPG, PNG, and WebP files on `/compress`.
- Upload a PDF on a server without Ghostscript/qpdf and confirm a clear failed job message.
- Confirm dashboard history displays completed and failed jobs.
- Confirm download works from tokenized URLs.
- Run `pnpm --filter @getcompressly/backend cleanup` and verify expired jobs are removed.
- Run `pnpm build` before deployment.

## Payments

Pricing and plan structures are present. Razorpay/Stripe integration should be added behind a billing service and webhook route without changing compression limits or auth contracts.
