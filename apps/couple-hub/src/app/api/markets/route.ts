import { requireUser, throttle } from "@/server/auth";
import { fail, handle } from "@/server/http";
import { db } from "@/server/db";
import { marketQuote, type WatchFields } from "@/server/market-data";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handle(async () => {
    const user = requireUser(request);
    throttle(`markets:${user.id}`, 60, 60000);
    const market = new URL(request.url).searchParams.get("market") || "crypto";
    if (!["idx", "us", "crypto"].includes(market))
      fail(400, "VALIDATION", "Unknown market.");
    const watches = db()
      .prepare(
        "SELECT data FROM records WHERE userId=? AND collection='watchlist' ORDER BY createdAt",
      )
      .all(user.id) as { data: string }[];
    const selected = watches
      .map((w) => JSON.parse(w.data) as WatchFields)
      .filter((w) => w.market === market)
      .slice(0, 12);
    const assets = await Promise.all(selected.map(marketQuote));
    return {
      source: market === "crypto" ? "CoinGecko" : "Yahoo Finance",
      assets,
      checkedAt: new Date().toISOString(),
      market,
    };
  });
}
