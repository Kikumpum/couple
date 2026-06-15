import { NextResponse } from "next/server";

type QuoteStatus = "live" | "needs-key" | "error";

type MarketQuote = {
  id: string;
  symbol: string;
  label: string;
  imageUrl: string;
  price: number | null;
  changePercent: number | null;
  currency: string;
  source: string;
  updatedAt: string;
  status: QuoteStatus;
  message?: string;
};

type ExternalAsset = {
  id: string;
  label: string;
  currency: string;
  imageUrl: string;
  finnhubSymbol?: string;
  twelveSymbol?: string;
  yahooSymbol?: string;
};

const binanceAssets = [
  {
    id: "btc",
    symbol: "BTCUSDT",
    label: "Bitcoin",
    currency: "USD",
    imageUrl: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
  },
  {
    id: "eth",
    symbol: "ETHUSDT",
    label: "Ethereum",
    currency: "USD",
    imageUrl: "https://assets.coingecko.com/coins/images/279/large/ethereum.png"
  },
  {
    id: "xrp",
    symbol: "XRPUSDT",
    label: "XRP",
    currency: "USD",
    imageUrl:
      "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png"
  }
];

const binanceHosts = ["https://api.binance.com", "https://data-api.binance.vision"];

const externalAssets: ExternalAsset[] = [
  {
    id: "bmri",
    label: "Bank Mandiri",
    currency: "IDR",
    imageUrl: "/logos/bmri.svg",
    yahooSymbol: "BMRI.JK"
  },
  {
    id: "padi",
    label: "Minna Padi",
    currency: "IDR",
    imageUrl: "/idx.png",
    yahooSymbol: "PADI.JK"
  },
  {
    id: "xauusd",
    label: "Emas Spot",
    currency: "USD",
    imageUrl:
      "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=160&q=80",
    finnhubSymbol: "OANDA:XAU_USD",
    twelveSymbol: "XAU/USD",
    yahooSymbol: "GC=F"
  },
  {
    id: "ihsg",
    label: "IHSG / IDX Composite",
    currency: "PTS",
    imageUrl: "/idx.png",
    twelveSymbol: "JKSE",
    yahooSymbol: "^JKSE"
  }
];

function quoteBase(
  id: string,
  symbol: string,
  label: string,
  currency: string,
  imageUrl: string,
  source: string,
  status: QuoteStatus,
  message?: string
): MarketQuote {
  return {
    id,
    symbol,
    label,
    imageUrl,
    price: null,
    changePercent: null,
    currency,
    source,
    updatedAt: new Date().toISOString(),
    status,
    message
  };
}

function toNumber(value: unknown) {
  const numberValue =
    typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));

  return Number.isFinite(numberValue) ? numberValue : null;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "couple-hub/1.0"
    },
    signal: AbortSignal.timeout(6500)
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

async function fetchBinanceQuote(
  asset: (typeof binanceAssets)[number]
): Promise<MarketQuote> {
  for (const host of binanceHosts) {
    try {
      const data = await fetchJson(
        `${host}/api/v3/ticker/24hr?symbol=${asset.symbol}`
      );
      const price = toNumber(data.lastPrice);
      const changePercent = toNumber(data.priceChangePercent);

      if (price === null) {
        continue;
      }

      return {
        id: asset.id,
        symbol: asset.symbol,
        label: asset.label,
        imageUrl: asset.imageUrl,
        price,
        changePercent,
        currency: asset.currency,
        source: "Binance",
        updatedAt: new Date().toISOString(),
        status: "live"
      };
    } catch {
      continue;
    }
  }

  return quoteBase(
    asset.id,
    asset.symbol,
    asset.label,
    asset.currency,
    asset.imageUrl,
    "Binance",
    "error",
    "Binance gagal dimuat"
  );
}

async function fetchFinnhubQuote(asset: ExternalAsset): Promise<MarketQuote | null> {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey || !asset.finnhubSymbol) {
    return null;
  }

  try {
    const data = await fetchJson(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
        asset.finnhubSymbol
      )}&token=${apiKey}`
    );
    const price = toNumber(data.c);
    const changePercent = toNumber(data.dp);
    const timestamp = toNumber(data.t);

    if (price === null || price <= 0) {
      return null;
    }

    return {
      id: asset.id,
      symbol: asset.finnhubSymbol,
      label: asset.label,
      imageUrl: asset.imageUrl,
      price,
      changePercent,
      currency: asset.currency,
      source: "Finnhub",
      updatedAt: timestamp
        ? new Date(timestamp * 1000).toISOString()
        : new Date().toISOString(),
      status: "live"
    };
  } catch {
    return null;
  }
}

async function fetchTwelveDataQuote(asset: ExternalAsset): Promise<MarketQuote | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey || !asset.twelveSymbol) {
    return null;
  }

  try {
    const data = await fetchJson(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
        asset.twelveSymbol
      )}&apikey=${apiKey}`
    );
    const price = toNumber(data.close ?? data.price);
    const changePercent = toNumber(data.percent_change);
    const message = typeof data.message === "string" ? data.message : null;

    if (price === null) {
      if (message) {
        return quoteBase(
          asset.id,
          asset.twelveSymbol,
          asset.label,
          asset.currency,
          asset.imageUrl,
          "Twelve Data",
          "error",
          message
        );
      }

      return null;
    }

    return {
      id: asset.id,
      symbol: asset.twelveSymbol,
      label: asset.label,
      imageUrl: asset.imageUrl,
      price,
      changePercent,
      currency: asset.currency,
      source: "Twelve Data",
      updatedAt:
        typeof data.datetime === "string" ? data.datetime : new Date().toISOString(),
      status: "live"
    };
  } catch {
    return null;
  }
}

async function fetchYahooChartQuote(asset: ExternalAsset): Promise<MarketQuote | null> {
  if (!asset.yahooSymbol) {
    return null;
  }

  try {
    const data = await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        asset.yahooSymbol
      )}?range=1d&interval=5m`
    );
    const chart = asRecord(data.chart);
    const results = Array.isArray(chart?.result) ? chart.result : [];
    const firstResult = asRecord(results[0]);
    const meta = asRecord(firstResult?.meta);

    const price = toNumber(meta?.regularMarketPrice);
    const previousClose = toNumber(
      meta?.previousClose ?? meta?.chartPreviousClose
    );
    const timestamp = toNumber(meta?.regularMarketTime);

    if (price === null || price <= 0) {
      return null;
    }

    const changePercent =
      previousClose && previousClose > 0
        ? ((price - previousClose) / previousClose) * 100
        : null;

    return {
      id: asset.id,
      symbol: asset.yahooSymbol,
      label: asset.label,
      imageUrl: asset.imageUrl,
      price,
      changePercent,
      currency: asset.currency,
      source: "Yahoo Finance",
      updatedAt: timestamp
        ? new Date(timestamp * 1000).toISOString()
        : new Date().toISOString(),
      status: "live"
    };
  } catch {
    return null;
  }
}

async function fetchExternalQuote(asset: ExternalAsset): Promise<MarketQuote> {
  const finnhubQuote = await fetchFinnhubQuote(asset);

  if (finnhubQuote) {
    return finnhubQuote;
  }

  const twelveDataQuote = await fetchTwelveDataQuote(asset);

  if (twelveDataQuote) {
    return twelveDataQuote;
  }

  const yahooChartQuote = await fetchYahooChartQuote(asset);

  if (yahooChartQuote) {
    return yahooChartQuote;
  }

  const needsConfiguration =
    !process.env.FINNHUB_API_KEY &&
    !process.env.TWELVE_DATA_API_KEY &&
    !asset.yahooSymbol;

  return quoteBase(
    asset.id,
    asset.twelveSymbol ?? asset.finnhubSymbol ?? asset.yahooSymbol ?? asset.id,
    asset.label,
    asset.currency,
    asset.imageUrl,
    "Finnhub/Twelve Data/Yahoo Finance",
    needsConfiguration ? "needs-key" : "error",
    needsConfiguration
      ? "Isi FINNHUB_API_KEY atau TWELVE_DATA_API_KEY"
      : "Data belum tersedia"
  );
}

export async function GET() {
  const [cryptoQuotes, externalQuotes] = await Promise.all([
    Promise.all(binanceAssets.map(fetchBinanceQuote)),
    Promise.all(externalAssets.map(fetchExternalQuote))
  ]);

  return NextResponse.json(
    {
      quotes: [...cryptoQuotes, ...externalQuotes],
      updatedAt: new Date().toISOString()
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
