# Contributing to GetCompressly

Thank you for contributing to GetCompressly.

## Branch Workflow

1. Create a branch from `develop`.
2. Keep changes scoped and production-safe.
3. Open a pull request using the PR template.
4. Do not merge until build and review checks are complete.

## Local Setup

```bash
pnpm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
pnpm --filter @getcompressly/backend prisma:generate
pnpm --filter @getcompressly/backend prisma:migrate
pnpm dev
```

Run the worker separately when testing compression jobs:

```bash
pnpm --filter @getcompressly/backend worker
```

## Development Rules

- Use PNPM only.
- Do not commit `.env` files or real secrets.
- Keep upload validation strict.
- Do not weaken auth, session, billing, webhook, or download-token security.
- Keep database migrations production-safe.
- Update README or `.env.example` when setup requirements change.
- Include Prisma migrations when schema changes are made.

## Before Opening a Pull Request

```bash
pnpm lint
pnpm build
```

Also manually test affected flows, especially upload, compression, download, auth, billing, worker behavior, and deployment-related changes.
