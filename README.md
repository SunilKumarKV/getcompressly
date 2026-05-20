# GetCompressly

GetCompressly is a production-ready PDF and image compression SaaS monorepo with React, Vite, TypeScript, Tailwind CSS, Express, Prisma, PostgreSQL, BullMQ, Redis, sharp, and optional Ghostscript/qpdf PDF compression.

## Apps

- `frontend`: React + Vite + TypeScript + Tailwind CSS
- `backend`: Node.js + Express API + TypeScript + Prisma
- `backend worker`: BullMQ worker for compression and cleanup
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
pnpm --filter @getcompressly/backend worker
```

Backend runs on `http://localhost:5000`; frontend runs on `http://localhost:5173`. Compression requires Redis because API requests enqueue work and the worker processes it asynchronously.

## Environment

Backend:

```bash
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/getcompressly?schema=public
JWT_SECRET=replace-with-a-long-random-secret
COOKIE_SECRET=replace-with-a-long-random-cookie-secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE_MB=25
FREE_MAX_FILE_SIZE_MB=10
PRO_MAX_FILE_SIZE_MB=200
UPLOAD_DIR=uploads
TEMP_FILE_EXPIRY_HOURS=24
FREE_DAILY_LIMIT=5
PRO_DAILY_LIMIT=100
REDIS_URL=redis://localhost:6379
STORAGE_PROVIDER=local
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
TRUST_PROXY=1
MAX_PDF_PAGES=300
MAX_IMAGE_DIMENSION=10000
MAX_IMAGE_PIXELS=100000000
CLAMAV_ENABLED=false
CLAMAV_HOST=
CLAMAV_PORT=
APP_URL=http://localhost:5173
API_URL=http://localhost:5000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_YEARLY=
RESEND_API_KEY=
EMAIL_FROM=hello@getcompressly.com
```

Frontend:

```bash
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=
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
pnpm --filter @getcompressly/backend worker
pnpm --filter @getcompressly/backend build
pnpm --filter @getcompressly/backend start
pnpm --filter @getcompressly/backend start:worker
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

The API creates `PENDING` compression jobs and returns immediately. A separate BullMQ worker updates jobs to `PROCESSING`, `COMPLETED`, or `FAILED`. The frontend polls `GET /api/compress/jobs/:id` and only shows downloads for completed jobs.

## Billing

Stripe powers subscription billing. The backend creates Checkout Sessions and Billing Portal sessions; plan changes are applied only from verified Stripe webhooks.

Required Stripe setup:

1. Create monthly and yearly recurring Stripe prices for GetCompressly Pro.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, and `STRIPE_PRICE_YEARLY`.
3. Create a webhook endpoint at `https://api.getcompressly.com/api/billing/webhook`.
4. Subscribe to `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
5. Set `STRIPE_WEBHOOK_SECRET`.

Local webhook testing:

```bash
stripe listen --forward-to localhost:5000/api/billing/webhook
stripe trigger checkout.session.completed
```

The app stores Stripe webhook event IDs in `WebhookEvent` so duplicate events are ignored safely.

## Email

Resend powers transactional email for verification, password reset, download-ready notifications, and payment receipt notifications.

Required Resend setup:

1. Verify `getcompressly.com` in Resend.
2. Create an API key.
3. Set `RESEND_API_KEY` and `EMAIL_FROM=hello@getcompressly.com`.
4. In production, missing Resend env vars fail startup through config validation.

Password reset and email verification tokens are hashed before storage and expire server-side.

## Health Checks

- `GET /api/health`: basic API/database health.
- `GET /api/live`: liveness check for process monitors.
- `GET /api/ready`: readiness check for database, Redis when configured, and storage provider.

## Docker

```bash
docker compose up --build
pnpm --filter @getcompressly/backend prisma migrate deploy
```

The backend and worker images install Ghostscript, qpdf, and poppler-utils for production-like PDF handling.

## Deployment

Production target:

- App domain: `getcompressly.com`
- API domain: `api.getcompressly.com`
- Frontend: Vercel
- Backend API: Railway or Render web service
- Worker: Railway or Render background worker service
- Database: Neon PostgreSQL
- Redis: Upstash Redis
- Storage: S3 in production, local storage for development

Frontend on Vercel:

- Root directory: `frontend`
- Build command: `pnpm build`
- Output directory: `dist`
- Set `VITE_API_URL=https://api.getcompressly.com/api`

Backend on Render or Railway:

- Root directory: `backend`
- Build command: `pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build`
- Start command: `pnpm start`
- Set `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `CORS_ORIGIN=https://getcompressly.com`, `TRUST_PROXY=1`, and storage/limit env vars

Worker on Render or Railway:

- Root directory: `backend`
- Build command: `pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build`
- Start command: `pnpm start:worker`
- Set the same `DATABASE_URL`, `REDIS_URL`, and `STORAGE_PROVIDER` env vars as the API
- Also set Stripe and Resend env vars on the API service. The worker can send download-ready emails, so set `RESEND_API_KEY` and `EMAIL_FROM` there too.

Storage:

- Development: `STORAGE_PROVIDER=local`
- Production: `STORAGE_PROVIDER=s3` plus `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_S3_BUCKET`

ClamAV:

- Leave `CLAMAV_ENABLED=false` for local development.
- In production, set `CLAMAV_ENABLED=true`, `CLAMAV_HOST`, and `CLAMAV_PORT`.
- If ClamAV is enabled but unavailable, uploads fail safely instead of pretending a scan passed.

PostgreSQL:

- Neon is recommended for managed PostgreSQL.
- Run migrations in production with `pnpm --filter @getcompressly/backend prisma migrate deploy`.

## Manual Testing Checklist

- Register a new user and confirm redirect to dashboard.
- Log out and log back in.
- Upload JPG, PNG, and WebP files on `/compress`.
- Confirm jobs move through `PENDING`, `PROCESSING`, and `COMPLETED`.
- Upload a PDF on a server without Ghostscript/qpdf and confirm a clear failed job message.
- Confirm dashboard history displays completed and failed jobs.
- Confirm download works from tokenized URLs.
- Confirm expired downloads return `410`.
- Confirm `.exe`, `.js`, `.sh`, `.php`, `.bat`, `.apk`, `.zip`, `.rar`, `.html`, `.svg`, and unknown binaries are rejected.
- Confirm guest/free files above 10 MB are rejected and Pro limits can allow up to 200 MB.
- Confirm logout revokes the refresh session and refresh no longer works.
- Confirm rate limits trigger for repeated auth and compression attempts.
- Confirm Stripe checkout opens for monthly and yearly plans.
- Confirm Stripe webhook upgrades a user to `PRO_MONTHLY` or `PRO_YEARLY`.
- Confirm billing portal opens for subscribed users.
- Confirm dashboard shows subscription status, renewal date, usage, bytes saved, and job progress.
- Confirm failed jobs can retry until `MAX_JOB_RETRIES`.
- Confirm queued/processing jobs can be canceled.
- Confirm guest recovery token restores guest job history until expiry.
- Confirm forgot password and verify email flows send Resend emails.
- Run `pnpm --filter @getcompressly/backend cleanup` and verify expired jobs are removed.
- Run `pnpm build` before deployment.

## Payments

Pricing and plan structures are present. Razorpay/Stripe integration should be added behind a billing service and webhook route without changing compression limits or auth contracts.
