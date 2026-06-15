"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bitcoin,
  Building2,
  Check,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Mode = "crypto" | "stocks";
type StockExchange = "idx" | "us";
type Timeframe = "1h" | "1d" | "1w" | "1m" | "6m" | "1y";

type OwnerHolding = {
  symbol: string;
  label: string;
  account?: string;
  lots?: number;
  shares?: number;
  avgPrice?: number;
  invested: number;
  pnl: number;
};

type OwnerPortfolio = {
  owner: "Aryo" | "Fia";
  accent: "sky" | "rose";
  holdings: OwnerHolding[];
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

type StockMarket = {
  id: string;
  symbol: string;
  label: string;
  exchange: StockExchange;
  currency: string;
  price: number | null;
  changePercent: number | null;
  chart: number[];
  chartPoints: StockChartPoint[];
  stats: StockStats;
  imageUrl: string;
  source: string;
  status: "live" | "error";
};

type StockSearchResult = {
  id: string;
  symbol: string;
  label: string;
  exchange: StockExchange;
  currency: string;
  imageUrl: string;
  exchangeLabel: string;
};

type CryptoResponse = {
  assets: CryptoAsset[];
  priority: CryptoAsset | null;
  chart: number[];
  candles: CryptoCandle[];
  timeframe: Timeframe;
  updatedAt: string;
  status: "live" | "error";
};

type StocksResponse = {
  exchange: StockExchange;
  exchangeLabel: string;
  exchangeImage: string;
  markets: StockMarket[];
  priority: StockMarket | null;
  chart: number[];
  chartPoints: StockChartPoint[];
  timeframe: Timeframe;
  updatedAt: string;
  status: "live" | "error";
};

const cryptoPriorityKey = "az-hub.portfolio.crypto-priority";
const stockPriorityKey = "az-hub.portfolio.stock-priority";
const stockLabelKey = "az-hub.portfolio.stock-label";
const stockExchangeKey = "az-hub.portfolio.stock-exchange";

const modeOptions: Array<{
  value: Mode;
  label: string;
  Icon: LucideIcon;
}> = [
  { value: "crypto", label: "Crypto", Icon: Bitcoin },
  { value: "stocks", label: "Saham", Icon: Building2 }
];

const timeframeOptions: Array<{ value: Timeframe; label: string }> = [
  { value: "1h", label: "1 Jam" },
  { value: "1d", label: "1 Hari" },
  { value: "1w", label: "1Mgg" },
  { value: "1m", label: "1Bln" },
  { value: "6m", label: "6Bln" },
  { value: "1y", label: "1Thn" }
];

const ownerPortfolios: OwnerPortfolio[] = [
  {
    owner: "Aryo",
    accent: "sky",
    holdings: [
      {
        symbol: "ELTY",
        label: "Bakrieland Development",
        account: "Aryo akun 2",
        lots: 1279,
        shares: 127900,
        avgPrice: 99.14,
        invested: 12681093,
        pnl: -9099893
      },
      {
        symbol: "ESTI",
        label: "Ever Shine Tex",
        account: "Aryo Stockbit 1",
        invested: 10635930,
        pnl: -5821530
      },
      {
        symbol: "INET",
        label: "Sinergi Inti Andalan Prima",
        account: "Aryo Stockbit 1",
        invested: 10350502,
        pnl: -6947903
      },
      {
        symbol: "BMRI",
        label: "Bank Mandiri",
        account: "Aryo akun 2",
        lots: 21,
        shares: 2100,
        avgPrice: 4687.02,
        invested: 9842742,
        pnl: -392742
      },
      {
        symbol: "RLCO",
        label: "Royalindo Investa Wijaya",
        account: "Aryo akun 2",
        lots: 12,
        shares: 1200,
        avgPrice: 7905.59,
        invested: 9486709,
        pnl: -5286709
      },
      {
        symbol: "ANTM",
        label: "Aneka Tambang",
        account: "Aryo Stockbit 1",
        invested: 6940395,
        pnl: 11605
      },
      {
        symbol: "BUMI",
        label: "Bumi Resources",
        account: "Aryo Stockbit 1",
        invested: 4983664,
        pnl: -1654264
      },
      {
        symbol: "MINA",
        label: "Sanurhasta Mitra",
        account: "Aryo akun 2",
        lots: 92,
        shares: 9200,
        avgPrice: 458.68,
        invested: 4219920,
        pnl: -1478320
      },
      {
        symbol: "FUTR",
        label: "Lini Imaji Kreasi Ekosistem",
        account: "Aryo Stockbit 1",
        invested: 3393082,
        pnl: -1490082
      },
      {
        symbol: "RATU",
        label: "Raharja Energi Cepu",
        account: "Aryo akun 2",
        lots: 2,
        shares: 200,
        avgPrice: 8963.42,
        invested: 1792685,
        pnl: -814685
      },
      {
        symbol: "BMRI",
        label: "Bank Mandiri",
        account: "Aryo Stockbit 1",
        invested: 1403101,
        pnl: -83102
      },
      {
        symbol: "PADI",
        label: "Minna Padi Investama Sekuritas",
        account: "Aryo akun 2",
        lots: 36,
        shares: 3600,
        avgPrice: 126.18,
        invested: 454280,
        pnl: -173480
      },
      {
        symbol: "CUAN",
        label: "Petrindo Jaya Kreasi",
        account: "Aryo akun 2",
        lots: 3,
        shares: 300,
        avgPrice: 691.03,
        invested: 207311,
        pnl: 16190
      },
      {
        symbol: "BUMI",
        label: "Bumi Resources",
        account: "Aryo akun 2",
        lots: 2,
        shares: 200,
        avgPrice: 382.57,
        invested: 76515,
        pnl: -41915
      },
      {
        symbol: "CUAN",
        label: "Petrindo Jaya Kreasi",
        account: "Aryo Stockbit 1",
        invested: 66599,
        pnl: 11400
      }
    ]
  },
  {
    owner: "Fia",
    accent: "rose",
    holdings: [
      {
        symbol: "TRUE",
        label: "Triniti Dinamik",
        account: "Fia",
        lots: 358,
        shares: 35800,
        avgPrice: 530.79,
        invested: 19002461,
        pnl: -16496461
      },
      {
        symbol: "BMRI",
        label: "Bank Mandiri",
        account: "Fia",
        lots: 3,
        shares: 300,
        avgPrice: 4636.94,
        invested: 1391083,
        pnl: -41083
      },
      {
        symbol: "TRIS",
        label: "Trisula International",
        account: "Fia",
        lots: 27,
        shares: 2700,
        avgPrice: 248.37,
        invested: 670604,
        pnl: -217004
      },
      {
        symbol: "CTRA",
        label: "Ciputra Development",
        account: "Fia",
        lots: 7,
        shares: 700,
        avgPrice: 911.36,
        invested: 637955,
        pnl: -228455
      },
      {
        symbol: "BELL",
        label: "Trisula Textile Industries",
        account: "Fia",
        lots: 18,
        shares: 1800,
        avgPrice: 248.37,
        invested: 447069,
        pnl: -254469
      },
      {
        symbol: "BIPI",
        label: "Astrindo Nusantara Infrastruktur",
        account: "Fia",
        lots: 17,
        shares: 1700,
        avgPrice: 171.25,
        invested: 291136,
        pnl: -12336
      },
      {
        symbol: "PADI",
        label: "Minna Padi Investama Sekuritas",
        account: "Fia",
        lots: 12,
        shares: 1200,
        avgPrice: 177.26,
        invested: 212718,
        pnl: -119118
      },
      {
        symbol: "MBMA",
        label: "Merdeka Battery Materials",
        account: "Fia",
        lots: 3,
        shares: 300,
        avgPrice: 600.9,
        invested: 180270,
        pnl: -27270
      },
      {
        symbol: "DADA",
        label: "Diamond Citra Propertindo",
        account: "Fia",
        lots: 2,
        shares: 200,
        avgPrice: 66.09,
        invested: 13219,
        pnl: -3219
      }
    ]
  }
];

function formatNumber(value: number | null, currency: string) {
  if (value === null) {
    return "Belum aktif";
  }

  if (currency === "PTS") {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 2
    }).format(value);
  }

  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value > 100 ? 2 : 4
  }).format(value);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatSignedRupiah(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${formatRupiah(value)}`;
}

function livePriceForHolding(markets: StockMarket[], holding: OwnerHolding) {
  const yahooSymbol = toYahooIdxSymbol(holding.symbol);
  const market = markets.find((item) => item.symbol === yahooSymbol);

  return market?.price ?? null;
}

function holdingMarketValue(holding: OwnerHolding, livePrice?: number | null) {
  if (holding.shares && livePrice && livePrice > 0) {
    return holding.shares * livePrice;
  }

  return holding.invested + holding.pnl;
}

function holdingPnl(holding: OwnerHolding, livePrice?: number | null) {
  return holdingMarketValue(holding, livePrice) - holding.invested;
}

function holdingPercent(holding: OwnerHolding, livePrice?: number | null) {
  return holding.invested > 0 ? (holdingPnl(holding, livePrice) / holding.invested) * 100 : 0;
}

function portfolioSummary(
  holdings: OwnerHolding[],
  markets: StockMarket[] = []
) {
  const invested = holdings.reduce((sum, holding) => sum + holding.invested, 0);
  const marketValue = holdings.reduce((sum, holding) => {
    const livePrice = livePriceForHolding(markets, holding);

    return sum + holdingMarketValue(holding, livePrice);
  }, 0);
  const pnl = marketValue - invested;
  const percentage = invested > 0 ? (pnl / invested) * 100 : 0;

  return { invested, pnl, marketValue, percentage };
}

function hasLiveHoldingValue(holding: OwnerHolding, markets: StockMarket[]) {
  const livePrice = livePriceForHolding(markets, holding);

  return Boolean(holding.shares && livePrice && livePrice > 0);
}

function toYahooIdxSymbol(symbol: string) {
  return `${symbol}.JK`;
}

function formatVolume(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
}

function formatCompact(value: number | null, currency?: string) {
  if (value === null) {
    return "-";
  }

  const options: Intl.NumberFormatOptions = {
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: value > 100 ? 2 : 4
  };

  if (currency && currency !== "PTS") {
    options.style = "currency";
    options.currency = currency;
  }

  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", options).format(
    value
  );
}

function formatTime(value: string | null) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function getPaddedDomain(values: number[], paddingRatio = 0.08) {
  const safeValues = values.filter((value) => Number.isFinite(value) && value > 0);

  if (safeValues.length === 0) {
    return { min: 0, max: 1 };
  }

  const minValue = Math.min(...safeValues);
  const maxValue = Math.max(...safeValues);
  const fallbackRange = Math.max(Math.abs(maxValue) * 0.01, 1);
  const range = maxValue - minValue || fallbackRange;
  const padding = range * paddingRatio;

  return {
    min: Math.max(0, minValue - padding),
    max: maxValue + padding
  };
}

function yForValue(value: number, min: number, max: number, height: number, top = 0) {
  const range = max - min || 1;

  return top + height - ((value - min) / range) * height;
}

function chartPath(
  values: number[],
  width = 880,
  height = 300,
  min?: number,
  max?: number
) {
  if (values.length < 2) {
    return "";
  }

  const domain = min === undefined || max === undefined
    ? getPaddedDomain(values)
    : { min, max };

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = yForValue(value, domain.min, domain.max, height);

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function linePath(
  values: number[],
  min: number,
  max: number,
  width: number,
  height: number,
  top = 0
) {
  if (values.length < 2) {
    return "";
  }

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = yForValue(value, min, max, height, top);

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function movingAverage(values: number[], period: number) {
  return values.map((_, index) => {
    const start = Math.max(0, index - period + 1);
    const slice = values.slice(start, index + 1);

    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

function StockLogo({
  src,
  alt,
  symbol,
  className = "h-11 w-11"
}: {
  src: string;
  alt: string;
  symbol: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const fallbackLabel = symbol.replace(".JK", "").replace(/^\^/, "").slice(0, 4);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span
      className={`relative grid flex-none place-items-center overflow-hidden rounded-2xl bg-white text-[#050816] ring-1 ring-white/20 ${className}`}
    >
      {failed ? (
        <span className="px-1 text-center text-xs font-black tracking-normal">
          {fallbackLabel}
        </span>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="56px"
          className="object-contain p-2"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function logoForHolding(markets: StockMarket[], holding: OwnerHolding) {
  const yahooSymbol = toYahooIdxSymbol(holding.symbol);
  const market = markets.find((item) => item.symbol === yahooSymbol);

  return market?.imageUrl ?? (holding.symbol === "BMRI" ? "/logos/bmri.svg" : "/idx.png");
}

function OwnerPortfolioPanel({
  portfolio,
  markets,
  activeSymbol,
  onSelect
}: {
  portfolio: OwnerPortfolio;
  markets: StockMarket[];
  activeSymbol: string;
  onSelect: (symbol: string, label: string) => void;
}) {
  const summary = portfolioSummary(portfolio.holdings, markets);
  const isPositive = summary.pnl >= 0;
  const accentClass =
    portfolio.accent === "sky"
      ? "border-sky-300/20 bg-sky-300/10 text-sky-100"
      : "border-rose-300/20 bg-rose-300/10 text-rose-100";

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-purple-200">Portofolio</p>
          <h2 className="mt-2 text-2xl font-semibold">{portfolio.owner}</h2>
        </div>
        <span
          className={`inline-flex h-9 items-center rounded-2xl border px-3 text-xs font-semibold ${accentClass}`}
        >
          {portfolio.holdings.length} emiten
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
          <p className="text-xs font-semibold uppercase text-white/45">Invested</p>
          <p className="mt-2 text-sm font-semibold">{formatRupiah(summary.invested)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
          <p className="text-xs font-semibold uppercase text-white/45">Market value</p>
          <p className="mt-2 text-sm font-semibold">{formatRupiah(summary.marketValue)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
          <p className="text-xs font-semibold uppercase text-white/45">P/L</p>
          <p
            className={`mt-2 text-sm font-semibold ${
              isPositive ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatSignedRupiah(summary.pnl)}
          </p>
          <p
            className={`mt-1 text-xs font-semibold ${
              isPositive ? "text-emerald-300/80" : "text-rose-300/80"
            }`}
          >
            {summary.percentage >= 0 ? "+" : ""}
            {summary.percentage.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid max-h-[520px] gap-3 overflow-y-auto pr-1">
        {portfolio.holdings.map((holding) => {
          const yahooSymbol = toYahooIdxSymbol(holding.symbol);
          const active = activeSymbol === yahooSymbol;
          const livePrice = livePriceForHolding(markets, holding);
          const marketValue = holdingMarketValue(holding, livePrice);
          const pnl = holdingPnl(holding, livePrice);
          const percent = holdingPercent(holding, livePrice);
          const positive = pnl >= 0;
          const liveValue = hasLiveHoldingValue(holding, markets);

          return (
            <button
              key={`${portfolio.owner}-${holding.account ?? "main"}-${holding.symbol}`}
              type="button"
              onClick={() => onSelect(yahooSymbol, holding.label)}
              className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] border p-3 text-left transition ${
                active
                  ? "border-white/20 bg-white text-[#050816] shadow-[0_18px_60px_rgba(255,255,255,0.1)]"
                  : "border-white/10 bg-white/8 text-white hover:-translate-y-0.5 hover:bg-white/12"
              }`}
            >
              <StockLogo
                src={logoForHolding(markets, holding)}
                alt={holding.label}
                symbol={yahooSymbol}
                className="h-10 w-10 rounded-xl"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{holding.symbol}</span>
                  {active ? <Check size={14} /> : null}
                </span>
                <span
                  className={`mt-1 block truncate text-xs ${
                    active ? "text-slate-500" : "text-white/45"
                  }`}
                >
                  {holding.account ?? holding.label}
                </span>
                <span
                  className={`mt-2 block text-xs font-semibold ${
                    active ? "text-slate-600" : "text-white/52"
                  }`}
                >
                  {formatRupiah(holding.invested)}
                  {" -> "}
                  {formatRupiah(marketValue)}
                </span>
                <span
                  className={`mt-1 block text-[11px] font-semibold ${
                    liveValue
                      ? active
                        ? "text-emerald-700"
                        : "text-emerald-200/80"
                      : active
                        ? "text-slate-500"
                        : "text-white/38"
                  }`}
                >
                  {holding.shares
                    ? `${holding.lots ?? holding.shares / 100} lot | Avg ${formatCompact(
                        holding.avgPrice ?? null,
                        "IDR"
                      )} | ${liveValue ? "live" : "snapshot"}`
                    : "snapshot Stockbit"}
                </span>
              </span>
              <span className="text-right">
                <span
                  className={`block text-sm font-semibold ${
                    positive
                      ? active
                        ? "text-emerald-700"
                        : "text-emerald-300"
                      : active
                        ? "text-rose-600"
                        : "text-rose-300"
                  }`}
                >
                  {formatSignedRupiah(pnl)}
                </span>
                <span
                  className={`mt-1 block text-xs font-semibold ${
                    positive
                      ? active
                        ? "text-emerald-700"
                        : "text-emerald-300/80"
                      : active
                        ? "text-rose-600"
                        : "text-rose-300/80"
                  }`}
                >
                  {percent >= 0 ? "+" : ""}
                  {percent.toFixed(2)}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SharedPortfolioPanel({
  markets,
  activeSymbol,
  onSelect
}: {
  markets: StockMarket[];
  activeSymbol: string;
  onSelect: (symbol: string, label: string) => void;
}) {
  const [aryoPortfolio, fiaPortfolio] = ownerPortfolios;
  const sharedSymbols = Array.from(
    new Set(
      aryoPortfolio.holdings
        .map((holding) => holding.symbol)
        .filter((symbol) =>
          fiaPortfolio.holdings.some((holding) => holding.symbol === symbol)
        )
    )
  );
  const sharedRows = sharedSymbols.map((symbol) => {
    const aryoEntries = aryoPortfolio.holdings.filter((holding) => holding.symbol === symbol);
    const fiaEntries = fiaPortfolio.holdings.filter((holding) => holding.symbol === symbol);
    const allEntries = [...aryoEntries, ...fiaEntries];
    const invested = allEntries.reduce((sum, holding) => sum + holding.invested, 0);
    const marketValue = allEntries.reduce((sum, holding) => {
      const livePrice = livePriceForHolding(markets, holding);

      return sum + holdingMarketValue(holding, livePrice);
    }, 0);
    const pnl = marketValue - invested;

    return {
      symbol,
      label: allEntries[0]?.label ?? symbol,
      aryoInvested: aryoEntries.reduce((sum, holding) => sum + holding.invested, 0),
      fiaInvested: fiaEntries.reduce((sum, holding) => sum + holding.invested, 0),
      invested,
      marketValue,
      pnl,
      liveEntries: allEntries.filter((holding) => hasLiveHoldingValue(holding, markets)).length,
      totalEntries: allEntries.length
    };
  });
  const sharedSummaryHoldings = sharedSymbols.flatMap((symbol) => {
    return [
      ...aryoPortfolio.holdings.filter((holding) => holding.symbol === symbol),
      ...fiaPortfolio.holdings.filter((holding) => holding.symbol === symbol)
    ];
  });
  const summary = portfolioSummary(sharedSummaryHoldings, markets);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-purple-200">Dimiliki berdua</p>
          <h2 className="mt-2 text-2xl font-semibold">BMRI dan PADI</h2>
        </div>
        <div className="grid gap-2 text-sm font-semibold sm:grid-cols-3 lg:min-w-[560px]">
          <span className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
            Invested {formatRupiah(summary.invested)}
          </span>
          <span className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
            Value {formatRupiah(summary.marketValue)}
          </span>
          <span className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-rose-200">
            P/L {formatSignedRupiah(summary.pnl)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {sharedRows.map((holding) => {
          const yahooSymbol = toYahooIdxSymbol(holding.symbol);
          const active = activeSymbol === yahooSymbol;

          return (
            <button
              key={`shared-${holding.symbol}`}
              type="button"
              onClick={() => onSelect(yahooSymbol, holding.label)}
              className={`grid grid-cols-[auto_1fr] gap-4 rounded-[20px] border p-4 text-left transition ${
                active
                  ? "border-white/20 bg-white text-[#050816]"
                  : "border-white/10 bg-white/8 text-white hover:-translate-y-0.5 hover:bg-white/12"
              }`}
            >
              <StockLogo
                src={logoForHolding(markets, holding)}
                alt={holding.label}
                symbol={yahooSymbol}
              />
              <span className="min-w-0">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold">{holding.symbol}</span>
                  <span
                    className={`text-sm font-semibold ${
                      active ? "text-rose-600" : "text-rose-300"
                    }`}
                  >
                    {formatSignedRupiah(holding.pnl)}
                  </span>
                </span>
                <span
                  className={`mt-1 block truncate text-xs ${
                    active ? "text-slate-500" : "text-white/45"
                  }`}
                >
                  {holding.label}
                </span>
                <span className="mt-4 grid gap-2 text-xs font-semibold sm:grid-cols-2">
                  <span
                    className={`rounded-xl px-3 py-2 ${
                      active ? "bg-slate-100 text-slate-600" : "bg-white/8 text-white/58"
                    }`}
                  >
                    Aryo {formatRupiah(holding.aryoInvested)}
                  </span>
                  <span
                    className={`rounded-xl px-3 py-2 ${
                      active ? "bg-slate-100 text-slate-600" : "bg-white/8 text-white/58"
                    }`}
                  >
                    Fia {formatRupiah(holding.fiaInvested)}
                  </span>
                </span>
                <span
                  className={`mt-2 block text-xs font-semibold ${
                    active ? "text-slate-500" : "text-white/42"
                  }`}
                >
                  {holding.liveEntries}/{holding.totalEntries} posisi pakai harga live
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YahooStockChart({
  symbol,
  label,
  price,
  changePercent,
  currency,
  values,
  points,
  stats,
  markets,
  timeframe,
  onTimeframeChange
}: {
  symbol: string;
  label: string;
  price: number | null;
  changePercent: number;
  currency: string;
  values: number[];
  points: StockChartPoint[];
  stats?: StockStats;
  markets: StockMarket[];
  timeframe: Timeframe;
  onTimeframeChange: (value: Timeframe) => void;
}) {
  const chartValues = (points.length > 0 ? points.map((point) => point.close) : values)
    .filter((value) => Number.isFinite(value) && value > 0);
  const positive = changePercent >= 0;
  const stroke = positive ? "#00A884" : "#EF4444";
  const fill = positive ? "#0A5C4A" : "#7F1D1D";
  const volumes = points.map((point) => point.volume);
  const maxVolume = Math.max(...volumes, 1);
  const previousClose = stats?.previousClose ?? null;
  const chartWidth = 880;
  const priceHeight = 260;
  const domainValues = previousClose && previousClose > 0
    ? [...chartValues, previousClose]
    : chartValues;
  const domain = getPaddedDomain(domainValues, 0.12);
  const path = chartPath(chartValues, chartWidth, priceHeight, domain.min, domain.max);
  const previousCloseY =
    previousClose && previousClose > 0
      ? yForValue(previousClose, domain.min, domain.max, priceHeight)
      : null;
  const statItems = [
    ["Previous Close", formatCompact(previousClose, currency)],
    ["Open", formatCompact(stats?.open ?? null, currency)],
    ["Volume", formatCompact(stats?.volume ?? null)],
    [
      "Day's Range",
      stats?.dayLow && stats.dayHigh
        ? `${formatCompact(stats.dayLow, currency)} - ${formatCompact(stats.dayHigh, currency)}`
        : "-"
    ],
    [
      "52 Week Range",
      stats?.fiftyTwoWeekLow && stats.fiftyTwoWeekHigh
        ? `${formatCompact(stats.fiftyTwoWeekLow, currency)} - ${formatCompact(
            stats.fiftyTwoWeekHigh,
            currency
          )}`
        : "-"
    ],
    ["Avg. Volume", formatCompact(stats?.averageVolume ?? null)]
  ];

  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-700 bg-[#101418] text-slate-100 shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
      <div className="border-b border-slate-700 px-4 py-3">
        <p className="text-xs font-semibold text-slate-400">{label} - Delayed Quote</p>
        <div className="mt-1 flex flex-wrap items-end gap-3">
          <h3 className="text-xl font-semibold">{symbol}</h3>
          <span className="text-3xl font-semibold leading-none">
            {formatNumber(price, currency)}
          </span>
          <span
            className={`text-base font-semibold ${
              positive ? "text-[#00E0A4]" : "text-rose-400"
            }`}
          >
            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 px-4 py-3 text-xs font-semibold">
        {timeframeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={timeframe === option.value}
            onClick={() => onTimeframeChange(option.value)}
            className={`h-8 rounded-md px-3 text-xs font-semibold transition ${
              timeframe === option.value
                ? "bg-[#00A884] text-[#07130F]"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
        <span className="ml-auto rounded-full border border-slate-600 px-3 py-1 text-slate-300">
          Yahoo Finance style
        </span>
      </div>
      <svg
        viewBox="0 0 880 320"
        role="img"
        aria-label="Yahoo Finance style stock chart"
        className="h-[300px] w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="yahooChartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.55" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <g opacity="0.18">
          {Array.from({ length: 6 }, (_, index) => (
            <line
              key={`h-${index}`}
              x1="0"
              x2="880"
              y1={index * 52}
              y2={index * 52}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 7 }, (_, index) => (
            <line
              key={`v-${index}`}
              x1={index * 146.66}
              x2={index * 146.66}
              y1="0"
              y2="260"
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          ))}
        </g>
        {previousCloseY !== null ? (
          <line
            x1="0"
            x2="880"
            y1={previousCloseY}
            y2={previousCloseY}
            stroke="#94A3B8"
            strokeDasharray="4 4"
            strokeOpacity="0.55"
          />
        ) : null}
        {path ? (
          <>
            <path d={`${path} L 880 260 L 0 260 Z`} fill="url(#yahooChartFill)" />
            <path
              d={path}
              fill="none"
              stroke={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
            <text
              x="864"
              y={Math.max(16, yForValue(chartValues.at(-1) ?? 0, domain.min, domain.max, priceHeight) - 8)}
              textAnchor="end"
              className="fill-slate-100 text-xs font-semibold"
            >
              {formatCompact(chartValues.at(-1) ?? null, currency)}
            </text>
          </>
        ) : (
          <text x="440" y="140" textAnchor="middle" className="fill-slate-400 text-sm">
            Chart belum tersedia
          </text>
        )}
        <g transform="translate(0 270)">
          {points.slice(-80).map((point, index, source) => {
            const barWidth = 880 / Math.max(source.length, 1);
            const height = Math.max(2, (point.volume / maxVolume) * 46);

            return (
              <rect
                key={`${point.time}-${index}`}
                x={index * barWidth}
                y={48 - height}
                width={Math.max(1, barWidth - 1)}
                height={height}
                fill={point.close >= (point.open ?? point.close) ? "#00A884" : "#EF4444"}
                opacity="0.55"
              />
            );
          })}
        </g>
      </svg>
      <div className="grid gap-px border-y border-slate-700 bg-slate-700 text-xs sm:grid-cols-3">
        {statItems.map(([name, value]) => (
          <div key={name} className="flex justify-between gap-3 bg-[#101418] px-4 py-2">
            <span className="text-slate-400">{name}</span>
            <span className="font-semibold text-slate-100">{value}</span>
          </div>
        ))}
      </div>
      <div className="p-4">
        <h4 className="text-base font-semibold">Market Heatmap</h4>
        <div className="mt-3 grid h-56 grid-cols-4 gap-1 sm:grid-cols-6">
          {markets.slice(0, 18).map((market, index) => {
            const change = market.changePercent ?? 0;
            const hot = Math.min(1, Math.abs(change) / 3);
            const background =
              change >= 0
                ? `rgba(0, ${Math.round(105 + hot * 70)}, 132, ${0.72 + hot * 0.22})`
                : `rgba(${Math.round(145 + hot * 80)}, 35, 48, ${0.72 + hot * 0.22})`;

            return (
              <button
                key={market.symbol}
                type="button"
                className={`min-w-0 border border-slate-200/40 p-2 text-center ${
                  index < 3 ? "col-span-2 row-span-2" : ""
                }`}
                style={{ background }}
                title={market.label}
              >
                <span className="block truncate text-sm font-semibold">
                  {market.symbol.replace(".JK", "")}
                </span>
                <span className="mt-1 block text-xs font-semibold">
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BinanceCryptoChart({
  symbol,
  price,
  changePercent,
  candles,
  values,
  timeframe,
  onTimeframeChange
}: {
  symbol: string;
  price: number | null;
  changePercent: number;
  candles: CryptoCandle[];
  values: number[];
  timeframe: Timeframe;
  onTimeframeChange: (value: Timeframe) => void;
}) {
  const displayCandles =
    candles.length > 0
      ? candles.slice(-90)
      : values.slice(-90).map((value, index) => ({
          openTime: index,
          open: value,
          high: value,
          low: value,
          close: value,
          volume: 0
        }));
  const prices = displayCandles.flatMap((candle) => [candle.high, candle.low]);
  const { min, max } = getPaddedDomain(prices, 0.12);
  const chartWidth = 900;
  const priceHeight = 300;
  const latest = displayCandles[displayCandles.length - 1] ?? null;
  const previous = displayCandles[displayCandles.length - 2] ?? null;
  const candleStep = chartWidth / Math.max(displayCandles.length, 1);
  const candleWidth = Math.max(2, Math.min(8, candleStep * 0.58));
  const closes = displayCandles.map((candle) => candle.close);
  const ma7 = linePath(movingAverage(closes, 7), min, max, chartWidth, priceHeight);
  const ma25 = linePath(movingAverage(closes, 25), min, max, chartWidth, priceHeight);
  const ma99 = linePath(movingAverage(closes, 99), min, max, chartWidth, priceHeight);
  const maxVolume = Math.max(...displayCandles.map((candle) => candle.volume), 1);
  const yForPrice = (value: number) => yForValue(value, min, max, priceHeight);
  const open = latest?.open ?? price ?? 0;
  const high = latest?.high ?? price ?? 0;
  const low = latest?.low ?? price ?? 0;
  const close = latest?.close ?? price ?? 0;
  const rangePercent = low > 0 ? ((high - low) / low) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#2B3139] bg-[#161A22] text-[#EAECEF] shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center gap-7 border-b border-[#2B3139] px-4 py-3 text-base font-semibold">
        <span className="border-b-2 border-[#F0B90B] pb-3 text-white">Grafik</span>
        <span className="pb-3 text-[#848E9C]">Info</span>
        <span className="pb-3 text-[#848E9C]">Data Perdagangan</span>
        <span className="pb-3 text-[#848E9C]">Square</span>
        <span className="ml-auto text-sm text-[#848E9C]">Asli</span>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-b border-[#2B3139] px-4 py-3 text-sm font-semibold text-[#848E9C]">
        <span>Waktu</span>
        {timeframeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={timeframe === option.value}
            onClick={() => onTimeframeChange(option.value)}
            className={`h-8 rounded-md px-2.5 transition ${
              timeframe === option.value
                ? "bg-[#F0B90B] text-[#181A20]"
                : "text-[#848E9C] hover:bg-[#2B3139] hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-3 text-sm text-[#848E9C]">
        <span>{symbol}</span>
        <span>
          Buka <b className="text-[#F6465D]">{formatCompact(open)}</b>
        </span>
        <span>
          Tinggi <b className="text-[#F6465D]">{formatCompact(high)}</b>
        </span>
        <span>
          Rendah <b className="text-[#F6465D]">{formatCompact(low)}</b>
        </span>
        <span>
          Tutup <b className="text-[#F6465D]">{formatCompact(close)}</b>
        </span>
        <span>
          PERUBAHAN{" "}
          <b className={changePercent >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}>
            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%
          </b>
        </span>
        <span>
          Rentang <b className="text-[#F6465D]">{rangePercent.toFixed(2)}%</b>
        </span>
      </div>
      <div className="px-4 pb-2 text-sm text-[#848E9C]">
        <span className="mr-4">
          MA(7) <b className="text-[#F0B90B]">{formatCompact(closes.at(-1) ?? null)}</b>
        </span>
        <span className="mr-4">
          MA(25) <b className="text-[#EB40A7]">{formatCompact(movingAverage(closes, 25).at(-1) ?? null)}</b>
        </span>
        <span>
          MA(99) <b className="text-[#B58AF9]">{formatCompact(movingAverage(closes, 99).at(-1) ?? null)}</b>
        </span>
      </div>
      <svg
        viewBox="0 0 900 460"
        role="img"
        aria-label="Binance style crypto candlestick chart"
        className="h-[440px] w-full"
        preserveAspectRatio="none"
      >
        <g opacity="0.55">
          {Array.from({ length: 5 }, (_, index) => (
            <line
              key={`binance-h-${index}`}
              x1="0"
              x2="900"
              y1={index * 75}
              y2={index * 75}
              stroke="#2B3139"
            />
          ))}
          {Array.from({ length: 5 }, (_, index) => (
            <line
              key={`binance-v-${index}`}
              x1={index * 225}
              x2={index * 225}
              y1="0"
              y2="430"
              stroke="#2B3139"
            />
          ))}
        </g>
        <text x="450" y="178" textAnchor="middle" className="fill-white/5 text-6xl font-bold">
          BINANCE
        </text>
        {displayCandles.map((candle, index) => {
          const x = index * candleStep + candleStep / 2;
          const openY = yForPrice(candle.open);
          const closeY = yForPrice(candle.close);
          const highY = yForPrice(candle.high);
          const lowY = yForPrice(candle.low);
          const isUp = candle.close >= candle.open;
          const color = isUp ? "#0ECB81" : "#F6465D";
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(2, Math.abs(closeY - openY));
          const volumeHeight = Math.max(2, (candle.volume / maxVolume) * 90);

          return (
            <g key={`${candle.openTime}-${index}`}>
              <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth="1.4" />
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={color}
              />
              <rect
                x={x - candleWidth / 2}
                y={430 - volumeHeight}
                width={candleWidth}
                height={volumeHeight}
                fill={color}
                opacity="0.9"
              />
            </g>
          );
        })}
        <path d={ma7} fill="none" stroke="#F0B90B" strokeWidth="2" />
        <path d={ma25} fill="none" stroke="#EB40A7" strokeWidth="1.8" />
        <path d={ma99} fill="none" stroke="#B58AF9" strokeWidth="1.8" />
        {latest ? (
          <>
            <line
              x1="0"
              x2="900"
              y1={yForPrice(latest.close)}
              y2={yForPrice(latest.close)}
              stroke={latest.close >= (previous?.close ?? latest.open) ? "#0ECB81" : "#F6465D"}
              strokeDasharray="4 4"
              opacity="0.55"
            />
            <text
              x="875"
              y={Math.max(18, yForPrice(latest.close) - 8)}
              textAnchor="end"
              className="fill-white text-sm font-semibold"
            >
              {formatCompact(latest.close)}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
}

export function PortfolioTerminal() {
  const [mode, setMode] = useState<Mode>("stocks");
  const [stockExchange, setStockExchange] = useState<StockExchange>("idx");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [cryptoPriority, setCryptoPriority] = useState("BTCUSDT");
  const [stockPriority, setStockPriority] = useState("BMRI.JK");
  const [selectedStockLabel, setSelectedStockLabel] = useState("Bank Mandiri");
  const [cryptoData, setCryptoData] = useState<CryptoResponse | null>(null);
  const [stocksData, setStocksData] = useState<StocksResponse | null>(null);
  const [stockSearchResults, setStockSearchResults] = useState<StockSearchResult[]>(
    []
  );
  const [stockSearchStatus, setStockSearchStatus] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Memuat portfolio market...");

  useEffect(() => {
    const savedCrypto = window.localStorage.getItem(cryptoPriorityKey);
    const savedStock = window.localStorage.getItem(stockPriorityKey);
    const savedStockLabel = window.localStorage.getItem(stockLabelKey);
    const savedExchange = window.localStorage.getItem(stockExchangeKey);
    const savedStockExchange =
      savedExchange === "idx" || savedExchange === "us" ? savedExchange : "idx";
    const shouldMigrateOldIdxDefault =
      savedStockExchange === "idx" && savedStock === "^JKSE";

    if (savedCrypto) {
      setCryptoPriority(savedCrypto);
    }

    if (savedStock && !shouldMigrateOldIdxDefault) {
      setStockPriority(savedStock);
    } else {
      setStockPriority(savedStockExchange === "idx" ? "BMRI.JK" : "^GSPC");
    }

    if (savedStockLabel && !shouldMigrateOldIdxDefault) {
      setSelectedStockLabel(savedStockLabel);
    } else {
      setSelectedStockLabel(savedStockExchange === "idx" ? "Bank Mandiri" : "S&P 500");
    }

    if (savedExchange === "idx" || savedExchange === "us") {
      setStockExchange(savedExchange);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(cryptoPriorityKey, cryptoPriority);
  }, [cryptoPriority]);

  useEffect(() => {
    window.localStorage.setItem(stockPriorityKey, stockPriority);
  }, [stockPriority]);

  useEffect(() => {
    window.localStorage.setItem(stockLabelKey, selectedStockLabel);
  }, [selectedStockLabel]);

  useEffect(() => {
    window.localStorage.setItem(stockExchangeKey, stockExchange);
  }, [stockExchange]);

  useEffect(() => {
    let isMounted = true;

    async function loadCrypto() {
      try {
        const response = await fetch(
          `/api/portfolio/crypto?priority=${encodeURIComponent(
            cryptoPriority
          )}&timeframe=${timeframe}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as CryptoResponse;

        if (!isMounted) {
          return;
        }

        setCryptoData(data);
        setStatus(`Realtime sync tiap 5 detik - ${timeframe.toUpperCase()}`);
      } catch {
        if (isMounted) {
          setStatus("Crypto market gagal dimuat");
        }
      }
    }

    loadCrypto();
    const intervalId = window.setInterval(loadCrypto, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [cryptoPriority, timeframe]);

  useEffect(() => {
    let isMounted = true;

    async function loadStocks() {
      try {
        const response = await fetch(
          `/api/portfolio/stocks?exchange=${stockExchange}&priority=${encodeURIComponent(
            stockPriority
          )}&timeframe=${timeframe}&label=${encodeURIComponent(selectedStockLabel)}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as StocksResponse;

        if (!isMounted) {
          return;
        }

        setStocksData(data);
        setStatus(`Realtime sync tiap 5 detik - ${timeframe.toUpperCase()}`);
      } catch {
        if (isMounted) {
          setStatus("Stock market gagal dimuat");
        }
      }
    }

    loadStocks();
    const intervalId = window.setInterval(loadStocks, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [stockExchange, stockPriority, selectedStockLabel, timeframe]);

  useEffect(() => {
    if (mode !== "stocks") {
      return;
    }

    const cleanQuery = query.trim();

    if (cleanQuery.length < 2) {
      setStockSearchResults([]);
      setStockSearchStatus("");
      return;
    }

    let isMounted = true;
    setStockSearchStatus("Mencari saham...");

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/portfolio/stocks/search?exchange=${stockExchange}&q=${encodeURIComponent(
            cleanQuery
          )}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as {
          results: StockSearchResult[];
          status: "idle" | "live" | "error";
          message?: string;
        };

        if (!isMounted) {
          return;
        }

        setStockSearchResults(data.results ?? []);
        setStockSearchStatus(
          data.status === "live"
            ? `${data.results?.length ?? 0} saham ditemukan`
            : data.message ?? "Saham tidak ditemukan"
        );
      } catch {
        if (isMounted) {
          setStockSearchResults([]);
          setStockSearchStatus("Pencarian saham gagal");
        }
      }
    }, 350);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [mode, query, stockExchange]);

  const cryptoAssets = useMemo(() => cryptoData?.assets ?? [], [cryptoData]);
  const stockMarkets = useMemo(() => stocksData?.markets ?? [], [stocksData]);

  const filteredCrypto = useMemo(
    () =>
      cryptoAssets.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
          asset.label.toLowerCase().includes(query.toLowerCase())
      ),
    [cryptoAssets, query]
  );

  const filteredStocks = useMemo(
    () =>
      stockMarkets.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
          asset.label.toLowerCase().includes(query.toLowerCase())
      ),
    [stockMarkets, query]
  );

  const activeCrypto = cryptoData?.priority;
  const activeStock = stocksData?.priority;
  const activeSymbol =
    mode === "crypto" ? activeCrypto?.symbol ?? "Memuat..." : activeStock?.symbol ?? "Memuat...";
  const activeLabel =
    mode === "crypto"
      ? activeCrypto?.label ?? "Digital asset"
      : activeStock?.label ?? stocksData?.exchangeLabel ?? "Stock market";
  const activePrice =
    mode === "crypto"
      ? formatNumber(activeCrypto?.price ?? null, "USD")
      : formatNumber(activeStock?.price ?? null, activeStock?.currency ?? "USD");
  const activePriceValue =
    mode === "crypto" ? activeCrypto?.price ?? null : activeStock?.price ?? null;
  const activeCurrency = mode === "crypto" ? "USD" : activeStock?.currency ?? "USD";
  const activeImage =
    mode === "crypto"
      ? activeCrypto?.imageUrl ?? "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
      : activeStock?.imageUrl ?? stocksData?.exchangeImage ?? "/idx.png";
  const activeChange =
    mode === "crypto"
      ? activeCrypto?.changePercent ?? 0
      : activeStock?.changePercent ?? 0;
  const activeChart = mode === "crypto" ? cryptoData?.chart ?? [] : stocksData?.chart ?? [];
  const activeCryptoCandles = cryptoData?.candles ?? [];
  const activeStockPoints = stocksData?.chartPoints ?? activeStock?.chartPoints ?? [];
  const activeStockStats = activeStock?.stats;
  const activeUpdatedAt =
    mode === "crypto" ? cryptoData?.updatedAt ?? null : stocksData?.updatedAt ?? null;
  const topMarkets = mode === "crypto" ? cryptoAssets.slice(0, 5) : stockMarkets.slice(0, 5);
  const hasStockSearch = mode === "stocks" && query.trim().length >= 2;
  const displayedStocks = hasStockSearch ? stockSearchResults : filteredStocks;

  function changeExchange(nextExchange: StockExchange) {
    setStockExchange(nextExchange);
    setStockPriority(nextExchange === "idx" ? "BMRI.JK" : "^GSPC");
    setSelectedStockLabel(nextExchange === "idx" ? "Bank Mandiri" : "S&P 500");
    setStockSearchResults([]);
    setStockSearchStatus("");
    setQuery("");
  }

  function selectStock(symbol: string, label: string) {
    setStockPriority(symbol);
    setSelectedStockLabel(label);
    setQuery("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 portfolio-aurora" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[460px] w-[460px] rounded-full bg-sky-500/15 blur-[120px]" />

      <div className="relative w-full border-b border-white/10 bg-[#050816]/70 backdrop-blur-2xl">
        <header className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              aria-label="Kembali ke dashboard"
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <p className="text-sm font-semibold text-purple-200">
                A&Z Portfolio Pulse
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                Premium market dashboard
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {modeOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${
                  mode === value
                    ? "bg-white text-[#050816] shadow-[0_20px_60px_rgba(255,255,255,0.18)]"
                    : "border border-white/10 bg-white/8 text-white/72 hover:-translate-y-0.5 hover:bg-white/12"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
            <div className="flex rounded-2xl border border-white/10 bg-white/8 p-1">
              {timeframeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeframe(option.value)}
                  className={`h-9 rounded-xl px-3 text-xs font-semibold transition ${
                    timeframe === option.value
                      ? "bg-white text-[#050816]"
                      : "text-white/58 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </header>
      </div>

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 py-6 lg:px-10 lg:py-8">
        <section className="grid min-h-[560px] gap-6 rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
          <div className="flex flex-col justify-between gap-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-white/78">
                <Sparkles size={14} />
                TradingView meets Apple meets Linear
              </p>
              <h2 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
                Market clarity for every decision.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/62 sm:text-lg">
                Pantau crypto dan saham dengan chart besar, prioritas aset,
                sinyal harga, dan pengalaman dark luxury yang fokus.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setMode("crypto")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-[#050816] shadow-[0_24px_80px_rgba(255,255,255,0.16)] transition hover:-translate-y-0.5"
                >
                  Explore crypto
                  <ArrowUpRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setMode("stocks")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/14"
                >
                  View stocks
                  <BarChart3 size={16} />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/45">Asset</p>
                <p className="mt-2 truncate text-lg font-semibold">{activeSymbol}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/45">Price</p>
                <p className="mt-2 truncate text-lg font-semibold">{activePrice}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/45">Change</p>
                <p
                  className={`mt-2 flex items-center gap-1 text-lg font-semibold ${
                    activeChange < 0 ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {activeChange < 0 ? (
                    <TrendingDown size={18} />
                  ) : (
                    <TrendingUp size={18} />
                  )}
                  {activeChange >= 0 ? "+" : ""}
                  {activeChange.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="relative grid content-between gap-5">
            <div className="absolute -right-3 -top-3 z-10 hidden rounded-[22px] border border-white/10 bg-white/10 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:block">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                  <ShieldCheck size={19} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-white/50">Sync status</p>
                  <p className="mt-1 text-sm font-semibold">{status}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-[#060A1D]/70 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-200">
                    <BarChart3 size={18} />
                    {mode === "crypto"
                      ? "Crypto exchange"
                      : stocksData?.exchangeLabel ?? "Stock exchange"}
                  </div>
                  <div className="mt-3 flex min-w-0 items-center gap-3">
                    <StockLogo
                      src={activeImage}
                      alt={activeLabel}
                      symbol={activeSymbol}
                      className="h-14 w-14"
                    />
                    <span className="min-w-0">
                      <h3 className="truncate text-4xl font-semibold tracking-normal">
                        {activeSymbol}
                      </h3>
                      <p className="mt-2 max-w-xl truncate text-sm text-white/54">
                        {activeLabel}
                      </p>
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-right">
                  <p className="text-xs font-semibold text-white/45">Last update</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatTime(activeUpdatedAt)}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                {mode === "crypto" ? (
                  <BinanceCryptoChart
                    symbol={activeSymbol}
                    price={activePriceValue}
                    changePercent={activeChange}
                    candles={activeCryptoCandles}
                    values={activeChart}
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                  />
                ) : (
                  <YahooStockChart
                    symbol={activeSymbol}
                    label={activeLabel}
                    price={activePriceValue}
                    changePercent={activeChange}
                    currency={activeCurrency}
                    values={activeChart}
                    points={activeStockPoints}
                    stats={activeStockStats}
                    markets={stockMarkets}
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {mode === "stocks" ? (
          <section className="grid gap-6">
            <SharedPortfolioPanel
              markets={stockMarkets}
              activeSymbol={stockPriority}
              onSelect={selectStock}
            />
            <div className="grid gap-6 xl:grid-cols-2">
              {ownerPortfolios.map((portfolio) => (
                <OwnerPortfolioPanel
                  key={portfolio.owner}
                  portfolio={portfolio}
                  markets={stockMarkets}
                  activeSymbol={stockPriority}
                  onSelect={selectStock}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-purple-200">Priority market</p>
                <h2 className="mt-2 text-2xl font-semibold">Watchlist focus</h2>
              </div>
              {mode === "stocks" ? (
                <div className="flex rounded-2xl border border-white/10 bg-white/8 p-1">
                  {[
                    ["idx", "IDX"],
                    ["us", "US"]
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => changeExchange(value as StockExchange)}
                      className={`h-9 rounded-xl px-4 text-xs font-semibold transition ${
                        stockExchange === value
                          ? "bg-white text-[#050816]"
                          : "text-white/58 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3">
              {topMarkets.map((asset) => {
                const active =
                  mode === "crypto"
                    ? cryptoPriority === asset.symbol
                    : stockPriority === asset.symbol;
                const change =
                  "changePercent" in asset ? asset.changePercent ?? 0 : 0;

                return (
                  <button
                    key={asset.symbol}
                    type="button"
                    onClick={() =>
                      mode === "crypto"
                        ? setCryptoPriority(asset.symbol)
                        : selectStock(asset.symbol, asset.label)
                    }
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[20px] border p-4 text-left transition ${
                      active
                        ? "border-white/20 bg-white text-[#050816] shadow-[0_24px_80px_rgba(255,255,255,0.12)]"
                        : "border-white/10 bg-white/8 text-white hover:-translate-y-0.5 hover:bg-white/12"
                    }`}
                  >
                    <StockLogo
                      src={asset.imageUrl}
                      alt={asset.label}
                      symbol={asset.symbol}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {asset.symbol}
                        </span>
                        {active ? <Check size={15} /> : null}
                      </span>
                      <span
                        className={`mt-1 block truncate text-xs ${
                          active ? "text-slate-500" : "text-white/45"
                        }`}
                      >
                        {asset.label}
                      </span>
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        change < 0
                          ? active
                            ? "text-rose-600"
                            : "text-rose-300"
                          : active
                            ? "text-emerald-700"
                            : "text-emerald-300"
                      }`}
                    >
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-200">
                  {mode === "crypto" ? "Crypto universe" : "Equity markets"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Market board</h2>
              </div>
              <label className="relative block md:w-80">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  spellCheck={false}
                  autoCapitalize="characters"
                  placeholder={
                    mode === "stocks"
                      ? stockExchange === "idx"
                        ? "Cari saham IDX: BBNI, ADRO..."
                        : "Cari saham US: AAPL, JPM..."
                      : "Cari crypto"
                  }
                  className="h-12 w-full rounded-2xl border border-white/15 bg-[#0B1020] pl-11 pr-4 text-sm font-semibold text-slate-50 caret-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-emerald-300/70 focus:bg-[#0E1628] focus:ring-4 focus:ring-emerald-400/10"
                />
              </label>
            </div>
            {mode === "stocks" ? (
              <p className="mt-3 text-xs font-semibold text-white/45">
                {query.trim()
                  ? `Ketik: "${query.trim()}"${stockSearchStatus ? ` - ${stockSearchStatus}` : ""}`
                  : stockSearchStatus ||
                    `Mode ${stockExchange === "idx" ? "IDX Indonesia" : "US market"}`}
              </p>
            ) : null}

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {mode === "crypto"
                ? filteredCrypto.map((asset) => (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => setCryptoPriority(asset.symbol)}
                      className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[20px] border border-white/10 bg-white/8 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/12"
                    >
                      <StockLogo
                        src={asset.imageUrl}
                        alt={asset.label}
                        symbol={asset.symbol}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {asset.symbol}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              asset.changePercent < 0
                                ? "text-rose-300"
                                : "text-emerald-300"
                            }`}
                          >
                            {asset.changePercent >= 0 ? "+" : ""}
                            {asset.changePercent.toFixed(2)}%
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-white/45">
                          {formatNumber(asset.price, "USD")} | Vol{" "}
                          {formatVolume(asset.volume)}
                        </span>
                      </span>
                    </button>
                  ))
                : displayedStocks.map((asset) => {
                    const changePercent =
                      "changePercent" in asset ? asset.changePercent ?? 0 : null;
                    const price = "price" in asset ? asset.price : null;

                    return (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => selectStock(asset.symbol, asset.label)}
                      className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[20px] border border-white/10 bg-white/8 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/12"
                    >
                      <StockLogo
                        src={asset.imageUrl}
                        alt={asset.label}
                        symbol={asset.symbol}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {asset.symbol}
                            </span>
                            <span className="mt-1 block truncate text-xs text-white/45">
                              {asset.label}
                            </span>
                          </span>
                          {changePercent === null ? (
                            <span className="text-xs font-semibold text-purple-200">
                              {"exchangeLabel" in asset ? asset.exchangeLabel : asset.source}
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-semibold ${
                                changePercent < 0
                                  ? "text-rose-300"
                                  : "text-emerald-300"
                              }`}
                            >
                              {changePercent >= 0 ? "+" : ""}
                              {changePercent.toFixed(2)}%
                            </span>
                          )}
                        </span>
                        <span className="mt-3 block text-sm font-semibold">
                          {price === null && hasStockSearch
                            ? "Klik untuk buka chart"
                            : formatNumber(price, asset.currency)}
                        </span>
                      </span>
                    </button>
                    );
                  })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-2xl">
            <RefreshCw className="text-sky-300" size={22} />
            <h3 className="mt-5 text-lg font-semibold">Realtime cadence</h3>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Data polling tetap sinkron setiap 5 detik dengan status ringkas.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-2xl">
            <Star className="text-purple-300" size={22} />
            <h3 className="mt-5 text-lg font-semibold">Priority-first</h3>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Asset pilihan disimpan otomatis dan selalu muncul sebagai fokus utama.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-2xl">
            <ShieldCheck className="text-emerald-300" size={22} />
            <h3 className="mt-5 text-lg font-semibold">Clean signal</h3>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Layout mengurangi kartu kecil dan memberi ruang untuk chart besar.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
