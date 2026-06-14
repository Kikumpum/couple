# Couple Hub Architecture

## Stack

- Next.js App Router for the web app and route handlers.
- Tailwind CSS for responsive UI and dark mode.
- PostgreSQL for relational data on Vercel Postgres, Neon, Supabase, or Railway.
- Prisma as the typed data layer.
- NextAuth/Auth.js with the Prisma adapter.
- Vercel Cron for daily market refresh, period predictions, and scheduled partner notifications.
- Web Push or Firebase Cloud Messaging for browser/mobile push notifications.

## Core Modules

- `cycle-care`: period logs, prediction helpers, fertile-window calculation, partner reminders.
- `shared-wealth`: finance CRUD, savings goals, investment holdings, price snapshots.
- `shared-library`: categorized reading list, status tracking, ratings.
- `movie-radar`: TMDB now-playing feed with poster, synopsis, region, and rating.
- `notifications`: consent-aware notification preferences and scheduled delivery logs.

## API Recommendations

| Domain | Recommended API | Notes |
| --- | --- | --- |
| Movies | TMDB API | Use `/movie/now_playing` with `region=ID` and `language=id-ID`. |
| Crypto | Binance public Spot REST API | `/api/v3/ticker/24hr` is used without an API key for BTC/ETH/XRP USDT pairs. |
| US stocks | Finnhub or Twelve Data | Server-side route handler keeps `FINNHUB_API_KEY` / `TWELVE_DATA_API_KEY` out of the browser. |
| IDX / IHSG | Twelve Data index symbol or IDX specialist feed | The app labels IHSG as IDX Composite and can fall back to a specialist IDX data vendor when needed. |
| Gold | Finnhub or Twelve Data | XAU/USD is fetched server-side through the same market route. |
| Mutual fund/NAB | OJK public NAB page | Official Indonesian source; usually requires scheduled ingestion/parsing instead of a polished public JSON API. |

## Security Notes

- Treat health and finance data as sensitive. Encrypt secrets, avoid logging request bodies, and limit access by `coupleId`.
- Store only hashed passwords when credential auth is enabled.
- Use invite codes as one-time tokens or hashed codes, never plain reusable secrets.
- Add explicit consent before sending cycle-related notifications to a partner.
- Keep third-party API keys server-side in route handlers or cron jobs.
