# Budget Tracker

A personal & family budget management app built with Next.js. Tracks accounts,
transactions, loans between people, committee savings circles (including a
Waiyk/bidding variant), savings goals, investments, and property installment
plans. Defaults to PKR currency and the Asia/Karachi timezone.

## Tech stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **Styling:** Tailwind CSS + Radix UI primitives
- **Database:** PostgreSQL, accessed via Prisma ORM
- **Auth:** NextAuth (credentials login, JWT sessions)
- **Validation:** Zod
- **Money math:** decimal.js (avoids floating-point rounding errors)
- **Tests:** Vitest
- **PWA:** installable, works offline via a custom service worker

## Prerequisites

- Node.js 18+
- A PostgreSQL database (the project is built against [Neon](https://neon.tech), but any Postgres instance works)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file and fill in your own values:

   ```bash
   cp .env.example .env
   ```

   See [Environment variables](#environment-variables) below for what each value means.

3. Apply the database migrations:

   ```bash
   npm run db:migrate:prod
   ```

4. (Optional) Seed the database with demo data:

   ```bash
   npm run db:seed
   ```

   This creates a demo user you can log in with: `demo@budgettracker.com` / `demo1234`.

5. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret used to sign NextAuth session tokens. Generate one with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL of the app (e.g. `http://localhost:3000` in dev) |
| `TZ` | *(optional)* Server-side timezone, defaults to `Asia/Karachi` |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint the codebase |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Push the Prisma schema directly to the database, skipping migration history — only for quick local prototyping, never for real schema changes |
| `npm run db:migrate` | Create a new migration file from your schema changes and apply it locally |
| `npm run db:migrate:prod` | Apply all pending migrations (used for fresh setups, CI, and production) |
| `npm run db:seed` | Seed the database with demo data |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:reset` | Reset the database (drops all data) |

## Project structure

```
src/
├── app/
│   ├── (auth)/          # login, register
│   ├── (dashboard)/     # accounts, transactions, loans, committees,
│   │                    # savings, investments, plots, reports, targets, search, settings
│   └── api/             # API route handlers, one folder per resource
├── components/
│   ├── shared/          # sidebar, topbar, providers, PWA install prompt
│   └── ui/               # shared UI primitives (button, card, table, modal, etc.)
├── hooks/                # shared React hooks
├── lib/
│   ├── auth.ts           # NextAuth config and auth helpers
│   ├── prisma.ts         # Prisma client singleton
│   ├── calculations/     # balance, Waiyk committee math, etc.
│   └── validations/      # Zod schemas
└── types/                 # shared TypeScript types
```

Route protection is handled in `src/middleware.ts` — every route requires a
session except `/login`, `/register`, `/api/auth/*`, and static assets.

## Database migrations

Schema changes are tracked as versioned migrations in `prisma/migrations/`.

- Changing the schema? Edit `prisma/schema.prisma`, then run `npm run db:migrate`
  and give the migration a descriptive name. This creates a new folder under
  `prisma/migrations/` — commit it along with your code changes.
- Setting up a fresh database (new environment, CI, production)? Run
  `npm run db:migrate:prod` to apply every migration in order.
- Avoid `npm run db:push` outside of quick local experiments — it doesn't
  create a migration file, so it silently drifts the database away from the
  tracked history.

## Known gaps

- **No family/account sharing yet** — the database schema supports it
  (`SharedAccess` model), but no API or UI exists.
- **No file attachments yet** — the schema supports attaching receipts to
  transactions, but no upload flow is implemented.
- **No CI/CD** — no GitHub Actions workflow or deployment config yet.
