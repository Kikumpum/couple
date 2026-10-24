# A&Z Hub Deployment Runbook

## Monorepo build boundaries

The existing Vercel project builds the application at the repository root. Keep
that project's Root Directory at the repository root. Its TypeScript includes
only `src/**/*.ts`, `src/**/*.tsx`, Next-generated types, and `next-env.d.ts`;
root ESLint ignores `apps/**`. The nested app has its own configuration and alias.

Check both the actual deployment target and the isolated app, not just the latter:

```bash
npm ci
node scripts/check-project-boundaries.mjs
npm run build
```

The failed preview for commit `a6ee218` included nested app files in the root
TypeScript project. As a result, `@/server/auth` was resolved against root `src/`
instead of `apps/couple-hub/src/`. Do not suppress TypeScript errors or switch the
production Root Directory to hide this problem.

`apps/couple-hub` currently uses local SQLite and is not a Vercel-compatible data
backend. Deploying the newer authenticated app requires a persistent cloud data
adapter and separately provisioned accounts. Local user databases and credentials
must not be committed or copied into deployment artifacts. This build fix does
not migrate, reset, or publish local user data.

The root dependency lockfile now includes compatible security updates, including
Next.js 15.5.28 and patched PostCSS. The audit still reports three high-severity
transitive development-tool findings in the Prisma CLI/config/deepmerge-ts chain.
Those require a separately tested Prisma-toolchain remediation; this preview fix
does not force a Prisma major upgrade or claim a clean security audit.

## Current readiness

- `npm run build` must pass before every deploy.
- Runtime secrets must be configured in the hosting dashboard, not committed.
- The current dashboard still stores several user-entered items in browser `localStorage`.
- Prisma schema exists, but production migrations are not created yet.

## Required environment variables

Set these in Vercel Project Settings > Environment Variables for Production and Preview:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_URL="https://your-production-domain"
NEXT_PUBLIC_APP_URL="https://your-production-domain"
TMDB_API_KEY=""
NEWS_API_KEY=""
FINNHUB_API_KEY=""
TWELVE_DATA_API_KEY=""
```

Use Vercel Sensitive Environment Variables for API keys and database credentials when available.

## Deploy path

1. Create a managed PostgreSQL database.
   Recommended options: Neon, Supabase, Railway, or Vercel Postgres.
2. Put the database connection string in `DATABASE_URL`.
3. Create Prisma migrations before using the database in production:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Commit `prisma/migrations`.
5. Run a local production build:
   ```bash
   npm run deploy:check
   ```
6. Push to GitHub.
7. Import the GitHub repository into Vercel.
8. Add the environment variables above in Vercel.
9. Deploy from Vercel dashboard, or from CLI:
   ```bash
   npm run deploy:vercel
   ```

## Railway PostgreSQL setup

Railway can be used for the shared production database.

1. Create a Railway project.
2. Add a PostgreSQL database service.
3. Copy the public PostgreSQL connection URL.
4. Add it to Vercel as `DATABASE_URL`.
5. Make sure the URL includes SSL when required by the provider, for example:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
   ```
6. After migrations exist in `prisma/migrations`, run:
   ```bash
   npm run prisma:migrate:deploy
   ```

The dashboard now has `/api/dashboard/state` for shared tabungan, jajan, period settings, and journal state. It uses the `DashboardState` table and falls back to browser `localStorage` if the database is not ready.

After `DATABASE_URL` is set in Vercel, run the production migration before relying on sync:

```bash
npm run prisma:migrate:deploy
```

Portfolio preferences still use browser `localStorage`.

## Database migration in production

Use this command for production/staging databases:

```bash
npm run prisma:migrate:deploy
```

Do not use `prisma migrate dev` against production.

## Security checklist before real private use

- Add authentication before exposing the app publicly.
- Move tabungan, jajan, period settings, and journal data from `localStorage` to PostgreSQL.
- Ensure every database query is scoped by `coupleId`.
- Keep `DATABASE_URL`, `AUTH_SECRET`, `TMDB_API_KEY`, and `NEWS_API_KEY` server-side only.
- Do not create `NEXT_PUBLIC_*` API keys.
- Enable database backups.
- Restrict Vercel project access to trusted accounts only.
- Do not log finance, journal, or period data in server logs.

## Demo deployment

The app can be deployed as a demo now. For production use with sensitive data, finish the security checklist first.
