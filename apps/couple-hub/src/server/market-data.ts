import { providerJSON } from "./providers";

export const coinIds: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  HYPE: "hyperliquid",
  SOL: "solana",
  BNB: "binancecoin",
  DOGE: "dogecoin",
  SUI: "sui",
  ADA: "cardano",
  LINK: "chainlink",
};
export type WatchFields = {
  market: "idx" | "us" | "crypto";
  symbol: string;
  currency: "IDR" | "USD";
};
export type Quote = {
  symbol: string;
  name: string;
  currency: string;
  price: number | null;
  changePercent: number | null;
  capturedAt: string | null;
  source: string;
  unavailable?: string;
};
function timestamp(seconds: unknown): string {
  if (
    typeof seconds !== "number" ||
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    seconds > Date.now() / 1000 + 300
  )
    throw new Error("Invalid timestamp");
  return new Date(seconds * 1000).toISOString();
}
export async function marketQuote(watch: WatchFields): Promise<Quote> {
  const base = {
    symbol: watch.symbol,
    name: watch.symbol,
    currency: watch.currency,
    price: null,
    changePercent: null,
    capturedAt: null,
    source: watch.market === "crypto" ? "CoinGecko" : "Yahoo Finance",
  };
  try {
    if (watch.market === "crypto") {
      const coin = coinIds[watch.symbol];
      if (!coin) throw new Error("Unsupported asset");
      const currency = watch.currency.toLowerCase();
      const raw = (await providerJSON(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=${currency}&include_24hr_change=true&include_last_updated_at=true`,
      )) as Record<string, Record<string, number>>;
      const q = raw[coin];
      if (!q || !Number.isFinite(q[currency]) || q[currency] <= 0)
        throw new Error("Invalid quote");
      return {
        ...base,
        price: q[currency],
        changePercent: Number.isFinite(q[`${currency}_24h_change`])
          ? q[`${currency}_24h_change`]
          : null,
        capturedAt: timestamp(q.last_updated_at),
      };
    }
    const symbol = watch.market === "idx" ? `${watch.symbol}.JK` : watch.symbol;
    const raw = (await providerJSON(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`,
    )) as { chart?: { result?: { meta?: Record<string, unknown> }[] } };
    const q = raw.chart?.result?.[0]?.meta;
    if (
      !q ||
      q.currency !== watch.currency ||
      typeof q.regularMarketPrice !== "number" ||
      !Number.isFinite(q.regularMarketPrice) ||
      q.regularMarketPrice <= 0
    )
      throw new Error("Invalid quote");
    const previous =
      typeof q.previousClose === "number"
        ? q.previousClose
        : q.chartPreviousClose;
    return {
      ...base,
      name:
        typeof q.shortName === "string"
          ? q.shortName.slice(0, 150)
          : watch.symbol,
      price: q.regularMarketPrice,
      changePercent:
        typeof previous === "number" &&
        Number.isFinite(previous) &&
        previous > 0
          ? ((q.regularMarketPrice - previous) / previous) * 100
          : null,
      capturedAt: timestamp(q.regularMarketTime),
    };
  } catch {
    return {
      ...base,
      unavailable:
        "Harga belum tersedia. Kode mungkin tidak didukung atau penyedia sedang membatasi akses.",
    };
  }
}
