# Backend Contract

Node 22.13+ is required (`node:sqlite` is experimental on Node 22). Routes run in
the Node runtime. No Prisma client, external database, or seed data is used.
Storage defaults to `.data/couple-hub.sqlite`; ignore `.data/` including WAL/SHM
files. `COUPLE_DB_PATH` overrides the path for tests or deployment. Deploy on a
persistent local filesystem with one logical application database, not separate
ephemeral/serverless replicas. Back up SQLite using a SQLite-aware backup tool.

Set `APP_ORIGIN` to the exact public origin in production, for example
`https://hub.example.com`, especially behind a TLS-terminating reverse proxy.
Cookies are HttpOnly, SameSite=Lax, Secure in production, with seven-day expiry.
Every mutation requires an exact matching Origin and application/json body;
request bodies are capped at 16 KiB. Account passwords are 12–128 characters.
Errors are `{error:{code,message}}` with appropriate HTTP status codes.

## Routes

- `GET /api/auth`: full snapshot, or `user:null` and empty collections if signed out.
- `POST /api/auth`: `{action:"register",name,username,email?,password}` or
  `{action:"login",identifier,password}` returns snapshot and sets a session cookie.
  Usernames are unique, case-insensitive, 3-30 letters/digits/underscores. An omitted
  email gets an internal `.invalid` address, never used to deliver email. Existing
  email-only accounts and `{action:"login",email,password}` remain supported.
  `{action:"logout"}` revokes the presented session, clears its cookie, returns `{ok:true}`.
- `GET /api/data`: authenticated snapshot.
- `POST /api/data`: `{collection,record}` creates an owner-scoped record.
- `PATCH /api/data`: `{collection,id,record}` applies a partial field update.
- `DELETE /api/data`: `{collection,id}` deletes an owned record.
  All data mutations return the refreshed snapshot. Partner access is read-only.
  Deleting a goal nulls every finance reference to that goal.
- `POST /api/couple`: `{action:"invite"}` returns `{token,expiresAt}` (ISO time).
  Invites expire in 24 hours, are hashed at rest, and replace prior invites.
  `{action:"join",token,consent:true}` explicitly accepts non-health sharing.
  Both users must be unlinked. Joining resets both health permissions to false.
  `{action:"disconnect"}` or `{action:"revoke"}` cancels invites and disconnects
  both people while preserving their owned records. Cross-owner goal links clear.
  `{action:"shareHealth",shareHealth:boolean}` grants/revokes read access to all
  of that owner's period records. Non-invite actions return `{ok:true}`.
- `DELETE /api/account`: `{password}` deletes the authenticated owner's records,
  account, invites and sessions, disconnects the couple, preserves partner data,
  and returns `{ok:true}` while clearing the cookie.
- `PATCH /api/account`: `{theme:"light"|"dark"}` updates only that user's preference.
- `GET /api/events`: authenticated SSE invalidation events, `change` and `signed-out`.
  Polls durable per-user revision counters each second. Contains no record payloads.
  Rechecks the session every tick; client re-fetches authorized snapshots.

## Snapshot And Records

Snapshot: `{user:{id,name,email,coupleId,shareHealth,theme},
partner:{id,name,shareHealth}|null,finances:[],goals:[],periods:[],books:[],plans:[],reminders:[],investments:[],watchlist:[]}`.
Watchlist records are private to the owner even when linked. Non-health collections
other than watchlist are shared read-only with the currently linked partner.
Partner emails, hashes and session/invite tokens are never exposed.

All returned records include server-owned `id,userId,coupleId,createdAt,updatedAt`.
Never send those fields inside mutation `record`; send only the writable fields
below. Optional values normalize to null, except optional text defaults to empty.
Dates are real `YYYY-MM-DD` dates in years 1900–2200. Reminders use local wall time
`YYYY-MM-DDTHH:mm` (no timezone suffix). Date ranges and numeric bounds are checked.

| Collection  | Writable Fields                                                                                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| finances    | type: income/expense/saving; title; amount: positive integer IDR <= 1e12; date; category; goalId?: accessible goal UUID                                                                |
| goals       | name; targetAmount: positive integer IDR <= 1e12; targetDate?: date                                                                                                                    |
| periods     | startDate; endDate?: date (not before start, at most 30 days after, neither in future); cycleLength: integer 15-60; periodLength: integer 1-15 and <= cycleLength; symptoms; notes     |
| books       | title; author; category; status: wishlist/reading/finished; rating: 0–5; progressPage: integer 0–totalPages; totalPages: integer 0–100000                                              |
| plans       | title; movieId?: positive integer TMDB ID; date; notes; rating?: 0-5; status: planned/watched                                                                                          |
| reminders   | title; date: local datetime; done: boolean (default false)                                                                                                                             |
| investments | name; symbol; type: gold/stock/crypto/fund/bond; units: positive, max 8 decimals; averagePrice: positive integer IDR; date                                                             |
| watchlist   | market: idx/us/crypto; symbol; currency: IDR/USD (forced IDR for IDX, USD for US). Max 12 per market, no duplicate symbol. Crypto supports BTC/ETH/XRP/HYPE/SOL/BNB/DOGE/SUI/ADA/LINK. |

Titles/names are nonempty and at most 200 characters (account names: 80).
Author text is at most 200; category text is at most 80. Unknown record fields and
ownership overrides are rejected. The per-account limit is 10,000 total records.

## Providers

- `GET /api/movies[?q=search]`: authenticated; TMDB now_playing/search (region ID) via server-side
  `TMDB_API_TOKEN`; missing configuration returns HTTP 503, never mock movies.
  Returns `{source:"TMDB",fetchedAt,movies:[{id,title,poster,synopsis,rating,releaseDate}]}`.
  TMDB attribution must be included wherever its data is displayed.
- `GET /api/markets?market=idx|us|crypto`: quotes only for the caller's stored watchlist.
  Returns `{source,checkedAt,market,assets:[{name,symbol,currency,price,changePercent,capturedAt,source,unavailable?}]}`.
  CoinGecko provides crypto; Yahoo chart endpoint provides stocks. The latter is an
  unsupported public endpoint, not an SLA-backed licensed commercial feed.
  Failed individual quotes return `price:null`, never zero or demo values.
  Timestamp fields describe provider observations, not a guarantee of live trading prices.

Provider requests have six-second timeouts, 1 MiB response limits, 60-second
success caching, 15-second transport-failure caching and per-user throttling.
No stale-cache fallback or fabricated prices is served on provider failure.
Movie-provider failures return generic 503 messages without credentials; market
quotes fail individually so one unavailable asset does not hide the rest.

## Verification

`node --test tests/backend.integration.cjs` runs actual route handlers against
temporary SQLite storage. In PowerShell, set `$env:BACKEND_NEXT='1'` before that
command to run the same lifecycle against a spawned Next HTTP server on port
3017; it requires loopback/process-control access and stops its server afterward.
Do not run HTTP mode alongside another Next process sharing this checkout's
`.next` output. Neither mode writes test accounts into the application's database.
