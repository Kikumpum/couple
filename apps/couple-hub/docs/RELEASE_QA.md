# Verification And Remaining Work

This is a separate, locally runnable implementation, not a replacement for the newer application already on GitHub main.

## Verified Locally

- Lint and strict TypeScript checks pass.
- 15 automated tests pass, including route lifecycle/ownership/consent/SSE assertions, 13 UTC cycle tests, and market-provider mapping tests.
- Actual HTTP smoke test passes: separate sessions, shared record mutation, SSE invalidation, authorized re-fetch, and access removal after disconnect. Temporary test accounts are deleted afterward.
- Real provider smoke requests succeeded for BBCA (IDR), AAPL (USD), XRP (IDR), and HYPE (USD). Tests do not assert that market prices will remain available.
- Browser checks: login, saving transactions, books, period records with an omitted end date, goals without deadlines, and account-specific market watchlists. Values remain after reload.
- Desktop 1440px and mobile 390px layouts inspected. No horizontal overflow observed. Screenshots are checkout-local QA artifacts, not repository content.
- Book-reference covers that resolve load successfully; unavailable covers use a non-image fallback. Reference selection opens a populated book form without inventing ratings or page counts.
- User provisioning accepts credentials through hidden stdin, stores salted password hashes, and does not create seed accounts from committed credentials.

## Explicit Limits

- SQLite local storage requires a persistent disk and a single logical database. It is not a Vercel/serverless database adapter. PostgreSQL migration remains necessary for that deployment target.
- SQLite is experimental in Node 22; this implementation requires Node 22.13+.
- Data-at-rest encryption, backup restore drills, email verification/recovery, independent security audit, and deployment hardening are not completed.
- SSE invalidations target roughly one-second local updates, subject to transport/proxy availability. Reconnect and periodic refresh are fallbacks, not an uptime guarantee.
- Market polling runs every 60 seconds while the finance screen is visible. Exchange data may be delayed or reflect the last closed session. Yahoo's endpoint has no public API SLA; licensing must be reviewed before commercial redistribution.
- Netflix picks and book/comic references are editorial links, not live catalogs or individualized AI recommendations. Netflix availability must be checked on the linked title page.
- TMDB now-playing data requires a server-side token. Without it, the UI presents an explicit configuration-unavailable state rather than old sample movies.
- XXI studio showtimes are linked to official South Jakarta theater pages. They are not scraped, cached, or represented as verified live schedules in the app.
- Automatic background push notifications are not implemented; reminders are in-app records only.

## Commands

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

With the dev server running on port 3010:

```sh
node tests/http-smoke.mjs
node scripts/smoke-markets.mjs
```

Both smoke scripts create disposable local accounts and remove them in cleanup. They never use real user passwords.
