import { NextRequest, NextResponse } from "next/server";

type StockExchange = "idx" | "us";

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  exchange?: string;
  quoteType?: string;
  typeDisp?: string;
};

function getExchange(value: string | null): StockExchange {
  return value === "us" ? "us" : "idx";
}

function normalizeQuery(query: string, exchange: StockExchange) {
  const cleaned = query.trim().toUpperCase();

  if (exchange === "idx" && cleaned && !cleaned.includes(".") && !cleaned.startsWith("^")) {
    return `${cleaned}.JK`;
  }

  return cleaned;
}

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

function imageForStock(symbol: string, exchange: StockExchange) {
  const logoPath = stockLogoPaths[symbol];

  if (logoPath) {
    return logoPath;
  }

  if (symbol.startsWith("^")) {
    return "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=160&q=80";
  }

  if (exchange === "idx") {
    return "/idx.png";
  }

  return `https://companiesmarketcap.com/img/company-logos/256/${symbol}.png`;
}

function isStockLike(quote: YahooQuote) {
  const quoteType = quote.quoteType?.toUpperCase() ?? "";
  const typeDisp = quote.typeDisp?.toUpperCase() ?? "";

  return (
    quoteType === "EQUITY" ||
    quoteType === "ETF" ||
    quoteType === "INDEX" ||
    typeDisp === "EQUITY" ||
    typeDisp === "ETF" ||
    typeDisp === "INDEX"
  );
}

function matchesExchange(quote: YahooQuote, exchange: StockExchange) {
  const symbol = quote.symbol?.toUpperCase() ?? "";
  const exchangeCode = quote.exchange?.toUpperCase() ?? "";
  const exchangeDisplay = quote.exchDisp?.toUpperCase() ?? "";

  if (exchange === "idx") {
    return (
      symbol.endsWith(".JK") ||
      symbol === "^JKSE" ||
      exchangeCode === "JKT" ||
      exchangeDisplay.includes("JAKARTA") ||
      exchangeDisplay.includes("INDONESIA")
    );
  }

  return (
    !symbol.endsWith(".JK") &&
    (exchangeCode === "NYQ" ||
      exchangeCode === "NMS" ||
      exchangeCode === "NGM" ||
      exchangeCode === "ASE" ||
      exchangeCode === "PCX" ||
      exchangeDisplay.includes("NYSE") ||
      exchangeDisplay.includes("NASDAQ") ||
      exchangeDisplay.includes("NYSEARCA"))
  );
}

export async function GET(request: NextRequest) {
  const exchange = getExchange(request.nextUrl.searchParams.get("exchange"));
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.trim();

  if (query.length < 2) {
    return NextResponse.json(
      { results: [], status: "idle" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const yahooQuery = normalizeQuery(query, exchange);

  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
        yahooQuery
      )}&quotesCount=20&newsCount=0&enableFuzzyQuery=true`,
      {
        cache: "no-store",
        headers: {
          "User-Agent": "az-hub/1.0"
        },
        signal: AbortSignal.timeout(6500)
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo search failed with status ${response.status}`);
    }

    const data = (await response.json()) as { quotes?: YahooQuote[] };
    const quotes = Array.isArray(data.quotes) ? data.quotes : [];
    const seen = new Set<string>();
    const results = quotes
      .filter((quote) => quote.symbol && isStockLike(quote))
      .filter((quote) => matchesExchange(quote, exchange))
      .filter((quote) => {
        const symbol = quote.symbol?.toUpperCase() ?? "";

        if (seen.has(symbol)) {
          return false;
        }

        seen.add(symbol);
        return true;
      })
      .slice(0, 12)
      .map((quote) => {
        const symbol = quote.symbol?.toUpperCase() ?? "";

        return {
          id: symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          symbol,
          label: quote.longname ?? quote.shortname ?? symbol,
          exchange,
          currency: exchange === "idx" ? "IDR" : "USD",
          imageUrl: imageForStock(symbol, exchange),
          exchangeLabel: quote.exchDisp ?? (exchange === "idx" ? "IDX" : "US")
        };
      });

    return NextResponse.json(
      { results, status: "live", updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        results: [],
        status: "error",
        message: "Pencarian saham gagal dimuat"
      },
      { headers: { "Cache-Control": "no-store" }, status: 200 }
    );
  }
}
