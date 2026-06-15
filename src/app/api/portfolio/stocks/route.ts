import { NextRequest, NextResponse } from "next/server";

type StockAsset = {
  id: string;
  symbol: string;
  label: string;
  exchange: "idx" | "us";
  currency: string;
};

type Timeframe = "1h" | "1d" | "1w" | "1m" | "6m" | "1y";

type StockChartPoint = {
  time: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number;
};

type StockStats = {
  previousClose: number | null;
  open: number | null;
  volume: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  averageVolume: number | null;
};

const stockMarkets: Record<"idx" | "us", StockAsset[]> = {
  idx: [
    { id: "jkse", symbol: "^JKSE", label: "IDX Composite", exchange: "idx", currency: "PTS" },
    { id: "bbca", symbol: "BBCA.JK", label: "Bank Central Asia", exchange: "idx", currency: "IDR" },
    { id: "bbri", symbol: "BBRI.JK", label: "Bank Rakyat Indonesia", exchange: "idx", currency: "IDR" },
    { id: "bmri", symbol: "BMRI.JK", label: "Bank Mandiri", exchange: "idx", currency: "IDR" },
    { id: "tlkm", symbol: "TLKM.JK", label: "Telkom Indonesia", exchange: "idx", currency: "IDR" },
    { id: "asii", symbol: "ASII.JK", label: "Astra International", exchange: "idx", currency: "IDR" },
    { id: "unvr", symbol: "UNVR.JK", label: "Unilever Indonesia", exchange: "idx", currency: "IDR" },
    { id: "goto", symbol: "GOTO.JK", label: "GoTo Gojek Tokopedia", exchange: "idx", currency: "IDR" },
    { id: "ammn", symbol: "AMMN.JK", label: "Amman Mineral", exchange: "idx", currency: "IDR" },
    { id: "bren", symbol: "BREN.JK", label: "Barito Renewables", exchange: "idx", currency: "IDR" }
  ],
  us: [
    { id: "spx", symbol: "^GSPC", label: "S&P 500", exchange: "us", currency: "PTS" },
    { id: "nasdaq", symbol: "^IXIC", label: "Nasdaq Composite", exchange: "us", currency: "PTS" },
    { id: "aapl", symbol: "AAPL", label: "Apple", exchange: "us", currency: "USD" },
    { id: "msft", symbol: "MSFT", label: "Microsoft", exchange: "us", currency: "USD" },
    { id: "nvda", symbol: "NVDA", label: "NVIDIA", exchange: "us", currency: "USD" },
    { id: "googl", symbol: "GOOGL", label: "Alphabet", exchange: "us", currency: "USD" },
    { id: "amzn", symbol: "AMZN", label: "Amazon", exchange: "us", currency: "USD" },
    { id: "meta", symbol: "META", label: "Meta Platforms", exchange: "us", currency: "USD" },
    { id: "tsla", symbol: "TSLA", label: "Tesla", exchange: "us", currency: "USD" },
    { id: "amd", symbol: "AMD", label: "AMD", exchange: "us", currency: "USD" }
  ]
};

const timeframeConfig: Record<
  Timeframe,
  { range: string; interval: string; slice?: number }
> = {
  "1h": { range: "1d", interval: "2m", slice: 30 },
  "1d": { range: "1d", interval: "5m" },
  "1w": { range: "5d", interval: "15m" },
  "1m": { range: "1mo", interval: "1d" },
  "6m": { range: "6mo", interval: "1d" },
  "1y": { range: "1y", interval: "1wk" }
};

const usIndexImages: Record<string, string> = {
  "^GSPC":
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=160&q=80",
  "^IXIC":
    "https://images.unsplash.com/photo-1642790551116-18e150f248e3?auto=format&fit=crop&w=160&q=80"
};

const stockLogoPaths: Record<string, string> = {
  "BBCA.JK": "/logos/bbca.svg",
  "BBRI.JK": "/logos/bbri.svg",
  "BMRI.JK": "/logos/bmri.svg",
  "TLKM.JK": "/logos/tlkm.svg",
  "ASII.JK": "/logos/asii.svg",
  "UNVR.JK": "/logos/unvr.svg",
  "GOTO.JK": "/logos/goto.svg",
  "AMMN.JK": "/logos/ammn.svg",
  "BREN.JK": "/logos/bren.svg",
  AAPL: "/logos/aapl.svg",
  MSFT: "/logos/msft.svg",
  NVDA: "/logos/nvda.svg",
  GOOGL: "/logos/googl.svg",
  GOOG: "/logos/googl.svg",
  AMZN: "/logos/amzn.svg",
  META: "/logos/meta.svg",
  TSLA: "/logos/tsla.svg",
  AMD: "/logos/amd.svg",
  JPM: "/logos/jpm.svg",
  BAC: "/logos/bac.svg",
  NFLX: "/logos/nflx.svg",
  WMT: "/logos/wmt.svg"
};

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getTimeframe(value: string | null): Timeframe {
  return value === "1h" ||
    value === "1d" ||
    value === "1w" ||
    value === "1m" ||
    value === "6m" ||
    value === "1y"
    ? value
    : "1h";
}

function imageForStock(asset: StockAsset) {
  const logoPath = stockLogoPaths[asset.symbol];

  if (logoPath) {
    return logoPath;
  }

  if (usIndexImages[asset.symbol]) {
    return usIndexImages[asset.symbol];
  }

  if (asset.exchange === "idx") {
    return "/idx.png";
  }

  return `https://companiesmarketcap.com/img/company-logos/256/${asset.symbol}.png`;
}

function normalizePrioritySymbol(symbol: string, exchange: "idx" | "us") {
  const cleaned = symbol.trim().toUpperCase();

  if (exchange === "idx" && cleaned && !cleaned.includes(".") && !cleaned.startsWith("^")) {
    return `${cleaned}.JK`;
  }

  return cleaned || (exchange === "idx" ? "^JKSE" : "^GSPC");
}

function customAssetFromPriority(
  symbol: string,
  exchange: "idx" | "us",
  label?: string | null
): StockAsset {
  const normalizedSymbol = normalizePrioritySymbol(symbol, exchange);

  return {
    id: normalizedSymbol.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    symbol: normalizedSymbol,
    label: label?.trim() || normalizedSymbol,
    exchange,
    currency: normalizedSymbol.startsWith("^") ? "PTS" : exchange === "idx" ? "IDR" : "USD"
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "az-hub/1.0"
    },
    signal: AbortSignal.timeout(6500)
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

async function fetchYahooAsset(asset: StockAsset, timeframe: Timeframe) {
  const config = timeframeConfig[timeframe];

  try {
    const data = await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        asset.symbol
      )}?range=${config.range}&interval=${config.interval}`
    );
    const chart = asRecord(data.chart);
    const results = Array.isArray(chart?.result) ? chart.result : [];
    const firstResult = asRecord(results[0]);
    const meta = asRecord(firstResult?.meta);
    const indicators = asRecord(firstResult?.indicators);
    const quoteList = Array.isArray(indicators?.quote) ? indicators.quote : [];
    const quote = asRecord(quoteList[0]);
    const timestamps = Array.isArray(firstResult?.timestamp)
      ? firstResult.timestamp.map(toNumber)
      : [];
    const rawCloseValues = Array.isArray(quote?.close) ? quote.close.map(toNumber) : [];
    const openValues = Array.isArray(quote?.open) ? quote.open.map(toNumber) : [];
    const highValues = Array.isArray(quote?.high) ? quote.high.map(toNumber) : [];
    const lowValues = Array.isArray(quote?.low) ? quote.low.map(toNumber) : [];
    const volumeValues = Array.isArray(quote?.volume) ? quote.volume.map(toNumber) : [];
    const pointCount = Math.max(
      rawCloseValues.length,
      openValues.length,
      highValues.length,
      lowValues.length,
      volumeValues.length,
      timestamps.length
    );
    const chartPoints = Array.from({ length: pointCount }, (_, index) => {
      const close = rawCloseValues[index];

      if (close === null || close === undefined || close <= 0) {
        return null;
      }

      return {
        time: timestamps[index] ?? index,
        open: openValues[index] ?? null,
        high: highValues[index] ?? null,
        low: lowValues[index] ?? null,
        close,
        volume: volumeValues[index] ?? 0
      };
    }).filter((point): point is StockChartPoint => point !== null);
    const slicedChartPoints = config.slice
      ? chartPoints.slice(-config.slice)
      : chartPoints;
    const chartValues = slicedChartPoints.map((point) => point.close);

    const price = toNumber(meta?.regularMarketPrice);
    const previousClose = toNumber(
      meta?.previousClose ?? meta?.chartPreviousClose
    );
    const changePercent =
      price !== null && previousClose && previousClose > 0
        ? ((price - previousClose) / previousClose) * 100
        : null;
    const stats: StockStats = {
      previousClose,
      open: toNumber(meta?.regularMarketOpen),
      volume: toNumber(meta?.regularMarketVolume),
      dayLow: toNumber(meta?.regularMarketDayLow),
      dayHigh: toNumber(meta?.regularMarketDayHigh),
      fiftyTwoWeekLow: toNumber(meta?.fiftyTwoWeekLow),
      fiftyTwoWeekHigh: toNumber(meta?.fiftyTwoWeekHigh),
      averageVolume: toNumber(meta?.averageDailyVolume3Month)
    };

    return {
      ...asset,
      imageUrl: imageForStock(asset),
      price,
      changePercent,
      chart: chartValues,
      chartPoints: slicedChartPoints,
      stats,
      source: "Yahoo Finance",
      status: price !== null ? "live" : "error"
    };
  } catch {
    return {
      ...asset,
      imageUrl: imageForStock(asset),
      price: null,
      changePercent: null,
      chart: [],
      chartPoints: [],
      stats: {
        previousClose: null,
        open: null,
        volume: null,
        dayLow: null,
        dayHigh: null,
        fiftyTwoWeekLow: null,
        fiftyTwoWeekHigh: null,
        averageVolume: null
      },
      source: "Yahoo Finance",
      status: "error"
    };
  }
}

export async function GET(request: NextRequest) {
  const exchange =
    request.nextUrl.searchParams.get("exchange") === "us" ? "us" : "idx";
  const fallbackPriority = exchange === "idx" ? "^JKSE" : "^GSPC";
  const priority = normalizePrioritySymbol(
    request.nextUrl.searchParams.get("priority") ?? fallbackPriority,
    exchange
  );
  const priorityLabel = request.nextUrl.searchParams.get("label");
  const timeframe = getTimeframe(request.nextUrl.searchParams.get("timeframe"));

  const markets = await Promise.all(
    stockMarkets[exchange].map((asset) => fetchYahooAsset(asset, timeframe))
  );
  const knownPriority = markets.find((item) => item.symbol === priority) ?? null;
  const customPriority = knownPriority
    ? null
    : await fetchYahooAsset(
        customAssetFromPriority(priority, exchange, priorityLabel),
        timeframe
      );
  const prioritized = knownPriority ?? customPriority ?? markets[0] ?? null;
  const mergedMarkets = customPriority ? [customPriority, ...markets] : markets;

  return NextResponse.json(
    {
      exchange,
      exchangeLabel: exchange === "idx" ? "Indonesia Stock Exchange" : "US Market",
      exchangeImage:
        exchange === "idx"
          ? "/idx.png"
          : "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80",
      markets: mergedMarkets,
      priority: prioritized,
      chart: prioritized?.chart ?? [],
      chartPoints: prioritized?.chartPoints ?? [],
      timeframe,
      updatedAt: new Date().toISOString(),
      status: mergedMarkets.some((item) => item.status === "live") ? "live" : "error"
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
