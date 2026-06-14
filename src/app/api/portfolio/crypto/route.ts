import { NextRequest, NextResponse } from "next/server";

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
};

type CryptoAsset = {
  id: string;
  symbol: string;
  label: string;
  price: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  imageUrl: string;
};

type CryptoCandle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Timeframe = "1h" | "1d" | "1w" | "1m" | "6m" | "1y";

const assetImages: Record<string, string> = {
  BTCUSDT: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  ETHUSDT: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  XRPUSDT: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  BNBUSDT: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  SOLUSDT: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
  ADAUSDT: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
  DOGEUSDT: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png"
};

const binanceHosts = ["https://api.binance.com", "https://data-api.binance.vision"];

const timeframeConfig: Record<Timeframe, { interval: string; limit: number }> = {
  "1h": { interval: "1m", limit: 60 },
  "1d": { interval: "5m", limit: 288 },
  "1w": { interval: "1h", limit: 168 },
  "1m": { interval: "4h", limit: 180 },
  "6m": { interval: "1d", limit: 180 },
  "1y": { interval: "1d", limit: 365 }
};

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function labelFromSymbol(symbol: string) {
  return symbol.replace("USDT", "");
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(6500)
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<unknown>;
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

async function fetchCandles(symbol: string, timeframe: Timeframe) {
  const config = timeframeConfig[timeframe];
  const mapRows = (data: unknown[]) =>
    data
      .map((row): CryptoCandle | null => {
        if (!Array.isArray(row)) {
          return null;
        }

        const open = toNumber(row[1]);
        const high = toNumber(row[2]);
        const low = toNumber(row[3]);
        const close = toNumber(row[4]);

        if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
          return null;
        }

        return {
          openTime: toNumber(row[0]),
          open,
          high,
          low,
          close,
          volume: toNumber(row[5])
        };
      })
      .filter((value): value is CryptoCandle => value !== null);

  try {
    const data = (await fetchJson(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${config.interval}&limit=${config.limit}`
    )) as unknown[];

    return mapRows(data);
  } catch {
    try {
      const data = (await fetchJson(
        `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${config.interval}&limit=${config.limit}`
      )) as unknown[];

      return mapRows(data);
    } catch {
      return [];
    }
  }
}

export async function GET(request: NextRequest) {
  const priority = request.nextUrl.searchParams.get("priority") ?? "BTCUSDT";
  const timeframe = getTimeframe(request.nextUrl.searchParams.get("timeframe"));

  try {
    let data: BinanceTicker[] = [];

    for (const host of binanceHosts) {
      try {
        data = (await fetchJson(`${host}/api/v3/ticker/24hr`)) as BinanceTicker[];
        break;
      } catch {
        continue;
      }
    }

    if (data.length === 0) {
      throw new Error("Binance ticker unavailable");
    }

    const assets: CryptoAsset[] = data
      .filter(
        (item) =>
          item.symbol.endsWith("USDT") &&
          !item.symbol.includes("UP") &&
          !item.symbol.includes("DOWN")
      )
      .map((item) => ({
        id: item.symbol.toLowerCase(),
        symbol: item.symbol,
        label: labelFromSymbol(item.symbol),
        price: toNumber(item.lastPrice),
        changePercent: toNumber(item.priceChangePercent),
        volume: toNumber(item.quoteVolume),
        high: toNumber(item.highPrice),
        low: toNumber(item.lowPrice),
        imageUrl:
          assetImages[item.symbol] ??
          "https://assets.coingecko.com/coins/images/4713/large/polygon.png"
      }))
      .filter((item) => item.price > 0)
      .sort((first, second) => second.volume - first.volume)
      .slice(0, 40);

    const prioritized = assets.find((item) => item.symbol === priority) ?? assets[0];
    const candles = prioritized ? await fetchCandles(prioritized.symbol, timeframe) : [];
    const chart = candles.map((candle) => candle.close);

    return NextResponse.json(
      {
        assets,
        priority: prioritized,
        chart,
        candles,
        timeframe,
        updatedAt: new Date().toISOString(),
        status: "live"
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        assets: [],
        priority: null,
        chart: [],
        candles: [],
        timeframe,
        updatedAt: new Date().toISOString(),
        status: "error",
        message: "Data crypto gagal dimuat"
      },
      { headers: { "Cache-Control": "no-store" }, status: 200 }
    );
  }
}
